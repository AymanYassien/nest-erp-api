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

describe('Orders (e2e)', () => {
  let ctx: TestContext;
  let staffToken: string;
  let managerToken: string;
  let desk: { id: string; sku: string };
  let chair: { id: string; sku: string };

  const count = async (table: string) =>
    Number(
      (await ctx.knex(table).count<{ count: string }[]>({ count: '*' }))[0]
        .count,
    );

  const placeOrder = (
    items: { productId: string; quantity: number }[],
    token = staffToken,
  ) => api(ctx.app).post('/orders', token).send({ items });

  const setStatus = (orderId: string, status: string) =>
    api(ctx.app)
      .patch(`/orders/${orderId}/status`, managerToken)
      .send({ status });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.knex);
    staffToken = (await loginAs(ctx.app, await seedUser(ctx.knex, Role.Staff)))
      .accessToken;
    managerToken = (
      await loginAs(ctx.app, await seedUser(ctx.knex, Role.Manager))
    ).accessToken;
    desk = await seedProduct(ctx.knex, {
      sku: 'DESK',
      price: 199.99,
      stock: 5,
    });
    chair = await seedProduct(ctx.knex, {
      sku: 'CHAIR',
      price: 49.5,
      stock: 10,
    });
  });

  afterAll(() => ctx.app.close());

  it('creates an order, prices it and decrements stock', async () => {
    const res = await placeOrder([
      { productId: desk.id, quantity: 2 },
      { productId: chair.id, quantity: 4 },
    ]).expect(201);

    expect(res.body.data).toMatchObject({
      status: 'pending',
      totalAmount: 597.98,
      items: expect.arrayContaining([
        expect.objectContaining({
          productId: desk.id,
          quantity: 2,
          lineTotal: 399.98,
        }),
        expect.objectContaining({
          productId: chair.id,
          quantity: 4,
          lineTotal: 198,
        }),
      ]),
    });
    expect(await stockOf(ctx.knex, desk.id)).toBe(3);
    expect(await stockOf(ctx.knex, chair.id)).toBe(6);

    const movements = await ctx.knex('stock_movements').where({
      order_id: res.body.data.id,
    });
    expect(movements).toHaveLength(2);
  });

  it('rolls back everything when one line has insufficient stock', async () => {
    // CHAIR sorts before DESK, so the chair decrement is applied before the
    // desk line fails: the rollback has real work to undo.
    const res = await placeOrder([
      { productId: chair.id, quantity: 3 },
      { productId: desk.id, quantity: 6 },
    ]).expect(409);

    expect(res.body.error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: "Insufficient stock for product 'DESK' (requested 6)",
    });
    expect(await stockOf(ctx.knex, chair.id)).toBe(10);
    expect(await stockOf(ctx.knex, desk.id)).toBe(5);
    expect(await count('orders')).toBe(0);
    expect(await count('order_items')).toBe(0);
    expect(await count('stock_movements')).toBe(0);
  });

  it('never oversells under concurrent orders', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        placeOrder([{ productId: desk.id, quantity: 2 }]),
      ),
    );

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 201, 409, 409]);
    expect(await stockOf(ctx.knex, desk.id)).toBe(1);
  });

  it('rejects unknown products with 404 and duplicate lines with 422', async () => {
    await placeOrder([
      { productId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
    ]).expect(404);
    await placeOrder([
      { productId: desk.id, quantity: 1 },
      { productId: desk.id, quantity: 1 },
    ]).expect(422);
  });

  it('rejects an empty order', async () => {
    await placeOrder([]).expect(400);
  });

  describe('status workflow', () => {
    let orderId: string;

    beforeEach(async () => {
      orderId = (
        await placeOrder([{ productId: desk.id, quantity: 2 }]).expect(201)
      ).body.data.id;
    });

    it('walks the happy path to delivered', async () => {
      for (const status of ['confirmed', 'shipped', 'delivered']) {
        const res = await setStatus(orderId, status).expect(200);
        expect(res.body.data.status).toBe(status);
      }
    });

    it('rejects skipping steps with 409', async () => {
      const res = await setStatus(orderId, 'shipped').expect(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('cannot cancel once shipped', async () => {
      await setStatus(orderId, 'confirmed').expect(200);
      await setStatus(orderId, 'shipped').expect(200);
      await setStatus(orderId, 'cancelled').expect(409);
    });

    it('returns stock when a confirmed order is cancelled', async () => {
      expect(await stockOf(ctx.knex, desk.id)).toBe(3);
      await setStatus(orderId, 'confirmed').expect(200);

      await setStatus(orderId, 'cancelled').expect(200);

      expect(await stockOf(ctx.knex, desk.id)).toBe(5);
      const restock = await ctx
        .knex('stock_movements')
        .where({ order_id: orderId, type: 'in' })
        .first();
      expect(restock).toMatchObject({ quantity: 2, stock_after: 5 });
    });
  });

  describe('visibility', () => {
    it("hides other users' orders from staff but not from managers", async () => {
      const orderId = (
        await placeOrder(
          [{ productId: chair.id, quantity: 1 }],
          managerToken,
        ).expect(201)
      ).body.data.id;

      await api(ctx.app).get(`/orders/${orderId}`, staffToken).expect(404);
      await api(ctx.app).get(`/orders/${orderId}`, managerToken).expect(200);

      const staffList = await api(ctx.app)
        .get('/orders', staffToken)
        .expect(200);
      expect(staffList.body.meta.total).toBe(0);
      const managerList = await api(ctx.app)
        .get('/orders', managerToken)
        .expect(200);
      expect(managerList.body.meta.total).toBe(1);
    });
  });
});
