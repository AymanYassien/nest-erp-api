import { Role } from '../src/common/types/role.enum';
import {
  api,
  createTestApp,
  loginAs,
  resetDatabase,
  seedProduct,
  seedUser,
  stockOf,
  TestContext,
} from './utils/test-app';

describe('Inventory (e2e)', () => {
  let ctx: TestContext;
  let manager: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.knex);
    manager = (await loginAs(ctx.app, await seedUser(ctx.knex, Role.Manager)))
      .accessToken;
  });

  afterAll(() => ctx.app.close());

  const createProduct = (body: Record<string, unknown>) =>
    api(ctx.app).post('/products', manager).send(body);

  it('creates a product and books its opening stock as a movement', async () => {
    const res = await createProduct({
      sku: 'NEW-1',
      name: 'New thing',
      price: 12.5,
      initialStock: 7,
    }).expect(201);

    expect(res.body.data).toMatchObject({
      sku: 'NEW-1',
      price: 12.5,
      stock: 7,
    });
    const movements = await api(ctx.app)
      .get(`/products/${res.body.data.id}/stock-movements`, manager)
      .expect(200);
    expect(movements.body.data).toEqual([
      expect.objectContaining({ type: 'in', quantity: 7, stockAfter: 7 }),
    ]);
  });

  it('maps a duplicate SKU (unique violation) to 409', async () => {
    await seedProduct(ctx.knex, { sku: 'DUP-1' });

    const res = await createProduct({
      sku: 'DUP-1',
      name: 'Again',
      price: 1,
    }).expect(409);
    expect(res.body.error.code).toBe('UNIQUE_VIOLATION');
  });

  it('maps an unknown category (foreign-key violation) to 400', async () => {
    const res = await createProduct({
      sku: 'FK-1',
      name: 'Orphan',
      price: 1,
      categoryId: '00000000-0000-4000-8000-000000000000',
    }).expect(400);
    expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
  });

  it('paginates, filters and sorts products', async () => {
    for (const [sku, price] of [
      ['A-1', 5],
      ['B-1', 50],
      ['C-1', 500],
    ] as const) {
      await seedProduct(ctx.knex, { sku, price });
    }

    const res = await api(ctx.app)
      .get('/products?minPrice=10&sortBy=price&sortOrder=desc&limit=1', manager)
      .expect(200);

    expect(res.body.data.map((p: { sku: string }) => p.sku)).toEqual(['C-1']);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('rejects unknown sort fields', async () => {
    await api(ctx.app).get('/products?sortBy=deleted_at', manager).expect(400);
  });

  it('soft-deletes products and lets admins restore them', async () => {
    const product = await seedProduct(ctx.knex);
    const admin = (await loginAs(ctx.app, await seedUser(ctx.knex, Role.Admin)))
      .accessToken;

    await api(ctx.app).delete(`/products/${product.id}`, admin).expect(204);
    await api(ctx.app).get(`/products/${product.id}`, manager).expect(404);
    const row = await ctx.knex('products').where({ id: product.id }).first();
    expect(row.deleted_at).not.toBeNull();

    await api(ctx.app)
      .post(`/products/${product.id}/restore`, admin)
      .expect(200);
    await api(ctx.app).get(`/products/${product.id}`, manager).expect(200);
  });

  describe('stock movements', () => {
    it('updates stock and records the movement together', async () => {
      const product = await seedProduct(ctx.knex, { stock: 10 });

      const res = await api(ctx.app)
        .post(`/products/${product.id}/stock-movements`, manager)
        .send({ type: 'out', quantity: 4, reason: 'Damaged' })
        .expect(201);

      expect(res.body.data).toMatchObject({ quantity: -4, stockAfter: 6 });
      expect(await stockOf(ctx.knex, product.id)).toBe(6);
    });

    it('refuses to take stock below zero and writes nothing', async () => {
      const product = await seedProduct(ctx.knex, { stock: 2 });

      const res = await api(ctx.app)
        .post(`/products/${product.id}/stock-movements`, manager)
        .send({ type: 'adjustment', quantity: -3 })
        .expect(409);

      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
      expect(await stockOf(ctx.knex, product.id)).toBe(2);
      expect(await ctx.knex('stock_movements').count()).toEqual([
        { count: '0' },
      ]);
    });
  });
});
