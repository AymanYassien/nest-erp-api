import { Category } from '../domain/category.entity';
import { Product } from '../domain/product.entity';
import {
  StockMovement,
  StockMovementType,
} from '../domain/stock-movement.entity';

export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    sku: 'SKU-1',
    name: 'Widget',
    description: null,
    price: 10,
    stock: 5,
    categoryId: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-1',
    name: 'Tools',
    description: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function buildMovement(
  overrides: Partial<StockMovement> = {},
): StockMovement {
  return {
    id: 'movement-1',
    productId: 'product-1',
    type: StockMovementType.In,
    quantity: 5,
    stockAfter: 10,
    reason: null,
    orderId: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function mockProductsRepository() {
  return {
    findById: jest.fn(),
    findByIds: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    adjustStock: jest.fn(),
  };
}

export function mockStockMovementsRepository() {
  return { create: jest.fn(), list: jest.fn() };
}
