import { Injectable } from '@nestjs/common';
import {
  InsufficientStockError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import { mapPaginated, Paginated } from '../../../common/pagination/paginated';
import { UnitOfWork } from '../../../common/persistence/unit-of-work';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { ProductsRepository } from '../domain/products.repository';
import { toStockDelta } from '../domain/stock-movement.entity';
import { StockMovementsRepository } from '../domain/stock-movements.repository';
import {
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
  StockMovementResponseDto,
} from './dto/stock-movement.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly products: ProductsRepository,
    private readonly movements: StockMovementsRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  /** Updates stock and writes the movement in one transaction. */
  async recordMovement(
    productId: string,
    dto: CreateStockMovementDto,
    actor: AuthenticatedUser,
  ): Promise<StockMovementResponseDto> {
    const delta = toStockDelta(dto.type, dto.quantity);

    const movement = await this.unitOfWork.run(async (tx) => {
      const product = await this.products.findById(productId, tx);
      if (!product) throw new NotFoundError('Product', productId);

      const stockAfter = await this.products.adjustStock(productId, delta, tx);
      if (stockAfter === null) {
        throw new InsufficientStockError(product.sku, Math.abs(delta));
      }

      return this.movements.create(
        {
          productId,
          type: dto.type,
          quantity: delta,
          stockAfter,
          reason: dto.reason ?? null,
          orderId: null,
          createdBy: actor.id,
        },
        tx,
      );
    });

    return StockMovementResponseDto.fromEntity(movement);
  }

  async listMovements(
    productId: string,
    query: ListStockMovementsQueryDto,
  ): Promise<Paginated<StockMovementResponseDto>> {
    if (!(await this.products.findById(productId))) {
      throw new NotFoundError('Product', productId);
    }
    const { page, limit, sortBy, sortOrder, type } = query;
    const result = await this.movements.list(
      { productId, type },
      { page, limit, sortBy, sortOrder },
    );
    return mapPaginated(result, (m) => StockMovementResponseDto.fromEntity(m));
  }
}
