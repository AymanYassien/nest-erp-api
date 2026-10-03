import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import {
  TransactionContext,
  UnitOfWork,
} from '../common/persistence/unit-of-work';
import { KNEX } from './database.constants';

@Injectable()
export class KnexUnitOfWork extends UnitOfWork {
  constructor(@Inject(KNEX) private readonly knex: Knex) {
    super();
  }

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    // knex commits when the callback resolves and rolls back when it throws.
    return this.knex.transaction((trx) =>
      work(trx as unknown as TransactionContext),
    );
  }
}
