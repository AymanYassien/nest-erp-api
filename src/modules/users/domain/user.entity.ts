import { Role } from '../../../common/types/role.enum';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Pick<
  User,
  'email' | 'passwordHash' | 'fullName' | 'role'
>;

export type UserChanges = Partial<
  Pick<User, 'fullName' | 'role' | 'isActive' | 'passwordHash'>
>;
