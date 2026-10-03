import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Without it any authenticated user passes. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
