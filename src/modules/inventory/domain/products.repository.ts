import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { TransactionContext } from '../../../common/persistence/unit-of-work';
import { NewProduct, Product, ProductChanges } from './product.entity';

export const PRODUCT_SORT_FIELDS = [
  'name',
  'sku',
  'price',
  'stock',
  'createdAt',
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export interface ProductListFilter {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

/** All reads ignore soft-deleted products unless stated otherwise. */
export abstract class ProductsRepository {
  abstract findById(
    id: string,
    tx?: TransactionContext,
  ): Promise<Product | null>;
  abstract findByIds(
    ids: string[],
    tx?: TransactionContext,
  ): Promise<Product[]>;
  abstract list(
    filter: ProductListFilter,
    page: PageRequest<ProductSortField>,
  ): Promise<Paginated<Product>>;
  abstract create(
    product: NewProduct,
    tx?: TransactionContext,
  ): Promise<Product>;
  abstract update(id: string, changes: ProductChanges): Promise<Product | null>;
  abstract softDelete(id: string): Promise<boolean>;
  /** Restores a soft-deleted product; null if there is none with that id. */
  abstract restore(id: string): Promise<Product | null>;
  /**
   * Atomically adds `delta` to the stock, including on soft-deleted products.
   * Returns the new stock, or null when the product does not exist or the
   * change would make stock negative.
   */
  abstract adjustStock(
    id: string,
    delta: number,
    tx: TransactionContext,
  ): Promise<number | null>;
}
