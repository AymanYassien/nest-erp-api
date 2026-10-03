import { Order } from '../domain/order.entity';
import { OrderStatus } from '../domain/order-status';

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    userId: 'staff-1',
    status: OrderStatus.Pending,
    totalAmount: 30,
    notes: null,
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        productId: 'product-b',
        quantity: 2,
        unitPrice: 10,
        lineTotal: 20,
      },
      {
        id: 'item-2',
        orderId: 'order-1',
        productId: 'product-a',
        quantity: 1,
        unitPrice: 10,
        lineTotal: 10,
      },
    ],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
