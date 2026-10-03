import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AppConfigService } from '../../../config/app-config.service';
import { PasswordHasher } from '../domain/password-hasher';

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.get('BCRYPT_ROUNDS'));
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
