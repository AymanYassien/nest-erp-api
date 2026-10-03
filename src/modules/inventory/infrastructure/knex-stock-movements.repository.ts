import { Injectable } from '@nestjs/common';
import {
  mapPaginated,
  PageRequest,
  Paginated,
} from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { KnexRepository } from '../../../database/knex-repository';
import { paginate } from '../../../database/knex-paginate';
import {
  NewStockMovement,
  StockMovement,
  StockMovementType,
} from '../domain/stock-movement.entity';
import {
  StockMovementListFilter,
  StockMovementSortField,
  StockMovementsRepository,
} from '../domain/stock-movements.repository';

interface StockMovementRow {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  stock_after: number;
  reason: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: Date;
}

const SORT_COLUMNS: Record<StockMovementSortField, string> = {
  createdAt: 'created_at',
  quantity: 'quantity',
};

@Injectable()
export class KnexStockMovementsRepository
  extends KnexRepository
  implements StockMovementsRepository
{
  async create(
    movement: NewStockMovement,
    tx: TransactionContext,
  ): Promise<StockMovement> {
    const [row] = await this.db(tx)<StockMovementRow>('stock_movements')
      .insert({
        product_id: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        stock_after: movement.stockAfter,
        reason: movement.reason,
        order_id: movement.orderId,
        created_by: movement.createdBy,
      })
      .returning('*');
    return toEntity(row);
  }

  async list(
    filter: StockMovementListFilter,
    page: PageRequest<StockMovementSortField>,
  ): Promise<Paginated<StockMovement>> {
    const query = this.knex<StockMovementRow>('stock_movements')
      .select('*')
      .where('product_id', filter.productId);
    if (filter.type) query.where('type', filter.type);

    const result = await paginate<StockMovementRow, StockMovementSortField>(
      query,
      page,
      SORT_COLUMNS,
      'id',
    );
    return mapPaginated(result, toEntity);
  }
}

function toEntity(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    stockAfter: row.stock_after,
    reason: row.reason,
    orderId: row.order_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
