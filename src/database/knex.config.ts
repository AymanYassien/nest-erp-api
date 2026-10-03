import path from 'node:path';
import type { Knex } from 'knex';

export interface DatabaseEnv {
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

// Compiled builds contain .js migrations (plus .d.ts files that must be skipped).
const sourceExtension = path.extname(__filename) === '.ts' ? '.ts' : '.js';

export function buildKnexConfig(env: DatabaseEnv): Knex.Config {
  return {
    client: 'pg',
    connection: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    },
    pool: { min: 0, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
      loadExtensions: [sourceExtension],
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      loadExtensions: [sourceExtension],
      extension: 'ts',
    },
  };
}
