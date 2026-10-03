import { api, createTestApp, TestContext } from './utils/test-app';

describe('Health (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.app.close());

  it('GET /health is public, unprefixed and reports the database', async () => {
    const res = await api(ctx.app).raw().get('/health').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'ok', database: 'up' },
    });
  });

  it('unknown API routes return the standard error body', async () => {
    const res = await api(ctx.app).get('/nope').expect(404);

    expect(res.body).toMatchObject({
      success: false,
      error: { statusCode: 404, code: 'NOT_FOUND' },
      meta: { method: 'GET', path: '/api/v1/nope' },
    });
  });
});
