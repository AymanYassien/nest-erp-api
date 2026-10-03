import { HttpStatus } from '@nestjs/common';

export interface MappedError {
  status: HttpStatus;
  code: string;
  message: string;
}

interface PostgresError {
  code: string;
  constraint?: string;
  detail?: string;
}

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

export function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(error.code) &&
    'severity' in error
  );
}

/** Translates the Postgres errors a client can cause into 4xx responses. */
export function mapPostgresError(error: PostgresError): MappedError | null {
  switch (error.code) {
    case PG_UNIQUE_VIOLATION:
      return {
        status: HttpStatus.CONFLICT,
        code: 'UNIQUE_VIOLATION',
        message: describe(
          'A record with the same unique value already exists',
          error,
        ),
      };
    case PG_FOREIGN_KEY_VIOLATION:
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'FOREIGN_KEY_VIOLATION',
        message: describe(
          'The operation references a record that does not exist or is still in use',
          error,
        ),
      };
    case PG_CHECK_VIOLATION:
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'CHECK_VIOLATION',
        message: describe('The data violates a database constraint', error),
      };
    case PG_INVALID_TEXT_REPRESENTATION:
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_INPUT',
        message: 'A value has an invalid format',
      };
    default:
      return null;
  }
}

function describe(message: string, error: PostgresError): string {
  return error.constraint ? `${message} (${error.constraint})` : message;
}
