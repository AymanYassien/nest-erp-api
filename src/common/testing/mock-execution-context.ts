import type { ArgumentsHost, ExecutionContext } from '@nestjs/common';

export interface MockHttp {
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  handler?: () => void;
  controller?: new () => unknown;
}

/** Minimal ExecutionContext for unit-testing guards, interceptors and filters. */
export function mockExecutionContext({
  request = {},
  response = {},
  handler = () => undefined,
  controller = class {},
}: MockHttp = {}): ExecutionContext & ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => controller,
    getType: () => 'http',
    getArgs: () => [request, response],
    getArgByIndex: (index: number) => [request, response][index],
    switchToRpc: () => {
      throw new Error('not supported');
    },
    switchToWs: () => {
      throw new Error('not supported');
    },
  } as unknown as ExecutionContext & ArgumentsHost;
}
