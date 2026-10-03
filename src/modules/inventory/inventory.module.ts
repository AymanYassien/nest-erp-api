import { Module } from '@nestjs/common';
import { CategoriesService } from './application/categories.service';
import { ProductsService } from './application/products.service';
import { StockService } from './application/stock.service';
import { CategoriesRepository } from './domain/categories.repository';
import { ProductsRepository } from './domain/products.repository';
import { StockMovementsRepository } from './domain/stock-movements.repository';
import { KnexCategoriesRepository } from './infrastructure/knex-categories.repository';
import { KnexProductsRepository } from './infrastructure/knex-products.repository';
import { KnexStockMovementsRepository } from './infrastructure/knex-stock-movements.repository';
import { CategoriesController } from './presentation/categories.controller';
import { ProductsController } from './presentation/products.controller';

@Module({
  controllers: [CategoriesController, ProductsController],
  providers: [
    CategoriesService,
    ProductsService,
    StockService,
    { provide: CategoriesRepository, useClass: KnexCategoriesRepository },
    { provide: ProductsRepository, useClass: KnexProductsRepository },
    {
      provide: StockMovementsRepository,
      useClass: KnexStockMovementsRepository,
    },
  ],
  // Orders reserve stock through the same ports.
  exports: [ProductsRepository, StockMovementsRepository],
})
export class InventoryModule {}
