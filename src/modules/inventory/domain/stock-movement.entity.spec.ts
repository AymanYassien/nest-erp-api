import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { StockMovementType, toStockDelta } from './stock-movement.entity';

describe('toStockDelta', () => {
  it.each([
    [StockMovementType.In, 5, 5],
    [StockMovementType.Out, 5, -5],
    [StockMovementType.Adjustment, -3, -3],
    [StockMovementType.Adjustment, 4, 4],
  ])('%s of %i changes stock by %i', (type, quantity, expected) => {
    expect(toStockDelta(type, quantity)).toBe(expected);
  });

  it.each([
    [StockMovementType.In, 0],
    [StockMovementType.Adjustment, 0],
    [StockMovementType.In, 1.5],
    [StockMovementType.In, -2],
    [StockMovementType.Out, -2],
  ])('rejects %s of %p', (type, quantity) => {
    expect(() => toStockDelta(type, quantity)).toThrow(BusinessRuleError);
  });
});
