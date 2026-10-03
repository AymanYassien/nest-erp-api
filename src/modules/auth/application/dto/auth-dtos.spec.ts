import { validateDto } from '../../../../common/testing/validate-dto';
import { LoginDto } from './login.dto';
import { RefreshTokenDto } from './refresh-token.dto';
import { RegisterDto } from './register.dto';

describe('auth DTOs', () => {
  it('normalizes the login email', async () => {
    const { instance, errors } = await validateDto(LoginDto, {
      email: 'ADMIN@erp.local',
      password: 'x',
    });

    expect(errors).toEqual([]);
    expect(instance.email).toBe('admin@erp.local');
  });

  it('does not accept a role on self-registration', async () => {
    const { errors } = await validateDto(RegisterDto, {
      email: 'new@acme.com',
      password: 'Passw0rd!',
      fullName: 'New User',
      role: 'admin',
    });

    expect(errors).toEqual(['property role should not exist']);
  });

  it('requires a plausible refresh token', async () => {
    const { errors } = await validateDto(RefreshTokenDto, {
      refreshToken: 'abc',
    });
    expect(errors).toHaveLength(1);
  });
});
