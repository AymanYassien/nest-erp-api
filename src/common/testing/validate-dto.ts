import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/** Runs the same transform + validation as the global ValidationPipe. */
export async function validateDto<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<{ instance: T; errors: string[] }> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return {
    instance,
    errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
  };
}
