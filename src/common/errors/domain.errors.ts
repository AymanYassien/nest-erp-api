/**
 * Framework-agnostic errors thrown by domain and application code.
 * The global exception filter translates them into HTTP responses.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} '${id}' was not found` : `${resource} was not found`,
    );
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

/** A request that is well-formed but breaks a business rule. */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';

  constructor(sku: string, requested: number) {
    super(`Insufficient stock for product '${sku}' (requested ${requested})`);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(from: string, to: string) {
    super(`Cannot change order status from '${from}' to '${to}'`);
  }
}
