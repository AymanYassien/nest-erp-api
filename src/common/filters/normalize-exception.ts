import { HttpException, HttpStatus } from '@nestjs/common';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  InsufficientStockError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../errors/domain.errors';
import { isPostgresError, mapPostgresError } from './postgres-error.mapper';

export interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: string[];
}

type DomainErrorClass = abstract new (...args: never[]) => DomainError;

const DOMAIN_ERROR_STATUS: ReadonlyArray<[DomainErrorClass, HttpStatus]> = [
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [InsufficientStockError, HttpStatus.CONFLICT],
  [InvalidStatusTransitionError, HttpStatus.CONFLICT],
  [BusinessRuleError, HttpStatus.UNPROCESSABLE_ENTITY],
];

/**
 * Single source of truth for how any thrown value maps to an HTTP error.
 * Used by the exception filter (response body) and the logger (status).
 */
export function normalizeException(exception: unknown): NormalizedError {
  if (exception instanceof HttpException) {
    return fromHttpException(exception);
  }
  if (exception instanceof DomainError) {
    return {
      status:
        DOMAIN_ERROR_STATUS.find(([type]) => exception instanceof type)?.[1] ??
        HttpStatus.BAD_REQUEST,
      code: exception.code,
      message: exception.message,
    };
  }
  if (isPostgresError(exception)) {
    const mapped = mapPostgresError(exception);
    if (mapped) return mapped;
  }
  // Never leak internals of unexpected errors to the client.
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  };
}

function fromHttpException(exception: HttpException): NormalizedError {
  const status = exception.getStatus();
  const response = exception.getResponse();
  const code = (HttpStatus[status] as string | undefined) ?? 'HTTP_ERROR';

  if (typeof response === 'string') {
    return { status, code, message: response };
  }

  const { message } = response as { message?: string | string[] };
  // ValidationPipe reports one message per invalid field.
  if (Array.isArray(message)) {
    return {
      status,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: message,
    };
  }
  return { status, code, message: message ?? exception.message };
}
