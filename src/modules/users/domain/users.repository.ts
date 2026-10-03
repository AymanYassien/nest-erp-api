import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { Role } from '../../../common/types/role.enum';
import { NewUser, User, UserChanges } from './user.entity';

export const USER_SORT_FIELDS = [
  'createdAt',
  'email',
  'fullName',
  'role',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export interface UserListFilter {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

/** Persistence port for users. Implemented in the infrastructure layer. */
export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract list(
    filter: UserListFilter,
    page: PageRequest<UserSortField>,
  ): Promise<Paginated<User>>;
  abstract create(user: NewUser): Promise<User>;
  abstract update(id: string, changes: UserChanges): Promise<User | null>;
  abstract delete(id: string): Promise<boolean>;
}
