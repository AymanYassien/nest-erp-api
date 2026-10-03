import { Inject } from '@nestjs/common';
import type { Knex } from 'knex';
import type { TransactionContext } from '../common/persistence/unit-of-work';
import { KNEX } from './database.constants';

/** Base for Knex repositories: resolves the active transaction or the pool. */
export abstract class KnexRepository {
  constructor(@Inject(KNEX) protected readonly knex: Knex) {}

  protected db(tx?: TransactionContext): Knex {
    return (tx as unknown as Knex.Transaction | undefined) ?? this.knex;
  }
}
