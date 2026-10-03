import { plainToInstance } from 'class-transformer';
import { NormalizeEmail, ToBoolean, Trim } from './transforms';

class Sample {
  @NormalizeEmail()
  email: unknown;

  @Trim()
  name: unknown;

  @ToBoolean()
  flag: unknown;
}

const transform = (plain: Record<string, unknown>) =>
  plainToInstance(Sample, plain);

describe('validation transforms', () => {
  it('normalizes emails and trims strings', () => {
    expect(
      transform({ email: '  Jane@ACME.com ', name: '  Jane  ' }),
    ).toMatchObject({
      email: 'jane@acme.com',
      name: 'Jane',
    });
  });

  it('leaves non-strings untouched so validators can reject them', () => {
    expect(transform({ email: 42, name: null })).toMatchObject({
      email: 42,
      name: null,
    });
  });

  it.each([
    ['true', true],
    ['false', false],
    ['yes', 'yes'],
  ])('converts query flag %p to %p', (input, expected) => {
    expect(transform({ flag: input }).flag).toBe(expected);
  });
});
