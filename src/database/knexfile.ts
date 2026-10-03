import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildKnexConfig } from './knex.config';

// The Knex CLI runs outside Nest (and chdirs to this folder), so it loads the
// project-root .env itself. Variables already set in the shell win.
const envFile = path.resolve(__dirname, '../../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const env = process.env;

export default buildKnexConfig({
  DB_HOST: env.DB_HOST ?? 'localhost',
  DB_PORT: Number(env.DB_PORT ?? 5432),
  DB_USER: env.DB_USER ?? 'postgres',
  DB_PASSWORD: env.DB_PASSWORD ?? '',
  DB_NAME: env.DB_NAME ?? 'nest_erp',
});
