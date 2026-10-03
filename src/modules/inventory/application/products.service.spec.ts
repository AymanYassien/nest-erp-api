import { NotFoundError } from '../../../common/errors/domain.errors';
import {
  FAKE_TX,
  FakeUnitOfWork,
} from '../../../common/testing/fake-unit-of-work';
import { Role } from '../../../common/types/role.enum';
import { StockMovementType } from '../domain/stock-movement.entity';
import {
  buildProduct,
  mockProductsRepository,
  mockStockMovementsRepository,
} from '../testing/builders';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let products: ReturnType<typeof mockProductsRepository>;
  let movements: ReturnType<typeof mockStockMovementsRepository>;
  let unitOfWork: FakeUnitOfWork;
  let service: ProductsService;
  const actor = { id: 'user-1', email: 'm@acme.com', role: Role.Manager };

  beforeEach(() => {
    products = mockProductsRepository();
    movements = mockStockMovementsRepository();
    unitOfWork = new FakeUnitOfWork();
    service = new ProductsService(products, movements, unitOfWork);
  });

  it('lists products, splitting filters from paging', async () => {
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    products.list.mockResolvedValue({ items: [buildProduct()], meta });

    const result = await service.list({
      page: 1,
      limit: 20,
      sortBy: 'price',
      sortOrder: 'asc',
      minPrice: 5,
      inStock: true,
    });

    expect(products.list).toHaveBeenCalledWith(
      { minPrice: 5, inStock: true },
      { page: 1, limit: 20, sortBy: 'price', sortOrder: 'asc' },
    );
    expect(result.items[0]).not.toHaveProperty('deletedAt');
  });

  it('finds a product', async () => {
    products.findById.mockResolvedValue(buildProduct());
    await expect(service.findById('product-1')).resolves.toMatchObject({
      sku: 'SKU-1',
    });
  });

  it('throws NotFoundError for missing products', async () => {
    products.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('create', () => {
    const dto = { sku: 'SKU-9', name: 'Gadget', price: 12.5 };

    it('creates a product without stock and without a movement', async () => {
      products.create.mockResolvedValue(buildProduct({ stock: 0 }));

      await service.create(dto, actor);

      expect(products.create).toHaveBeenCalledWith(
        {
          sku: 'SKU-9',
          name: 'Gadget',
          description: null,
          price: 12.5,
          stock: 0,
          categoryId: null,
        },
        FAKE_TX,
      );
      expect(movements.create).not.toHaveBeenCalled();
    });

    it('books opening stock as an `in` movement in the same transaction', async () => {
      products.create.mockResolvedValue(buildProduct({ id: 'p9', stock: 30 }));

      await service.create({ ...dto, initialStock: 30 }, actor);

      expect(unitOfWork.runs).toBe(1);
      expect(movements.create).toHaveBeenCalledWith(
        {
          productId: 'p9',
          type: StockMovementType.In,
          quantity: 30,
          stockAfter: 30,
          reason: 'Initial stock',
          orderId: null,
          createdBy: 'user-1',
        },
        FAKE_TX,
      );
    });
  });

  it('updates a product', async () => {
    products.update.mockResolvedValue(buildProduct({ price: 99 }));
    await expect(
      service.update('product-1', { price: 99 }),
    ).resolves.toMatchObject({ price: 99 });
  });

  it('throws NotFoundError when updating a missing product', async () => {
    products.update.mockResolvedValue(null);
    await expect(service.update('x', { price: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('soft-deletes a product', async () => {
    products.softDelete.mockResolvedValue(true);
    await expect(service.remove('product-1')).resolves.toBeUndefined();
  });

  it('throws NotFoundError when deleting a missing product', async () => {
    products.softDelete.mockResolvedValue(false);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('restores a soft-deleted product', async () => {
    products.restore.mockResolvedValue(buildProduct());
    await expect(service.restore('product-1')).resolves.toMatchObject({
      id: 'product-1',
    });
  });

  it('throws NotFoundError when there is nothing to restore', async () => {
    products.restore.mockResolvedValue(null);
    await expect(service.restore('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
