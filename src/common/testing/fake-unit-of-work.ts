import { TransactionContext, UnitOfWork } from '../persistence/unit-of-work';

export const FAKE_TX = { __brand: 'TransactionContext' } as TransactionContext;

/** Runs the work immediately with a sentinel transaction handle. */
export class FakeUnitOfWork extends UnitOfWork {
  runs = 0;

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    this.runs += 1;
    return work(FAKE_TX);
  }
}
