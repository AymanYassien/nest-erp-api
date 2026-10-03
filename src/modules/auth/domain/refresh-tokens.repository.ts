import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { NewRefreshToken, RefreshToken } from './refresh-token.entity';

export abstract class RefreshTokensRepository {
  abstract findByHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract create(
    token: NewRefreshToken,
    tx?: TransactionContext,
  ): Promise<RefreshToken>;
  /**
   * Revokes the token only if it is still active. Returns false when another
   * request already revoked it, which callers must treat as token reuse.
   */
  abstract revokeIfActive(
    id: string,
    replacedById: string | null,
    tx?: TransactionContext,
  ): Promise<boolean>;
  abstract revokeFamily(familyId: string): Promise<void>;
}
