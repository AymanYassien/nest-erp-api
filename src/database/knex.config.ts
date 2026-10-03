import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Knex } from 'knex';

export interface DatabaseEnv {
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

// Running from src/ loads .ts files; a compiled build loads .js and must skip .d.ts.
const sourceExtension = path.extname(__filename) === '.ts' ? '.ts' : '.js';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Knex records each migration under its file name. Recording it without the
 * extension lets a database migrated with ts-node in development be migrated
 * later from the compiled .js build, and vice versa.
 */
export class ExtensionAgnosticMigrationSource implements Knex.MigrationSource<string> {
  constructor(private readonly directory: string) {}

  async getMigrations(): Promise<string[]> {
    const files = await readdir(this.directory);
    return files
      .filter((f) => f.endsWith(sourceExtension) && !f.endsWith('.d.ts'))
      .sort();
  }

  getMigrationName(file: string): string {
    return path.basename(file, path.extname(file));
  }

  getMigration(file: string): Promise<Knex.Migration> {
    // Same loader Knex uses for CommonJS migrations: works for .ts under
    // ts-node/Jest and for compiled .js.
    const modulePath = path.join(this.directory, file);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return Promise.resolve(require(modulePath) as Knex.Migration);
  }
}

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
      migrationSource: new ExtensionAgnosticMigrationSource(MIGRATIONS_DIR),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      loadExtensions: [sourceExtension],
    },
  };
}
