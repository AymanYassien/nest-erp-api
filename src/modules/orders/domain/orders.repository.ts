import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { NewOrder, Order } from './order.entity';
import { OrderStatus } from './order-status';

export const ORDER_SORT_FIELDS = [
  'createdAt',
  'totalAmount',
  'status',
] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export interface OrderListFilter {
  userId?: string;
  status?: OrderStatus;
  createdFrom?: Date;
  createdTo?: Date;
}

export abstract class OrdersRepository {
  abstract create(order: NewOrder, tx: TransactionContext): Promise<Order>;
  abstract findById(id: string): Promise<Order | null>;
  /** Reads the order and locks its row until the transaction ends. */
  abstract findByIdForUpdate(
    id: string,
    tx: TransactionContext,
  ): Promise<Order | null>;
  abstract list(
    filter: OrderListFilter,
    page: PageRequest<OrderSortField>,
  ): Promise<Paginated<Order>>;
  abstract updateStatus(
    id: string,
    status: OrderStatus,
    tx: TransactionContext,
  ): Promise<Order>;
}
