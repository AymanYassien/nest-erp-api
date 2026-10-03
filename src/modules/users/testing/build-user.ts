import { Role } from '../../../common/types/role.enum';
import { User } from '../domain/user.entity';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jane@acme.com',
    passwordHash: 'hashed',
    fullName: 'Jane Doe',
    role: Role.Staff,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
