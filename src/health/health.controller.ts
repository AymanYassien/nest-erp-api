import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Knex } from 'knex';
import { Public } from '../common/decorators/public.decorator';
import { KNEX } from '../database/database.constants';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Inject(KNEX) private readonly knex: Knex) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity check' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: { status: 'ok', database: 'up', uptimeSeconds: 42 },
      },
    },
  })
  async check() {
    try {
      await this.knex.raw('select 1');
    } catch {
      throw new ServiceUnavailableException('Database is unreachable');
    }
    return {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
