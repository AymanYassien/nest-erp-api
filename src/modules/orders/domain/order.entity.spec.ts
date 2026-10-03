import { priceOrderLines } from './order.entity';

describe('priceOrderLines', () => {
  it('computes line totals and the order total', () => {
    const result = priceOrderLines([
      { productId: 'a', unitPrice: 19.99, quantity: 3 },
      { productId: 'b', unitPrice: 5, quantity: 2 },
    ]);

    expect(result.items).toEqual([
      { productId: 'a', unitPrice: 19.99, quantity: 3, lineTotal: 59.97 },
      { productId: 'b', unitPrice: 5, quantity: 2, lineTotal: 10 },
    ]);
    expect(result.totalAmount).toBe(69.97);
  });

  it('avoids floating-point drift', () => {
    const result = priceOrderLines([
      { productId: 'a', unitPrice: 0.1, quantity: 1 },
      { productId: 'b', unitPrice: 0.2, quantity: 1 },
    ]);

    expect(result.totalAmount).toBe(0.3);
  });
});
