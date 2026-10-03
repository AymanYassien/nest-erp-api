import { CallHandler, RequestTimeoutException } from '@nestjs/common';
import { delay, lastValueFrom, of, throwError } from 'rxjs';
import { AppConfigService } from '../../config/app-config.service';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  const config = { get: () => 20 } as unknown as AppConfigService;
  const interceptor = new TimeoutInterceptor(config);
  const run = (handler: CallHandler) =>
    lastValueFrom(interceptor.intercept(mockExecutionContext(), handler));

  it('passes through fast responses', async () => {
    await expect(run({ handle: () => of('ok') })).resolves.toBe('ok');
  });

  it('converts slow responses into a 408', async () => {
    await expect(
      run({ handle: () => of('late').pipe(delay(100)) }),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('rethrows other errors unchanged', async () => {
    const error = new Error('boom');

    await expect(run({ handle: () => throwError(() => error) })).rejects.toBe(
      error,
    );
  });
});
