import { Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { KnexRepository } from '../../../database/knex-repository';
import { paginate } from '../../../database/knex-paginate';
import { NewOrder, Order, OrderItem } from '../domain/order.entity';
import { OrderStatus } from '../domain/order-status';
import {
  OrderListFilter,
  OrderSortField,
  OrdersRepository,
} from '../domain/orders.repository';

interface OrderRow {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

const SORT_COLUMNS: Record<OrderSortField, string> = {
  createdAt: 'created_at',
  totalAmount: 'total_amount',
  status: 'status',
};

@Injectable()
export class KnexOrdersRepository
  extends KnexRepository
  implements OrdersRepository
{
  async create(order: NewOrder, tx: TransactionContext): Promise<Order> {
    const db = this.db(tx);
    const [orderRow] = await db<OrderRow>('orders')
      .insert({
        user_id: order.userId,
        status: order.status,
        total_amount: String(order.totalAmount),
        notes: order.notes,
      })
      .returning('*');

    const itemRows = await db<OrderItemRow>('order_items')
      .insert(
        order.items.map((item) => ({
          order_id: orderRow.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: String(item.unitPrice),
          line_total: String(item.lineTotal),
        })),
      )
      .returning('*');

    return toEntity(orderRow, itemRows);
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.knex<OrderRow>('orders').where({ id }).first();
    return row ? this.withItems(row, this.knex) : null;
  }

  async findByIdForUpdate(
    id: string,
    tx: TransactionContext,
  ): Promise<Order | null> {
    const db = this.db(tx);
    const row = await db<OrderRow>('orders').where({ id }).forUpdate().first();
    return row ? this.withItems(row, db) : null;
  }

  async list(
    filter: OrderListFilter,
    page: PageRequest<OrderSortField>,
  ): Promise<Paginated<Order>> {
    const query = this.knex<OrderRow>('orders').select('*');
    if (filter.userId) query.where('user_id', filter.userId);
    if (filter.status) query.where('status', filter.status);
    if (filter.createdFrom) query.where('created_at', '>=', filter.createdFrom);
    if (filter.createdTo) query.where('created_at', '<=', filter.createdTo);

    const result = await paginate<OrderRow, OrderSortField>(
      query,
      page,
      SORT_COLUMNS,
      'id',
    );
    // One query for all items on the page instead of one per order.
    const items = await this.itemsFor(
      result.items.map((o) => o.id),
      this.knex,
    );
    return {
      items: result.items.map((row) =>
        toEntity(
          row,
          items.filter((i) => i.order_id === row.id),
        ),
      ),
      meta: result.meta,
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    tx: TransactionContext,
  ): Promise<Order> {
    const db = this.db(tx);
    const [row] = await db<OrderRow>('orders')
      .where({ id })
      .update({ status, updated_at: new Date() })
      .returning('*');
    return this.withItems(row, db);
  }

  private async withItems(row: OrderRow, db: Knex): Promise<Order> {
    return toEntity(row, await this.itemsFor([row.id], db));
  }

  private itemsFor(orderIds: string[], db: Knex): Promise<OrderItemRow[]> {
    if (orderIds.length === 0) return Promise.resolve([]);
    return db<OrderItemRow>('order_items')
      .whereIn('order_id', orderIds)
      .orderBy('product_id');
  }
}

function toEntity(row: OrderRow, itemRows: OrderItemRow[]): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    items: itemRows.map(toItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  };
}
