import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { Role } from '../types/role.enum';
import { CurrentUser } from './current-user.decorator';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { Roles, ROLES_KEY } from './roles.decorator';

type ParamFactory = (data: unknown, ctx: unknown) => unknown;

function getParamDecoratorFactory(): ParamFactory {
  class TestController {
    handler(@CurrentUser() _user: unknown) {}
  }
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'handler',
  ) as Record<string, { factory: ParamFactory }>;
  return Object.values(metadata)[0].factory;
}

describe('decorators', () => {
  it('@Public marks handlers as public', () => {
    class TestController {
      @Public()
      handler() {}
    }
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler),
    ).toBe(true);
  });

  it('@Roles stores the allowed roles', () => {
    class TestController {
      @Roles(Role.Admin, Role.Manager)
      handler() {}
    }
    expect(
      Reflect.getMetadata(ROLES_KEY, TestController.prototype.handler),
    ).toEqual([Role.Admin, Role.Manager]);
  });

  it('@CurrentUser extracts request.user', () => {
    const user = { id: 'u1', email: 'a@b.c', role: Role.Staff };
    const factory = getParamDecoratorFactory();

    expect(
      factory(undefined, mockExecutionContext({ request: { user } })),
    ).toBe(user);
  });
});
