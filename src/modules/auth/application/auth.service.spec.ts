import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  FAKE_TX as TX,
  FakeUnitOfWork,
} from '../../../common/testing/fake-unit-of-work';
import { Role } from '../../../common/types/role.enum';
import { AppConfigService } from '../../../config/app-config.service';
import { UserResponseDto } from '../../users/application/dto/user-response.dto';
import { UsersService } from '../../users/application/users.service';
import { PasswordHasher } from '../../users/domain/password-hasher';
import { UsersRepository } from '../../users/domain/users.repository';
import { buildUser } from '../../users/testing/build-user';
import { RefreshToken } from '../domain/refresh-token.entity';
import { RefreshTokensRepository } from '../domain/refresh-tokens.repository';
import { AuthService } from './auth.service';
import { hashRefreshToken } from './refresh-token.util';

function buildToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'token-1',
    userId: 'user-1',
    familyId: 'family-1',
    tokenHash: hashRefreshToken('raw-token'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let usersService: { create: jest.Mock };
  let users: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'findById'>>;
  let hasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<RefreshTokensRepository>;
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersService = { create: jest.fn() };
    users = { findByEmail: jest.fn(), findById: jest.fn() };
    hasher = { hash: jest.fn(), compare: jest.fn() };
    tokens = {
      findByHash: jest.fn(),
      create: jest.fn(),
      revokeIfActive: jest.fn(),
      revokeFamily: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const config = {
      get: (key: string) =>
        ({ JWT_ACCESS_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 7 })[key],
    } as AppConfigService;

    service = new AuthService(
      usersService as unknown as UsersService,
      users as unknown as UsersRepository,
      hasher,
      tokens,
      new FakeUnitOfWork(),
      jwt as unknown as JwtService,
      config,
    );
  });

  describe('register', () => {
    it('creates a staff user and returns a token pair', async () => {
      const user = UserResponseDto.fromEntity(buildUser());
      usersService.create.mockResolvedValue(user);

      const result = await service.register({
        email: 'jane@acme.com',
        password: 'Passw0rd!',
        fullName: 'Jane Doe',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.Staff }),
      );
      expect(result.user).toBe(user);
      expect(result.tokens).toMatchObject({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      expect(result.tokens.refreshToken).toEqual(expect.any(String));
    });

    it('stores only the hash of the refresh token, in a new family', async () => {
      usersService.create.mockResolvedValue(
        UserResponseDto.fromEntity(buildUser()),
      );

      const { tokens: pair } = await service.register({
        email: 'jane@acme.com',
        password: 'Passw0rd!',
        fullName: 'Jane Doe',
      });

      const stored = tokens.create.mock.calls[0][0];
      expect(stored.tokenHash).toBe(hashRefreshToken(pair.refreshToken));
      expect(stored.tokenHash).not.toBe(pair.refreshToken);
      expect(stored.familyId).toEqual(expect.any(String));
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(
        sevenDays - 5_000,
      );
    });
  });

  describe('login', () => {
    it('issues tokens for valid credentials', async () => {
      users.findByEmail.mockResolvedValue(buildUser({ role: Role.Admin }));
      hasher.compare.mockResolvedValue(true);

      const result = await service.login({
        email: 'jane@acme.com',
        password: 'pw',
      });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'jane@acme.com',
        role: Role.Admin,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(buildUser());
      hasher.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'jane@acme.com', password: 'bad' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('still runs a hash comparison for unknown emails', async () => {
      users.findByEmail.mockResolvedValue(null);
      hasher.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'ghost@acme.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(hasher.compare).toHaveBeenCalledWith(
        'pw',
        expect.stringMatching(/^\$2b\$/),
      );
    });

    it('rejects deactivated accounts', async () => {
      users.findByEmail.mockResolvedValue(buildUser({ isActive: false }));
      hasher.compare.mockResolvedValue(true);

      await expect(
        service.login({ email: 'jane@acme.com', password: 'pw' }),
      ).rejects.toThrow(new UnauthorizedException('Account is deactivated'));
    });
  });

  describe('refresh', () => {
    it('rotates the token within the same family', async () => {
      tokens.findByHash.mockResolvedValue(buildToken());
      users.findById.mockResolvedValue(buildUser());
      tokens.revokeIfActive.mockResolvedValue(true);

      const pair = await service.refresh('raw-token');

      expect(tokens.findByHash).toHaveBeenCalledWith(
        hashRefreshToken('raw-token'),
      );
      const created = tokens.create.mock.calls[0];
      expect(created[0]).toMatchObject({
        userId: 'user-1',
        familyId: 'family-1',
        tokenHash: hashRefreshToken(pair.refreshToken),
      });
      expect(created[1]).toBe(TX);
      expect(tokens.revokeIfActive).toHaveBeenCalledWith(
        'token-1',
        created[0].id,
        TX,
      );
      expect(pair.refreshToken).not.toBe('raw-token');
    });

    it('rejects unknown tokens', async () => {
      tokens.findByHash.mockResolvedValue(null);

      await expect(service.refresh('nope')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('revokes the whole family when a rotated token is reused', async () => {
      tokens.findByHash.mockResolvedValue(
        buildToken({ revokedAt: new Date() }),
      );

      await expect(service.refresh('raw-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token reuse detected'),
      );
      expect(tokens.revokeFamily).toHaveBeenCalledWith('family-1');
      expect(tokens.create).not.toHaveBeenCalled();
    });

    it('treats losing a concurrent rotation race as reuse', async () => {
      tokens.findByHash.mockResolvedValue(buildToken());
      users.findById.mockResolvedValue(buildUser());
      tokens.revokeIfActive.mockResolvedValue(false);

      await expect(service.refresh('raw-token')).rejects.toThrow(
        'Refresh token reuse detected',
      );
      expect(tokens.create).not.toHaveBeenCalled();
      expect(tokens.revokeFamily).toHaveBeenCalledWith('family-1');
    });

    it('rejects expired tokens', async () => {
      tokens.findByHash.mockResolvedValue(
        buildToken({ expiresAt: new Date(Date.now() - 1) }),
      );

      await expect(service.refresh('raw-token')).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it.each([null, buildUser({ isActive: false })])(
      'revokes the family when the user is gone or inactive (%p)',
      async (user) => {
        tokens.findByHash.mockResolvedValue(buildToken());
        users.findById.mockResolvedValue(user);

        await expect(service.refresh('raw-token')).rejects.toThrow(
          'Account is no longer active',
        );
        expect(tokens.revokeFamily).toHaveBeenCalledWith('family-1');
      },
    );
  });

  describe('logout', () => {
    const actor = { id: 'user-1', email: 'jane@acme.com', role: Role.Staff };

    it('revokes the token family of the caller', async () => {
      tokens.findByHash.mockResolvedValue(buildToken());

      await service.logout('raw-token', actor);

      expect(tokens.revokeFamily).toHaveBeenCalledWith('family-1');
    });

    it("ignores another user's token", async () => {
      tokens.findByHash.mockResolvedValue(buildToken({ userId: 'other' }));

      await service.logout('raw-token', actor);

      expect(tokens.revokeFamily).not.toHaveBeenCalled();
    });

    it('ignores unknown tokens', async () => {
      tokens.findByHash.mockResolvedValue(null);

      await expect(service.logout('nope', actor)).resolves.toBeUndefined();
    });
  });
});
