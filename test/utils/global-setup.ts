import knex from 'knex';
import { buildKnexConfig } from '../../src/database/knex.config';
import { loadTestEnv } from './load-test-env';

/** Rebuilds the test schema from scratch once per e2e run. */
export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  const env = process.env;
  const db = knex(
    buildKnexConfig({
      DB_HOST: env.DB_HOST ?? 'localhost',
      DB_PORT: Number(env.DB_PORT ?? 5432),
      DB_USER: env.DB_USER!,
      DB_PASSWORD: env.DB_PASSWORD ?? '',
      DB_NAME: env.DB_NAME!,
    }),
  );
  try {
    await db.migrate.rollback(undefined, true);
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
}
