import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  BusinessRuleError,
  ConflictError,
  InsufficientStockError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../errors/domain.errors';
import { mockExecutionContext } from '../testing/mock-execution-context';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let response: { status: jest.Mock; json: jest.Mock };

  const handle = (exception: unknown) => {
    const host = mockExecutionContext({
      request: { method: 'POST', originalUrl: '/api/v1/things' },
      response,
    });
    filter.catch(exception, host);
    const body = response.json.mock.calls[0][0];
    return { status: response.status.mock.calls[0][0] as number, body };
  };

  const pgError = (code: string, constraint?: string) =>
    Object.assign(new Error('pg'), { code, constraint, severity: 'ERROR' });

  beforeEach(() => {
    response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('formats HttpExceptions with a consistent body', () => {
    const { status, body } = handle(new ForbiddenException('Nope'));

    expect(status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { statusCode: 403, code: 'FORBIDDEN', message: 'Nope' },
      meta: {
        method: 'POST',
        path: '/api/v1/things',
        timestamp: expect.any(String),
      },
    });
  });

  it('exposes validation messages as details', () => {
    const { status, body } = handle(
      new BadRequestException(['email must be an email']),
    );

    expect(status).toBe(400);
    expect(body.error).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: ['email must be an email'],
    });
  });

  it('handles HttpExceptions with a string response', () => {
    const { status, body } = handle(new HttpException('Teapot', 418));

    expect(status).toBe(418);
    expect(body.error.message).toBe('Teapot');
  });

  it('falls back to a generic code for unknown statuses', () => {
    const { body } = handle(new HttpException({ foo: 'bar' }, 499));

    expect(body.error.code).toBe('HTTP_ERROR');
    expect(body.error.message).toBe('Http Exception');
  });

  it.each([
    [new NotFoundError('Product', 'p1'), 404, 'NOT_FOUND'],
    [new NotFoundError('Product'), 404, 'NOT_FOUND'],
    [new ConflictError('Taken'), 409, 'CONFLICT'],
    [new InsufficientStockError('SKU-1', 5), 409, 'INSUFFICIENT_STOCK'],
    [
      new InvalidStatusTransitionError('delivered', 'pending'),
      409,
      'INVALID_STATUS_TRANSITION',
    ],
    [new BusinessRuleError('Nope'), 422, 'BUSINESS_RULE_VIOLATION'],
  ])('maps %p to %i', (error, expectedStatus, expectedCode) => {
    const { status, body } = handle(error);

    expect(status).toBe(expectedStatus);
    expect(body.error.code).toBe(expectedCode);
    expect(body.error.message).toBe(error.message);
  });

  it.each([
    ['23505', HttpStatus.CONFLICT, 'UNIQUE_VIOLATION'],
    ['23503', HttpStatus.BAD_REQUEST, 'FOREIGN_KEY_VIOLATION'],
    ['23514', HttpStatus.BAD_REQUEST, 'CHECK_VIOLATION'],
    ['22P02', HttpStatus.BAD_REQUEST, 'INVALID_INPUT'],
  ])('maps Postgres error %s', (code, expectedStatus, expectedCode) => {
    const { status, body } = handle(pgError(code, 'some_constraint'));

    expect(status).toBe(expectedStatus);
    expect(body.error.code).toBe(expectedCode);
  });

  it('includes the violated constraint name when available', () => {
    expect(
      handle(pgError('23505', 'users_email_unique')).body.error.message,
    ).toContain('users_email_unique');
  });

  it('omits the constraint name when Postgres does not provide one', () => {
    expect(handle(pgError('23503')).body.error.message).not.toContain('(');
  });

  it('hides unexpected Postgres errors behind a 500', () => {
    const { status, body } = handle(pgError('40001'));

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('hides unknown errors behind a 500 and logs them', () => {
    const { status, body } = handle(new Error('secret db password leak'));

    expect(status).toBe(500);
    expect(body.error.message).toBe('Internal server error');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('handles non-Error throwables', () => {
    expect(handle('weird').status).toBe(500);
  });
});
