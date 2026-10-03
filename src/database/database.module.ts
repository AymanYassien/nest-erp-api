import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import knex, { Knex } from 'knex';
import { UnitOfWork } from '../common/persistence/unit-of-work';
import { AppConfigService } from '../config/app-config.service';
import { KNEX } from './database.constants';
import { buildKnexConfig } from './knex.config';
import { KnexUnitOfWork } from './knex-unit-of-work';

@Global()
@Module({
  providers: [
    {
      provide: KNEX,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Knex =>
        knex(
          buildKnexConfig({
            DB_HOST: config.get('DB_HOST'),
            DB_PORT: config.get('DB_PORT'),
            DB_USER: config.get('DB_USER'),
            DB_PASSWORD: config.get('DB_PASSWORD'),
            DB_NAME: config.get('DB_NAME'),
          }),
        ),
    },
    { provide: UnitOfWork, useClass: KnexUnitOfWork },
  ],
  exports: [KNEX, UnitOfWork],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(KNEX) private readonly knex: Knex) {}

  async onApplicationShutdown(): Promise<void> {
    await this.knex.destroy();
  }
}
