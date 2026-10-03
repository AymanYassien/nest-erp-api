import { Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  InsufficientStockError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import { mapPaginated, Paginated } from '../../../common/pagination/paginated';
import {
  TransactionContext,
  UnitOfWork,
} from '../../../common/persistence/unit-of-work';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { Role } from '../../../common/types/role.enum';
import { Product } from '../../inventory/domain/product.entity';
import { ProductsRepository } from '../../inventory/domain/products.repository';
import { StockMovementType } from '../../inventory/domain/stock-movement.entity';
import { StockMovementsRepository } from '../../inventory/domain/stock-movements.repository';
import { Order, priceOrderLines } from '../domain/order.entity';
import { assertTransition, OrderStatus } from '../domain/order-status';
import { OrdersRepository } from '../domain/orders.repository';
import {
  CreateOrderDto,
  CreateOrderItemDto,
  ListOrdersQueryDto,
  OrderResponseDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly products: ProductsRepository,
    private readonly movements: StockMovementsRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /**
   * Creates the order and reserves stock atomically. If any line cannot be
   * fulfilled the transaction rolls back, undoing the order row and every
   * stock decrement already applied.
   */
  async create(
    dto: CreateOrderDto,
    actor: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    assertUniqueProducts(dto.items);

    const order = await this.unitOfWork.run(async (tx) => {
      const productsById = await this.loadProducts(dto.items, tx);
      const { items, totalAmount } = priceOrderLines(
        dto.items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: productsById.get(line.productId)!.price,
        })),
      );

      const created = await this.orders.create(
        {
          userId: actor.id,
          status: OrderStatus.Pending,
          totalAmount,
          notes: dto.notes ?? null,
          items,
        },
        tx,
      );

      for (const line of byProductId(dto.items)) {
        const applied = await this.applyStockChange(tx, {
          productId: line.productId,
          delta: -line.quantity,
          type: StockMovementType.Out,
          reason: 'Order placed',
          orderId: created.id,
          actorId: actor.id,
        });
        if (!applied) {
          const { sku } = productsById.get(line.productId)!;
          throw new InsufficientStockError(sku, line.quantity);
        }
      }
      return created;
    });

    return OrderResponseDto.fromEntity(order);
  }

  async list(
    query: ListOrdersQueryDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<OrderResponseDto>> {
    const { page, limit, sortBy, sortOrder, status, createdFrom, createdTo } =
      query;
    const userId = isBackOffice(actor) ? query.userId : actor.id;

    const result = await this.orders.list(
      { userId, status, createdFrom, createdTo },
      { page, limit, sortBy, sortOrder },
    );
    return mapPaginated(result, (o) => OrderResponseDto.fromEntity(o));
  }

  async findById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.orders.findById(id);
    // Staff get a 404 for other people's orders so ids cannot be probed.
    if (!order || (!isBackOffice(actor) && order.userId !== actor.id)) {
      throw new NotFoundError('Order', id);
    }
    return OrderResponseDto.fromEntity(order);
  }

  /** Moves an order through its workflow; cancelling returns stock. */
  async updateStatus(
    id: string,
    next: OrderStatus,
    actor: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.unitOfWork.run(async (tx) => {
      const current = await this.orders.findByIdForUpdate(id, tx);
      if (!current) throw new NotFoundError('Order', id);
      assertTransition(current.status, next);

      const updated = await this.orders.updateStatus(id, next, tx);
      if (next === OrderStatus.Cancelled) {
        await this.restock(current, actor, tx);
      }
      return updated;
    });

    return OrderResponseDto.fromEntity(order);
  }

  private async loadProducts(
    lines: CreateOrderItemDto[],
    tx: TransactionContext,
  ): Promise<Map<string, Product>> {
    const products = await this.products.findByIds(
      lines.map((line) => line.productId),
      tx,
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    const missing = lines.find((line) => !byId.has(line.productId));
    if (missing) throw new NotFoundError('Product', missing.productId);
    return byId;
  }

  private async restock(
    order: Order,
    actor: AuthenticatedUser,
    tx: TransactionContext,
  ): Promise<void> {
    for (const item of byProductId(order.items)) {
      const applied = await this.applyStockChange(tx, {
        productId: item.productId,
        delta: item.quantity,
        type: StockMovementType.In,
        reason: 'Order cancelled',
        orderId: order.id,
        actorId: actor.id,
      });
      // Adding stock only fails if the product row vanished, which the
      // RESTRICT foreign key on order_items should make impossible.
      if (!applied) {
        throw new Error(`Could not restock product ${item.productId}`);
      }
    }
  }

  /** Adjusts stock and logs the movement; false if stock would go negative. */
  private async applyStockChange(
    tx: TransactionContext,
    change: {
      productId: string;
      delta: number;
      type: StockMovementType;
      reason: string;
      orderId: string;
      actorId: string;
    },
  ): Promise<boolean> {
    const stockAfter = await this.products.adjustStock(
      change.productId,
      change.delta,
      tx,
    );
    if (stockAfter === null) return false;

    await this.movements.create(
      {
        productId: change.productId,
        type: change.type,
        quantity: change.delta,
        stockAfter,
        reason: change.reason,
        orderId: change.orderId,
        createdBy: change.actorId,
      },
      tx,
    );
    return true;
  }
}

function isBackOffice(actor: AuthenticatedUser): boolean {
  return actor.role === Role.Admin || actor.role === Role.Manager;
}

function assertUniqueProducts(lines: CreateOrderItemDto[]): void {
  const ids = new Set(lines.map((line) => line.productId));
  if (ids.size !== lines.length) {
    throw new BusinessRuleError(
      'Each product may appear only once per order; combine the quantities instead',
    );
  }
}

/**
 * Touching rows in a stable order means two concurrent orders for the same
 * products wait on each other instead of deadlocking.
 */
function byProductId<T extends { productId: string }>(lines: T[]): T[] {
  return [...lines].sort((a, b) => a.productId.localeCompare(b.productId));
}
