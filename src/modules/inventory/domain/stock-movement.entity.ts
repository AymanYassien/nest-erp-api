import { BusinessRuleError } from '../../../common/errors/domain.errors';

export enum StockMovementType {
  In = 'in',
  Out = 'out',
  Adjustment = 'adjustment',
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  /** Signed change applied to the product's stock. */
  quantity: number;
  stockAfter: number;
  reason: string | null;
  orderId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export type NewStockMovement = Omit<StockMovement, 'id' | 'createdAt'>;

/**
 * Turns a user-facing movement into a signed stock delta. `in` and `out` take a
 * positive amount; an adjustment carries its own sign (e.g. -3 after a count).
 */
export function toStockDelta(
  type: StockMovementType,
  quantity: number,
): number {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new BusinessRuleError('Quantity must be a non-zero integer');
  }
  if (type === StockMovementType.Adjustment) return quantity;
  if (quantity < 0) {
    throw new BusinessRuleError(
      `Quantity for '${type}' movements must be positive; use an adjustment for corrections`,
    );
  }
  return type === StockMovementType.In ? quantity : -quantity;
}
