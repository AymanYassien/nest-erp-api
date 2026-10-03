import { lastValueFrom, of } from 'rxjs';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();
  const run = (body: unknown) =>
    lastValueFrom(
      interceptor.intercept(mockExecutionContext(), {
        handle: () => of(body),
      }),
    );

  it('wraps plain payloads in a success envelope', async () => {
    await expect(run({ id: 1 })).resolves.toEqual({
      success: true,
      data: { id: 1 },
    });
  });

  it('lifts pagination meta out of paginated results', async () => {
    const meta = { page: 1, limit: 10, total: 1, totalPages: 1 };

    await expect(run({ items: [{ id: 1 }], meta })).resolves.toEqual({
      success: true,
      data: [{ id: 1 }],
      meta,
    });
  });

  it('returns null data for empty handlers', async () => {
    await expect(run(undefined)).resolves.toEqual({
      success: true,
      data: null,
    });
  });
});
