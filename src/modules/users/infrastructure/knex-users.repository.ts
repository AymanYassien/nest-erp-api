import { Injectable } from '@nestjs/common';
import {
  PageRequest,
  Paginated,
  mapPaginated,
} from '../../../common/pagination/paginated';
import { Role } from '../../../common/types/role.enum';
import { KnexRepository } from '../../../database/knex-repository';
import { paginate } from '../../../database/knex-paginate';
import { containsPattern } from '../../../database/like-pattern';
import { NewUser, User, UserChanges } from '../domain/user.entity';
import {
  UserListFilter,
  UserSortField,
  UsersRepository,
} from '../domain/users.repository';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMNS: Record<UserSortField, string> = {
  createdAt: 'created_at',
  email: 'email',
  fullName: 'full_name',
  role: 'role',
};

@Injectable()
export class KnexUsersRepository
  extends KnexRepository
  implements UsersRepository
{
  async findById(id: string): Promise<User | null> {
    const row = await this.knex<UserRow>('users').where({ id }).first();
    return row ? toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.knex<UserRow>('users').where({ email }).first();
    return row ? toEntity(row) : null;
  }

  async list(
    filter: UserListFilter,
    page: PageRequest<UserSortField>,
  ): Promise<Paginated<User>> {
    const query = this.knex<UserRow>('users').select('*');
    if (filter.role) query.where('role', filter.role);
    if (filter.isActive !== undefined)
      query.where('is_active', filter.isActive);
    if (filter.search) {
      const pattern = containsPattern(filter.search);
      query.whereRaw('(email ILIKE ? OR full_name ILIKE ?)', [
        pattern,
        pattern,
      ]);
    }
    const result = await paginate<UserRow, UserSortField>(
      query,
      page,
      SORT_COLUMNS,
      'id',
    );
    return mapPaginated(result, toEntity);
  }

  async create(user: NewUser): Promise<User> {
    const [row] = await this.knex<UserRow>('users')
      .insert({
        email: user.email,
        password_hash: user.passwordHash,
        full_name: user.fullName,
        role: user.role,
      })
      .returning('*');
    return toEntity(row);
  }

  async update(id: string, changes: UserChanges): Promise<User | null> {
    const [row] = await this.knex<UserRow>('users')
      .where({ id })
      .update({
        full_name: changes.fullName,
        role: changes.role,
        is_active: changes.isActive,
        password_hash: changes.passwordHash,
        updated_at: this.knex.fn.now() as unknown as Date,
      })
      .returning('*');
    return row ? toEntity(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    return (await this.knex('users').where({ id }).delete()) > 0;
  }
}

function toEntity(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
