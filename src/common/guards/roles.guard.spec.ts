import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { Role } from '../types/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const contextFor = (role?: Role) =>
    mockExecutionContext({
      request: { user: role ? { id: 'u1', email: 'x@y.z', role } : undefined },
    });

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated user when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(Role.Staff))).toBe(true);
  });

  it('allows an empty roles list', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(contextFor(Role.Staff))).toBe(true);
  });

  it('allows users whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin, Role.Manager]);
    expect(guard.canActivate(contextFor(Role.Manager))).toBe(true);
  });

  it('forbids users whose role is not listed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(contextFor(Role.Staff))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids requests without a user', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
