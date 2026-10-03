import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../common/errors/domain.errors';
import { Role } from '../../../common/types/role.enum';
import { PasswordHasher } from '../domain/password-hasher';
import { UsersRepository } from '../domain/users.repository';
import { buildUser } from '../testing/build-user';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let users: jest.Mocked<UsersRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let service: UsersService;
  const admin = { id: 'admin-1', email: 'admin@acme.com', role: Role.Admin };

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
      compare: jest.fn(),
    };
    service = new UsersService(users, hasher);
  });

  describe('list', () => {
    it('passes filters and paging to the repository and strips hashes', async () => {
      const meta = { page: 2, limit: 5, total: 6, totalPages: 2 };
      users.list.mockResolvedValue({ items: [buildUser()], meta });

      const result = await service.list({
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc',
        role: Role.Staff,
        search: 'jane',
      });

      expect(users.list).toHaveBeenCalledWith(
        { role: Role.Staff, isActive: undefined, search: 'jane' },
        { page: 2, limit: 5, sortBy: 'email', sortOrder: 'asc' },
      );
      expect(result.meta).toBe(meta);
      expect(result.items[0]).toBeInstanceOf(UserResponseDto);
      expect(result.items[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findById', () => {
    it('returns the user', async () => {
      users.findById.mockResolvedValue(buildUser());
      await expect(service.findById('user-1')).resolves.toMatchObject({
        id: 'user-1',
      });
    });

    it('throws NotFoundError for unknown ids', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.findById('nope')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    const dto = {
      email: 'new@acme.com',
      password: 'Passw0rd!',
      fullName: 'New User',
      role: Role.Manager,
    };

    it('hashes the password before saving', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(buildUser({ email: dto.email }));

      const result = await service.create(dto);

      expect(hasher.hash).toHaveBeenCalledWith('Passw0rd!');
      expect(users.create).toHaveBeenCalledWith({
        email: 'new@acme.com',
        fullName: 'New User',
        role: Role.Manager,
        passwordHash: 'hashed',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate emails', async () => {
      users.findByEmail.mockResolvedValue(buildUser());
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictError);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates another user', async () => {
      users.update.mockResolvedValue(buildUser({ role: Role.Manager }));

      const result = await service.update(
        'user-1',
        { role: Role.Manager },
        admin,
      );

      expect(users.update).toHaveBeenCalledWith('user-1', {
        role: Role.Manager,
      });
      expect(result.role).toBe(Role.Manager);
    });

    it('lets users rename themselves', async () => {
      users.update.mockResolvedValue(buildUser({ id: admin.id }));
      await expect(
        service.update(admin.id, { fullName: 'New Name' }, admin),
      ).resolves.toBeDefined();
    });

    it.each([{ role: Role.Staff }, { isActive: false }])(
      'blocks self-service access changes %p',
      async (dto) => {
        await expect(
          service.update(admin.id, dto, admin),
        ).rejects.toBeInstanceOf(BusinessRuleError);
      },
    );

    it('throws NotFoundError when nothing was updated', async () => {
      users.update.mockResolvedValue(null);
      await expect(
        service.update('missing', { fullName: 'X Y' }, admin),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes another user', async () => {
      users.delete.mockResolvedValue(true);
      await expect(service.remove('user-1', admin)).resolves.toBeUndefined();
    });

    it('blocks deleting yourself', async () => {
      await expect(service.remove(admin.id, admin)).rejects.toBeInstanceOf(
        BusinessRuleError,
      );
    });

    it('throws NotFoundError for unknown ids', async () => {
      users.delete.mockResolvedValue(false);
      await expect(service.remove('missing', admin)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
