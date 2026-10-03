import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { isPaginated, PaginationMeta } from '../pagination/paginated';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Wraps every successful response in `{ success, data, meta }`. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((body) => {
        if (isPaginated(body)) {
          return { success: true, data: body.items, meta: body.meta };
        }
        return { success: true, data: body ?? null };
      }),
    );
  }
}
