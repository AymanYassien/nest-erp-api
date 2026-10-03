import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersService } from './application/orders.service';
import { OrdersRepository } from './domain/orders.repository';
import { KnexOrdersRepository } from './infrastructure/knex-orders.repository';
import { OrdersController } from './presentation/orders.controller';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: OrdersRepository, useClass: KnexOrdersRepository },
  ],
})
export class OrdersModule {}
