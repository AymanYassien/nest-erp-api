import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { PasswordHasher } from './domain/password-hasher';
import { UsersRepository } from './domain/users.repository';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { KnexUsersRepository } from './infrastructure/knex-users.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: KnexUsersRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
  ],
  exports: [UsersService, UsersRepository, PasswordHasher],
})
export class UsersModule {}
