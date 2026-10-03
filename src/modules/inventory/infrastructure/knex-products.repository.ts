import { Injectable } from '@nestjs/common';
import {
  mapPaginated,
  PageRequest,
  Paginated,
} from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { KnexRepository } from '../../../database/knex-repository';
import { paginate } from '../../../database/knex-paginate';
import { containsPattern } from '../../../database/like-pattern';
import { NewProduct, Product, ProductChanges } from '../domain/product.entity';
import {
  ProductListFilter,
  ProductSortField,
  ProductsRepository,
} from '../domain/products.repository';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  // pg returns NUMERIC as a string to avoid silent precision loss.
  price: string;
  stock: number;
  category_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMNS: Record<ProductSortField, string> = {
  name: 'name',
  sku: 'sku',
  price: 'price',
  stock: 'stock',
  createdAt: 'created_at',
};

@Injectable()
export class KnexProductsRepository
  extends KnexRepository
  implements ProductsRepository
{
  async findById(id: string, tx?: TransactionContext): Promise<Product | null> {
    const row = await this.active(tx).where({ id }).first();
    return row ? toEntity(row) : null;
  }

  async findByIds(ids: string[], tx?: TransactionContext): Promise<Product[]> {
    const rows = await this.active(tx).whereIn('id', ids);
    return rows.map(toEntity);
  }

  async list(
    filter: ProductListFilter,
    page: PageRequest<ProductSortField>,
  ): Promise<Paginated<Product>> {
    const query = this.active().select('*');
    if (filter.categoryId) query.where('category_id', filter.categoryId);
    if (filter.minPrice !== undefined)
      query.where('price', '>=', filter.minPrice);
    if (filter.maxPrice !== undefined)
      query.where('price', '<=', filter.maxPrice);
    if (filter.inStock === true) query.where('stock', '>', 0);
    if (filter.inStock === false) query.where('stock', 0);
    if (filter.search) {
      const pattern = containsPattern(filter.search);
      query.whereRaw('(name ILIKE ? OR sku ILIKE ?)', [pattern, pattern]);
    }
    const result = await paginate<ProductRow, ProductSortField>(
      query,
      page,
      SORT_COLUMNS,
      'id',
    );
    return mapPaginated(result, toEntity);
  }

  async create(product: NewProduct, tx?: TransactionContext): Promise<Product> {
    const [row] = await this.db(tx)<ProductRow>('products')
      .insert({
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: String(product.price),
        stock: product.stock,
        category_id: product.categoryId,
      })
      .returning('*');
    return toEntity(row);
  }

  async update(id: string, changes: ProductChanges): Promise<Product | null> {
    const [row] = await this.active()
      .where({ id })
      .update({
        sku: changes.sku,
        name: changes.name,
        description: changes.description,
        price: changes.price === undefined ? undefined : String(changes.price),
        category_id: changes.categoryId,
        updated_at: this.knex.fn.now() as unknown as Date,
      })
      .returning('*');
    return row ? toEntity(row) : null;
  }

  async softDelete(id: string): Promise<boolean> {
    const updated = await this.active()
      .where({ id })
      .update({ deleted_at: new Date(), updated_at: new Date() });
    return updated > 0;
  }

  async restore(id: string): Promise<Product | null> {
    const [row] = await this.knex<ProductRow>('products')
      .where({ id })
      .whereNotNull('deleted_at')
      .update({ deleted_at: null, updated_at: new Date() })
      .returning('*');
    return row ? toEntity(row) : null;
  }

  async adjustStock(
    id: string,
    delta: number,
    tx: TransactionContext,
  ): Promise<number | null> {
    // One conditional UPDATE: the row lock it takes serialises concurrent
    // writers, and the WHERE clause guarantees stock never goes negative.
    // Soft-deleted rows are included so a cancelled order can still restock.
    const [row] = await this.db(tx)<ProductRow>('products')
      .where({ id })
      .andWhere('stock', '>=', -delta)
      .update({
        stock: this.knex.raw('stock + ?', [delta]) as unknown as number,
        updated_at: new Date(),
      })
      .returning(['stock']);
    return row ? row.stock : null;
  }

  private active(tx?: TransactionContext) {
    return this.db(tx)<ProductRow>('products').whereNull('deleted_at');
  }
}

function toEntity(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    categoryId: row.category_id,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
