import { InvalidStatusTransitionError } from '../../../common/errors/domain.errors';
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  OrderStatus,
} from './order-status';

const { Pending, Confirmed, Shipped, Delivered, Cancelled } = OrderStatus;

describe('order status workflow', () => {
  it.each([
    [Pending, Confirmed],
    [Pending, Cancelled],
    [Confirmed, Shipped],
    [Confirmed, Cancelled],
    [Shipped, Delivered],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [Pending, Shipped],
    [Pending, Delivered],
    [Pending, Pending],
    [Confirmed, Pending],
    [Confirmed, Delivered],
    [Shipped, Cancelled],
    [Shipped, Confirmed],
    [Delivered, Cancelled],
    [Delivered, Pending],
    [Cancelled, Pending],
    [Cancelled, Confirmed],
  ])('rejects %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(
      InvalidStatusTransitionError,
    );
  });

  it('treats delivered and cancelled as final', () => {
    expect(allowedTransitions(Delivered)).toEqual([]);
    expect(allowedTransitions(Cancelled)).toEqual([]);
  });
});
