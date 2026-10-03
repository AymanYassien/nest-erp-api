import {
  BusinessRuleError,
  InsufficientStockError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import {
  FAKE_TX,
  FakeUnitOfWork,
} from '../../../common/testing/fake-unit-of-work';
import { Role } from '../../../common/types/role.enum';
import { StockMovementType } from '../domain/stock-movement.entity';
import {
  buildMovement,
  buildProduct,
  mockProductsRepository,
  mockStockMovementsRepository,
} from '../testing/builders';
import { StockService } from './stock.service';

describe('StockService', () => {
  let products: ReturnType<typeof mockProductsRepository>;
  let movements: ReturnType<typeof mockStockMovementsRepository>;
  let unitOfWork: FakeUnitOfWork;
  let service: StockService;
  const actor = { id: 'user-1', email: 'm@acme.com', role: Role.Manager };

  beforeEach(() => {
    products = mockProductsRepository();
    movements = mockStockMovementsRepository();
    unitOfWork = new FakeUnitOfWork();
    service = new StockService(products, movements, unitOfWork);
  });

  describe('recordMovement', () => {
    it('applies the signed delta and records the resulting stock', async () => {
      products.findById.mockResolvedValue(buildProduct({ stock: 5 }));
      products.adjustStock.mockResolvedValue(2);
      movements.create.mockResolvedValue(buildMovement({ quantity: -3 }));

      await service.recordMovement(
        'product-1',
        { type: StockMovementType.Out, quantity: 3, reason: 'Damaged' },
        actor,
      );

      expect(unitOfWork.runs).toBe(1);
      expect(products.adjustStock).toHaveBeenCalledWith(
        'product-1',
        -3,
        FAKE_TX,
      );
      expect(movements.create).toHaveBeenCalledWith(
        {
          productId: 'product-1',
          type: StockMovementType.Out,
          quantity: -3,
          stockAfter: 2,
          reason: 'Damaged',
          orderId: null,
          createdBy: 'user-1',
        },
        FAKE_TX,
      );
    });

    it('rejects invalid quantities before opening a transaction', async () => {
      await expect(
        service.recordMovement(
          'product-1',
          { type: StockMovementType.In, quantity: -1 },
          actor,
        ),
      ).rejects.toBeInstanceOf(BusinessRuleError);
      expect(unitOfWork.runs).toBe(0);
    });

    it('throws NotFoundError for unknown products', async () => {
      products.findById.mockResolvedValue(null);

      await expect(
        service.recordMovement(
          'missing',
          { type: StockMovementType.In, quantity: 1 },
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InsufficientStockError and writes no movement when stock would go negative', async () => {
      products.findById.mockResolvedValue(buildProduct({ stock: 1 }));
      products.adjustStock.mockResolvedValue(null);

      await expect(
        service.recordMovement(
          'product-1',
          { type: StockMovementType.Out, quantity: 5 },
          actor,
        ),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(movements.create).not.toHaveBeenCalled();
    });
  });

  describe('listMovements', () => {
    it('lists movements of an existing product', async () => {
      products.findById.mockResolvedValue(buildProduct());
      const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
      movements.list.mockResolvedValue({ items: [buildMovement()], meta });

      const result = await service.listMovements('product-1', {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        type: StockMovementType.In,
      });

      expect(movements.list).toHaveBeenCalledWith(
        { productId: 'product-1', type: StockMovementType.In },
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.meta).toBe(meta);
    });

    it('throws NotFoundError for unknown products', async () => {
      products.findById.mockResolvedValue(null);

      await expect(
        service.listMovements('missing', {
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
