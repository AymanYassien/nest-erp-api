import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  InsufficientStockError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../errors/domain.errors';
import { isPostgresError, mapPostgresError } from './postgres-error.mapper';

export interface ErrorResponseBody {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: string[];
  };
  meta: {
    method: string;
    path: string;
    timestamp: string;
  };
}

interface NormalizedError {
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const error = this.normalize(exception);

    if (error.status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        statusCode: error.status,
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      meta: {
        method: request.method,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      },
    };
    response.status(error.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof DomainError) {
      return {
        status:
          DOMAIN_ERROR_STATUS.find(
            ([type]) => exception instanceof type,
          )?.[1] ?? HttpStatus.BAD_REQUEST,
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

  private fromHttpException(exception: HttpException): NormalizedError {
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
}
