import {
  BusinessRuleError,
  InsufficientStockError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import {
  FAKE_TX,
  FakeUnitOfWork,
} from '../../../common/testing/fake-unit-of-work';
import { Role } from '../../../common/types/role.enum';
import { StockMovementType } from '../../inventory/domain/stock-movement.entity';
import {
  buildProduct,
  mockProductsRepository,
  mockStockMovementsRepository,
} from '../../inventory/testing/builders';
import { OrderStatus } from '../domain/order-status';
import { OrdersRepository } from '../domain/orders.repository';
import { buildOrder } from '../testing/build-order';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let orders: jest.Mocked<OrdersRepository>;
  let products: ReturnType<typeof mockProductsRepository>;
  let movements: ReturnType<typeof mockStockMovementsRepository>;
  let unitOfWork: FakeUnitOfWork;
  let service: OrdersService;

  const staff = { id: 'staff-1', email: 's@acme.com', role: Role.Staff };
  const manager = { id: 'manager-1', email: 'm@acme.com', role: Role.Manager };
  const productA = buildProduct({ id: 'product-a', sku: 'A', price: 19.99 });
  const productB = buildProduct({ id: 'product-b', sku: 'B', price: 5 });
  const page = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  } as const;

  beforeEach(() => {
    orders = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
    };
    products = mockProductsRepository();
    movements = mockStockMovementsRepository();
    unitOfWork = new FakeUnitOfWork();
    service = new OrdersService(orders, products, movements, unitOfWork);
  });

  describe('create', () => {
    const dto = {
      items: [
        { productId: 'product-b', quantity: 2 },
        { productId: 'product-a', quantity: 3 },
      ],
      notes: 'Rush',
    };

    beforeEach(() => {
      products.findByIds.mockResolvedValue([productA, productB]);
      orders.create.mockResolvedValue(buildOrder({ id: 'order-9' }));
    });

    it('prices the order from current product prices', async () => {
      products.adjustStock.mockResolvedValue(1);

      await service.create(dto, staff);

      expect(orders.create).toHaveBeenCalledWith(
        {
          userId: 'staff-1',
          status: OrderStatus.Pending,
          totalAmount: 69.97,
          notes: 'Rush',
          items: [
            {
              productId: 'product-b',
              quantity: 2,
              unitPrice: 5,
              lineTotal: 10,
            },
            {
              productId: 'product-a',
              quantity: 3,
              unitPrice: 19.99,
              lineTotal: 59.97,
            },
          ],
        },
        FAKE_TX,
      );
    });

    it('decrements stock in product-id order and logs each movement', async () => {
      products.adjustStock.mockResolvedValueOnce(7).mockResolvedValueOnce(3);

      await service.create(dto, staff);

      expect(unitOfWork.runs).toBe(1);
      expect(products.adjustStock.mock.calls).toEqual([
        ['product-a', -3, FAKE_TX],
        ['product-b', -2, FAKE_TX],
      ]);
      expect(movements.create).toHaveBeenNthCalledWith(
        1,
        {
          productId: 'product-a',
          type: StockMovementType.Out,
          quantity: -3,
          stockAfter: 7,
          reason: 'Order placed',
          orderId: 'order-9',
          createdBy: 'staff-1',
        },
        FAKE_TX,
      );
      expect(movements.create).toHaveBeenCalledTimes(2);
    });

    it('fails with InsufficientStockError so the transaction rolls back', async () => {
      products.adjustStock.mockResolvedValueOnce(7).mockResolvedValueOnce(null);

      await expect(service.create(dto, staff)).rejects.toThrow(
        new InsufficientStockError('B', 2),
      );
      expect(movements.create).toHaveBeenCalledTimes(1);
    });

    it('rejects unknown or deleted products', async () => {
      products.findByIds.mockResolvedValue([productA]);

      await expect(service.create(dto, staff)).rejects.toThrow(
        new NotFoundError('Product', 'product-b'),
      );
      expect(orders.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate product lines before touching the database', async () => {
      await expect(
        service.create(
          {
            items: [
              { productId: 'product-a', quantity: 1 },
              { productId: 'product-a', quantity: 2 },
            ],
          },
          staff,
        ),
      ).rejects.toBeInstanceOf(BusinessRuleError);
      expect(unitOfWork.runs).toBe(0);
    });

    it('stores null notes when none are given', async () => {
      products.adjustStock.mockResolvedValue(1);

      await service.create({ items: dto.items }, staff);

      expect(orders.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
        FAKE_TX,
      );
    });
  });

  describe('list', () => {
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };

    beforeEach(() =>
      orders.list.mockResolvedValue({ items: [buildOrder()], meta }),
    );

    it('forces staff to their own orders', async () => {
      await service.list({ ...page, userId: 'someone-else' }, staff);

      expect(orders.list).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'staff-1' }),
        page,
      );
    });

    it('lets managers filter by any user and status', async () => {
      const createdFrom = new Date('2026-01-01');
      const result = await service.list(
        { ...page, userId: 'u-7', status: OrderStatus.Shipped, createdFrom },
        manager,
      );

      expect(orders.list).toHaveBeenCalledWith(
        {
          userId: 'u-7',
          status: OrderStatus.Shipped,
          createdFrom,
          createdTo: undefined,
        },
        page,
      );
      expect(result.items[0].items[0]).not.toHaveProperty('orderId');
    });
  });

  describe('findById', () => {
    it('returns the order to its owner', async () => {
      orders.findById.mockResolvedValue(buildOrder());
      await expect(service.findById('order-1', staff)).resolves.toMatchObject({
        id: 'order-1',
      });
    });

    it("hides other users' orders from staff", async () => {
      orders.findById.mockResolvedValue(buildOrder({ userId: 'other' }));
      await expect(service.findById('order-1', staff)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('lets managers read any order', async () => {
      orders.findById.mockResolvedValue(buildOrder({ userId: 'other' }));
      await expect(service.findById('order-1', manager)).resolves.toBeDefined();
    });

    it('throws NotFoundError for unknown orders', async () => {
      orders.findById.mockResolvedValue(null);
      await expect(service.findById('x', manager)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('updateStatus', () => {
    it('applies a valid transition without touching stock', async () => {
      orders.findByIdForUpdate.mockResolvedValue(buildOrder());
      orders.updateStatus.mockResolvedValue(
        buildOrder({ status: OrderStatus.Confirmed }),
      );

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.Confirmed,
        manager,
      );

      expect(orders.findByIdForUpdate).toHaveBeenCalledWith('order-1', FAKE_TX);
      expect(orders.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.Confirmed,
        FAKE_TX,
      );
      expect(products.adjustStock).not.toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.Confirmed);
    });

    it('rejects invalid transitions', async () => {
      orders.findByIdForUpdate.mockResolvedValue(
        buildOrder({ status: OrderStatus.Delivered }),
      );

      await expect(
        service.updateStatus('order-1', OrderStatus.Pending, manager),
      ).rejects.toBeInstanceOf(InvalidStatusTransitionError);
      expect(orders.updateStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for unknown orders', async () => {
      orders.findByIdForUpdate.mockResolvedValue(null);

      await expect(
        service.updateStatus('x', OrderStatus.Confirmed, manager),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns stock when an order is cancelled', async () => {
      orders.findByIdForUpdate.mockResolvedValue(buildOrder());
      orders.updateStatus.mockResolvedValue(
        buildOrder({ status: OrderStatus.Cancelled }),
      );
      products.adjustStock.mockResolvedValue(10);

      await service.updateStatus('order-1', OrderStatus.Cancelled, manager);

      expect(products.adjustStock.mock.calls).toEqual([
        ['product-a', 1, FAKE_TX],
        ['product-b', 2, FAKE_TX],
      ]);
      expect(movements.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StockMovementType.In,
          quantity: 2,
          reason: 'Order cancelled',
          orderId: 'order-1',
          createdBy: 'manager-1',
        }),
        FAKE_TX,
      );
    });

    it('aborts the cancellation if a product cannot be restocked', async () => {
      orders.findByIdForUpdate.mockResolvedValue(buildOrder());
      orders.updateStatus.mockResolvedValue(
        buildOrder({ status: OrderStatus.Cancelled }),
      );
      products.adjustStock.mockResolvedValue(null);

      await expect(
        service.updateStatus('order-1', OrderStatus.Cancelled, manager),
      ).rejects.toThrow('Could not restock product product-a');
    });
  });
});
