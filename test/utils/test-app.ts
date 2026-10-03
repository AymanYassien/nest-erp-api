import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import type { Knex } from 'knex';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { API_PREFIX, configureApp } from '../../src/app.setup';
import { Role } from '../../src/common/types/role.enum';
import { KNEX } from '../../src/database/database.constants';

export const PASSWORD = 'Passw0rd!';

export interface TestContext {
  app: INestApplication<App>;
  knex: Knex;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return { app, knex: app.get<Knex>(KNEX) };
}

export async function resetDatabase(knex: Knex): Promise<void> {
  await knex.raw(
    'TRUNCATE stock_movements, order_items, orders, products, categories, refresh_tokens, users CASCADE',
  );
}

export interface SeededUser {
  id: string;
  email: string;
  role: Role;
}

export async function seedUser(knex: Knex, role: Role): Promise<SeededUser> {
  const email = `${role}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const [row] = await knex('users')
    .insert({
      email,
      full_name: `Test ${role}`,
      role,
      password_hash: await bcrypt.hash(PASSWORD, 4),
    })
    .returning<{ id: string }[]>('id');
  return { id: row.id, email, role };
}

export async function seedProduct(
  knex: Knex,
  overrides: { sku?: string; price?: number; stock?: number } = {},
): Promise<{ id: string; sku: string }> {
  const sku =
    overrides.sku ??
    `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const [row] = await knex('products')
    .insert({
      sku,
      name: `Product ${sku}`,
      price: overrides.price ?? 10,
      stock: overrides.stock ?? 10,
    })
    .returning<{ id: string }[]>('id');
  return { id: row.id, sku };
}

export async function stockOf(knex: Knex, productId: string): Promise<number> {
  const row = await knex('products')
    .where({ id: productId })
    .first<{ stock: number }>('stock');
  return row.stock;
}

/** Thin wrapper so tests read as `api.post('/orders', token).send(...)`. */
export function api(app: INestApplication<App>) {
  const server = app.getHttpServer();
  const url = (path: string) => `/${API_PREFIX}${path}`;
  const withAuth = (req: request.Test, token?: string) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;

  return {
    get: (path: string, token?: string) =>
      withAuth(request(server).get(url(path)), token),
    post: (path: string, token?: string) =>
      withAuth(request(server).post(url(path)), token),
    patch: (path: string, token?: string) =>
      withAuth(request(server).patch(url(path)), token),
    delete: (path: string, token?: string) =>
      withAuth(request(server).delete(url(path)), token),
    raw: () => request(server),
  };
}

export async function loginAs(
  app: INestApplication<App>,
  user: Pick<SeededUser, 'email'>,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await api(app)
    .post('/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  return (
    res.body as {
      data: { tokens: { accessToken: string; refreshToken: string } };
    }
  ).data.tokens;
}
