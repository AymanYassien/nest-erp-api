import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { UnitOfWork } from '../../../common/persistence/unit-of-work';
import {
  AccessTokenPayload,
  AuthenticatedUser,
} from '../../../common/types/authenticated-user';
import { Role } from '../../../common/types/role.enum';
import { AppConfigService } from '../../../config/app-config.service';
import { UserResponseDto } from '../../users/application/dto/user-response.dto';
import { UsersService } from '../../users/application/users.service';
import { PasswordHasher } from '../../users/domain/password-hasher';
import { User } from '../../users/domain/user.entity';
import { UsersRepository } from '../../users/domain/users.repository';
import { isExpired, RefreshToken } from '../domain/refresh-token.entity';
import { RefreshTokensRepository } from '../domain/refresh-tokens.repository';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.util';

// A valid bcrypt hash compared against when the email is unknown, so a failed
// login takes the same time whether or not the account exists.
const TIMING_SAFE_DUMMY_HASH =
  '$2b$12$g7nwDGPvH6bSb2RwtQK6uOOxSEc3KR8WxobknEE0D21MicGdsxTRu';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly users: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Self-registration always yields the least privileged role.
    const user = await this.usersService.create({ ...dto, role: Role.Staff });
    return { user, tokens: await this.startSession(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    const passwordMatches = await this.passwordHasher.compare(
      dto.password,
      user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    return {
      user: UserResponseDto.fromEntity(user),
      tokens: await this.startSession(user),
    };
  }

  /**
   * Exchanges a refresh token for a new pair and revokes the old one.
   * Presenting a token that was already rotated means it leaked, so the whole
   * family (every descendant of that login) is revoked.
   */
  async refresh(rawToken: string): Promise<TokenPairDto> {
    const current = await this.refreshTokens.findByHash(
      hashRefreshToken(rawToken),
    );
    if (!current) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (current.revokedAt) {
      await this.refreshTokens.revokeFamily(current.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (isExpired(current)) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findById(current.userId);
    if (!user?.isActive) {
      await this.refreshTokens.revokeFamily(current.familyId);
      throw new UnauthorizedException('Account is no longer active');
    }

    const rotated = await this.rotate(current);
    if (!rotated) {
      // A concurrent request rotated this token first: treat it as reuse.
      await this.refreshTokens.revokeFamily(current.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return this.buildTokenPair(user, rotated);
  }

  /** Ends the session the token belongs to. Unknown tokens are ignored. */
  async logout(rawToken: string, actor: AuthenticatedUser): Promise<void> {
    const token = await this.refreshTokens.findByHash(
      hashRefreshToken(rawToken),
    );
    if (token?.userId === actor.id) {
      await this.refreshTokens.revokeFamily(token.familyId);
    }
  }

  private async startSession(user: Pick<User, 'id' | 'email' | 'role'>) {
    const rawToken = generateRefreshToken();
    await this.refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: this.refreshExpiry(),
    });
    return this.buildTokenPair(user, rawToken);
  }

  /** Returns the new raw token, or null if the current one was already revoked. */
  private rotate(current: RefreshToken): Promise<string | null> {
    return this.unitOfWork.run(async (tx) => {
      const nextId = randomUUID();
      const revoked = await this.refreshTokens.revokeIfActive(
        current.id,
        nextId,
        tx,
      );
      if (!revoked) return null;

      const rawToken = generateRefreshToken();
      await this.refreshTokens.create(
        {
          id: nextId,
          userId: current.userId,
          familyId: current.familyId,
          tokenHash: hashRefreshToken(rawToken),
          expiresAt: this.refreshExpiry(),
        },
        tx,
      );
      return rawToken;
    });
  }

  private async buildTokenPair(
    user: Pick<User, 'id' | 'email' | 'role'>,
    refreshToken: string,
  ): Promise<TokenPairDto> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
    };
  }

  private refreshExpiry(): Date {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS');
    return new Date(Date.now() + days * MS_PER_DAY);
  }
}
