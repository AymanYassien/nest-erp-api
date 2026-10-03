import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { RefreshTokensRepository } from './domain/refresh-tokens.repository';
import { KnexRefreshTokensRepository } from './infrastructure/knex-refresh-tokens.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: RefreshTokensRepository, useClass: KnexRefreshTokensRepository },
  ],
})
export class AuthModule {}
