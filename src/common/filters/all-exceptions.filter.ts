import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { normalizeException } from './normalize-exception';

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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const error = normalizeException(exception);

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
}
