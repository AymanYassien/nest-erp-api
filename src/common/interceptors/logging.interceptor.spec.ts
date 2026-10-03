import { CallHandler, Logger, NotFoundException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs method, route pattern, status, duration and user id', async () => {
    const context = mockExecutionContext({
      request: {
        method: 'GET',
        route: { path: '/orders/:id' },
        originalUrl: '/orders/42',
        user: { id: 'user-1' },
      },
      response: { statusCode: 200 },
    });

    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of('x') } as CallHandler),
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/orders\/:id 200 \d+ms user=user-1$/),
    );
  });

  it('logs failures with the error status and anonymous user', async () => {
    const context = mockExecutionContext({
      request: { method: 'POST', originalUrl: '/things' },
    });
    const handler = {
      handle: () => throwError(() => new NotFoundException()),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^POST \/things 404 \d+ms user=anonymous$/),
    );
  });

  it('reports unknown errors as 500', async () => {
    const context = mockExecutionContext({
      request: { method: 'GET', originalUrl: '/x' },
    });
    const handler = {
      handle: () => throwError(() => new Error('boom')),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toThrow('boom');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(' 500 '));
  });
});
