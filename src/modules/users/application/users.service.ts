import { Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import { mapPaginated, Paginated } from '../../../common/pagination/paginated';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { PasswordHasher } from '../domain/password-hasher';
import { User } from '../domain/user.entity';
import { UsersRepository } from '../domain/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Paginated<UserResponseDto>> {
    const { page, limit, sortBy, sortOrder, role, isActive, search } = query;
    const result = await this.users.list(
      { role, isActive, search },
      { page, limit, sortBy, sortOrder },
    );
    return mapPaginated(result, (user) => UserResponseDto.fromEntity(user));
  }

  async findById(id: string): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.getOrFail(id));
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictError('Email is already registered');
    }
    const user = await this.users.create({
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      passwordHash: await this.passwordHasher.hash(dto.password),
    });
    return UserResponseDto.fromEntity(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    // Stops an admin from locking everyone (including themselves) out by accident.
    const touchesOwnAccess = dto.role !== undefined || dto.isActive === false;
    if (id === actor.id && touchesOwnAccess) {
      throw new BusinessRuleError(
        'You cannot change your own role or deactivate yourself',
      );
    }
    const updated = await this.users.update(id, dto);
    if (!updated) throw new NotFoundError('User', id);
    return UserResponseDto.fromEntity(updated);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    if (id === actor.id) {
      throw new BusinessRuleError('You cannot delete your own account');
    }
    if (!(await this.users.delete(id))) {
      throw new NotFoundError('User', id);
    }
  }

  private async getOrFail(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
