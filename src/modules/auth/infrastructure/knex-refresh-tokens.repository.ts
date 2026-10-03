import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { KnexRepository } from '../../../database/knex-repository';
import { NewRefreshToken, RefreshToken } from '../domain/refresh-token.entity';
import { RefreshTokensRepository } from '../domain/refresh-tokens.repository';

interface RefreshTokenRow {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_id: string | null;
  created_at: Date;
}

@Injectable()
export class KnexRefreshTokensRepository
  extends KnexRepository
  implements RefreshTokensRepository
{
  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.knex<RefreshTokenRow>('refresh_tokens')
      .where({ token_hash: tokenHash })
      .first();
    return row ? toEntity(row) : null;
  }

  async create(
    token: NewRefreshToken,
    tx?: TransactionContext,
  ): Promise<RefreshToken> {
    const [row] = await this.db(tx)<RefreshTokenRow>('refresh_tokens')
      .insert({
        id: token.id,
        user_id: token.userId,
        family_id: token.familyId,
        token_hash: token.tokenHash,
        expires_at: token.expiresAt,
      })
      .returning('*');
    return toEntity(row);
  }

  async revokeIfActive(
    id: string,
    replacedById: string | null,
    tx?: TransactionContext,
  ): Promise<boolean> {
    // The `revoked_at IS NULL` condition makes the check-and-set atomic.
    const updated = await this.db(tx)<RefreshTokenRow>('refresh_tokens')
      .where({ id })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date(), replaced_by_id: replacedById });
    return updated === 1;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.knex<RefreshTokenRow>('refresh_tokens')
      .where({ family_id: familyId })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
  }
}

function toEntity(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedById: row.replaced_by_id,
    createdAt: row.created_at,
  };
}
