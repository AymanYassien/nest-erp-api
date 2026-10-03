import { OrderStatus } from './order-status';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type NewOrderItem = Pick<
  OrderItem,
  'productId' | 'quantity' | 'unitPrice' | 'lineTotal'
>;

export interface NewOrder {
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  items: NewOrderItem[];
}

export interface PricedLine {
  productId: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Prices order lines in integer cents so totals never pick up floating-point
 * drift (0.1 + 0.2 !== 0.3).
 */
export function priceOrderLines(lines: PricedLine[]): {
  items: NewOrderItem[];
  totalAmount: number;
} {
  let totalCents = 0;
  const items = lines.map((line) => {
    const lineCents = toCents(line.unitPrice) * line.quantity;
    totalCents += lineCents;
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: lineCents / 100,
    };
  });
  return { items, totalAmount: totalCents / 100 };
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}
