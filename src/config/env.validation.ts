import Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  REQUEST_TIMEOUT_MS: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  BCRYPT_ROUNDS: number;
  THROTTLE_ENABLED: boolean;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
}

export const envValidationSchema = Joi.object<EnvironmentVariables, true>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  REQUEST_TIMEOUT_MS: Joi.number().integer().min(100).default(10_000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(7),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
  THROTTLE_ENABLED: Joi.boolean().default(true),
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),
})
  // process.env holds many unrelated variables; report every problem at once.
  .unknown(true)
  .prefs({ abortEarly: false });
