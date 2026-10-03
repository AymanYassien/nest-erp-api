import { Role } from '../src/common/types/role.enum';
import {
  api,
  createTestApp,
  loginAs,
  PASSWORD,
  resetDatabase,
  seedUser,
  SeededUser,
  TestContext,
} from './utils/test-app';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  let staff: SeededUser;

  const refresh = (refreshToken: string) =>
    api(ctx.app).post('/auth/refresh').send({ refreshToken });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.knex);
    staff = await seedUser(ctx.knex, Role.Staff);
  });

  afterAll(() => ctx.app.close());

  describe('register', () => {
    it('creates a staff account and returns tokens', async () => {
      const res = await api(ctx.app)
        .post('/auth/register')
        .send({
          email: 'New@Test.local',
          password: PASSWORD,
          fullName: 'New User',
        })
        .expect(201);

      expect(res.body.data.user).toMatchObject({
        email: 'new@test.local',
        role: Role.Staff,
      });
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.tokens).toMatchObject({
        tokenType: 'Bearer',
        expiresIn: 900,
      });
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await api(ctx.app)
        .post('/auth/register')
        .send({ email: staff.email, password: PASSWORD, fullName: 'Dup' })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects invalid payloads and unknown fields with 400', async () => {
      const res = await api(ctx.app)
        .post('/auth/register')
        .send({ email: 'bad', password: 'short', fullName: 'X', role: 'admin' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          'property role should not exist',
          'email must be an email',
        ]),
      );
    });
  });

  describe('login', () => {
    it('returns tokens that authenticate later requests', async () => {
      const { accessToken } = await loginAs(ctx.app, staff);

      const res = await api(ctx.app).get('/users/me', accessToken).expect(200);
      expect(res.body.data).toMatchObject({ id: staff.id, email: staff.email });
    });

    it('rejects a wrong password with 401', async () => {
      await api(ctx.app)
        .post('/auth/login')
        .send({ email: staff.email, password: 'Wrong-pass1' })
        .expect(401);
    });

    it('rejects deactivated users', async () => {
      await ctx
        .knex('users')
        .where({ id: staff.id })
        .update({ is_active: false });

      const res = await api(ctx.app)
        .post('/auth/login')
        .send({ email: staff.email, password: PASSWORD })
        .expect(401);
      expect(res.body.error.message).toBe('Account is deactivated');
    });
  });

  describe('protected routes', () => {
    it('reject requests without a token', async () => {
      await api(ctx.app).get('/users/me').expect(401);
    });

    it('reject tampered tokens', async () => {
      const { accessToken } = await loginAs(ctx.app, staff);
      await api(ctx.app).get('/users/me', `${accessToken}x`).expect(401);
    });
  });

  describe('refresh token rotation', () => {
    it('issues a new pair and stores only hashes', async () => {
      const first = await loginAs(ctx.app, staff);

      const res = await refresh(first.refreshToken).expect(200);
      const second = res.body.data as TokenPair;

      expect(second.refreshToken).not.toBe(first.refreshToken);
      await api(ctx.app).get('/users/me', second.accessToken).expect(200);

      const stored = await ctx.knex('refresh_tokens').select('token_hash');
      expect(
        stored.map((r: { token_hash: string }) => r.token_hash),
      ).not.toContain(first.refreshToken);
    });

    it('revokes the whole family when an old token is reused', async () => {
      const first = await loginAs(ctx.app, staff);
      const second = (await refresh(first.refreshToken).expect(200)).body
        .data as TokenPair;
      const third = (await refresh(second.refreshToken).expect(200)).body
        .data as TokenPair;

      // An attacker replays the first, already-rotated token.
      const reuse = await refresh(first.refreshToken).expect(401);
      expect(reuse.body.error.message).toBe('Refresh token reuse detected');

      // The legitimate client's latest token is now dead too.
      await refresh(third.refreshToken).expect(401);

      const active = await ctx
        .knex('refresh_tokens')
        .whereNull('revoked_at')
        .count<{ count: string }[]>({ count: '*' });
      expect(Number(active[0].count)).toBe(0);
    });

    it('does not affect other sessions of the same user', async () => {
      const laptop = await loginAs(ctx.app, staff);
      const phone = await loginAs(ctx.app, staff);
      await refresh(laptop.refreshToken).expect(200);

      await refresh(laptop.refreshToken).expect(401);

      await refresh(phone.refreshToken).expect(200);
    });

    it('rejects unknown and expired tokens', async () => {
      await refresh('x'.repeat(64)).expect(401);

      const { refreshToken } = await loginAs(ctx.app, staff);
      await ctx
        .knex('refresh_tokens')
        .update({ expires_at: new Date(Date.now() - 1000) });
      const res = await refresh(refreshToken).expect(401);
      expect(res.body.error.message).toBe('Refresh token expired');
    });
  });

  describe('logout', () => {
    it('revokes the session so its refresh token stops working', async () => {
      const { accessToken, refreshToken } = await loginAs(ctx.app, staff);

      await api(ctx.app)
        .post('/auth/logout', accessToken)
        .send({ refreshToken })
        .expect(204);

      await refresh(refreshToken).expect(401);
    });
  });
});
