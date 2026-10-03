import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { Role } from '../types/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(mockExecutionContext())).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects requests without a bearer token', async () => {
    const context = mockExecutionContext({ request: { headers: {} } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
  });

  it('rejects a non-bearer authorization scheme', async () => {
    const context = mockExecutionContext({
      request: { headers: { authorization: 'Basic abc' } },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects invalid or expired tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const context = mockExecutionContext({
      request: { headers: { authorization: 'Bearer bad' } },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired access token'),
    );
  });

  it('attaches the authenticated user to the request', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.c',
      role: Role.Manager,
    });
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer good' },
    };

    await expect(
      guard.canActivate(mockExecutionContext({ request })),
    ).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good');
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'a@b.c',
      role: Role.Manager,
    });
  });
});
