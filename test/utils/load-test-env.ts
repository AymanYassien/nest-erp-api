import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Points the app at the test database. Values already exported in the shell
 * (as in CI) win over .env. Refuses to run against a database whose name does
 * not end in `_test`, because every run truncates all tables.
 */
export function loadTestEnv(): void {
  const envFile = path.resolve(__dirname, '../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const env = process.env;
  env.NODE_ENV = 'test';
  env.DB_NAME = env.DB_TEST_NAME ?? 'nest_erp_test';
  env.DB_USER ??= 'postgres';
  env.JWT_ACCESS_SECRET ??= 'e2e-test-secret-that-is-at-least-32-characters';
  env.BCRYPT_ROUNDS = '4';
  env.THROTTLE_ENABLED = 'false';

  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e tests against "${env.DB_NAME}": the name must end with "_test"`,
    );
  }
}

loadTestEnv();
