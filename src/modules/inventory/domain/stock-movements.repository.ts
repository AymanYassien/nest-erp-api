import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import {
  NewStockMovement,
  StockMovement,
  StockMovementType,
} from './stock-movement.entity';

export const STOCK_MOVEMENT_SORT_FIELDS = ['createdAt', 'quantity'] as const;
export type StockMovementSortField =
  (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];

export interface StockMovementListFilter {
  productId: string;
  type?: StockMovementType;
}

export abstract class StockMovementsRepository {
  abstract create(
    movement: NewStockMovement,
    tx: TransactionContext,
  ): Promise<StockMovement>;
  abstract list(
    filter: StockMovementListFilter,
    page: PageRequest<StockMovementSortField>,
  ): Promise<Paginated<StockMovement>>;
}
