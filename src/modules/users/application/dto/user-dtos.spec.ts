import { validateDto } from '../../../../common/testing/validate-dto';
import { Role } from '../../../../common/types/role.enum';
import { CreateUserDto } from './create-user.dto';
import { ListUsersQueryDto } from './list-users-query.dto';
import { UpdateUserDto } from './update-user.dto';

describe('user DTOs', () => {
  const validUser = {
    email: '  Jane@Acme.com ',
    password: 'Passw0rd!',
    fullName: ' Jane Doe ',
    role: Role.Manager,
  };

  it('accepts and normalizes a valid user', async () => {
    const { instance, errors } = await validateDto(CreateUserDto, validUser);

    expect(errors).toEqual([]);
    expect(instance.email).toBe('jane@acme.com');
    expect(instance.fullName).toBe('Jane Doe');
  });

  it.each([
    ['short', 'password must be longer than or equal to 8 characters'],
    ['onlyletters', 'password must contain at least one letter and one number'],
    [
      'x'.repeat(70) + '123',
      'password must be shorter than or equal to 72 characters',
    ],
  ])('rejects weak password %p', async (password, message) => {
    const { errors } = await validateDto(CreateUserDto, {
      ...validUser,
      password,
    });
    expect(errors).toContain(message);
  });

  it('rejects unknown roles and extra fields', async () => {
    const { errors } = await validateDto(CreateUserDto, {
      ...validUser,
      role: 'superuser',
      isAdmin: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'property isAdmin should not exist',
        expect.stringContaining('role must be one of'),
      ]),
    );
  });

  it('allows partial updates', async () => {
    const { errors } = await validateDto(UpdateUserDto, { isActive: false });
    expect(errors).toEqual([]);
  });

  it('parses list query strings', async () => {
    const { instance, errors } = await validateDto(ListUsersQueryDto, {
      page: '2',
      limit: '5',
      isActive: 'false',
      sortBy: 'email',
    });

    expect(errors).toEqual([]);
    expect(instance).toMatchObject({ page: 2, limit: 5, isActive: false });
  });

  it('applies list defaults', async () => {
    const { instance } = await validateDto(ListUsersQueryDto, {});
    expect(instance).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('rejects unsupported sort fields and oversized pages', async () => {
    const { errors } = await validateDto(ListUsersQueryDto, {
      sortBy: 'password_hash',
      limit: '1000',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sortBy must be one of'),
        'limit must not be greater than 100',
      ]),
    );
  });
});
