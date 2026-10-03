/**
 * Opaque handle to an open database transaction. Application code only passes
 * it between repositories; the infrastructure layer knows what is inside.
 */
export interface TransactionContext {
  readonly __brand: 'TransactionContext';
}

/** Port for running several repository calls atomically. */
export abstract class UnitOfWork {
  abstract run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
