import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { normalizeException } from '../filters/normalize-exception';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = http.getResponse<Response>();
          this.logger.log(this.format(request, statusCode, startedAt));
        },
        error: (error: unknown) => {
          const { status } = normalizeException(error);
          this.logger.warn(this.format(request, status, startedAt));
        },
      }),
    );
  }

  private format(request: Request, status: number, startedAt: number): string {
    // The matched route pattern (e.g. /orders/:id) groups logs better than the raw URL.
    const route =
      (request.route as { path?: string } | undefined)?.path ??
      request.originalUrl;
    const userId = request.user?.id ?? 'anonymous';
    const duration = Date.now() - startedAt;
    return `${request.method} ${route} ${status} ${duration}ms user=${userId}`;
  }
}
