import { Role } from '../src/common/types/role.enum';
import {
  api,
  createTestApp,
  loginAs,
  resetDatabase,
  seedProduct,
  seedUser,
  TestContext,
} from './utils/test-app';

describe('RBAC (e2e)', () => {
  let ctx: TestContext;
  const tokens = {} as Record<Role, string>;
  const users = {} as Record<Role, { id: string }>;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.knex);
    for (const role of Object.values(Role)) {
      const user = await seedUser(ctx.knex, role);
      users[role] = user;
      tokens[role] = (await loginAs(ctx.app, user)).accessToken;
    }
  });

  afterAll(() => ctx.app.close());

  it.each([
    ['GET', '/users', Role.Staff],
    ['POST', '/users', Role.Manager],
    ['POST', '/products', Role.Staff],
    ['POST', '/categories', Role.Staff],
    [
      'DELETE',
      '/categories/00000000-0000-4000-8000-000000000000',
      Role.Manager,
    ],
  ])('%s %s is forbidden for %s', async (method, path, role) => {
    const client = api(ctx.app);
    const req =
      method === 'GET'
        ? client.get(path, tokens[role])
        : method === 'POST'
          ? client.post(path, tokens[role]).send({})
          : client.delete(path, tokens[role]);

    const res = await req.expect(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { statusCode: 403, code: 'FORBIDDEN' },
    });
  });

  it('staff cannot change order status', async () => {
    await api(ctx.app)
      .patch(
        '/orders/00000000-0000-4000-8000-000000000000/status',
        tokens.staff,
      )
      .send({ status: 'confirmed' })
      .expect(403);
  });

  it('managers can list users but only admins can delete products', async () => {
    await api(ctx.app).get('/users', tokens.manager).expect(200);

    const product = await seedProduct(ctx.knex);
    await api(ctx.app)
      .delete(`/products/${product.id}`, tokens.manager)
      .expect(403);
    await api(ctx.app)
      .delete(`/products/${product.id}`, tokens.admin)
      .expect(204);
  });

  it('every role can read the catalogue', async () => {
    for (const role of Object.values(Role)) {
      await api(ctx.app).get('/products', tokens[role]).expect(200);
    }
  });

  it('admins cannot demote themselves', async () => {
    const res = await api(ctx.app)
      .patch(`/users/${users.admin.id}`, tokens.admin)
      .send({ role: 'staff' })
      .expect(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });
});
