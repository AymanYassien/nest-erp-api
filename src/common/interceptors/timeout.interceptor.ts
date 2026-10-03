import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  catchError,
  Observable,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly config: AppConfigService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.config.get('REQUEST_TIMEOUT_MS')),
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof TimeoutError
            ? new RequestTimeoutException('Request timed out')
            : error,
        ),
      ),
    );
  }
}
