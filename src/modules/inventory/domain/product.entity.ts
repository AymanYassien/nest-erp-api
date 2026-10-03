export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewProduct = Pick<
  Product,
  'sku' | 'name' | 'description' | 'price' | 'stock' | 'categoryId'
>;

/** Stock is deliberately absent: it only changes through stock movements. */
export type ProductChanges = Partial<
  Pick<Product, 'sku' | 'name' | 'description' | 'price' | 'categoryId'>
>;
