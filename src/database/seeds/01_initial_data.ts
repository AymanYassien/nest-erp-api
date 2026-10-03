import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

/** Shared password for every seeded account. Development use only. */
export const SEED_PASSWORD = 'Password123!';

const users = [
  { email: 'admin@erp.local', full_name: 'Ada Admin', role: 'admin' },
  { email: 'manager@erp.local', full_name: 'Max Manager', role: 'manager' },
  { email: 'staff@erp.local', full_name: 'Sam Staff', role: 'staff' },
];

const categories = [
  { name: 'Electronics', description: 'Devices and accessories' },
  { name: 'Office Supplies', description: 'Paper, pens and desk items' },
  { name: 'Furniture', description: 'Desks, chairs and storage' },
];

const products = [
  {
    sku: 'ELEC-LAPTOP-14',
    name: '14" Laptop',
    price: 1199.0,
    stock: 25,
    category: 'Electronics',
  },
  {
    sku: 'ELEC-MONITOR-27',
    name: '27" 4K Monitor',
    price: 349.99,
    stock: 40,
    category: 'Electronics',
  },
  {
    sku: 'ELEC-KEYBOARD',
    name: 'Mechanical Keyboard',
    price: 89.5,
    stock: 120,
    category: 'Electronics',
  },
  {
    sku: 'OFF-PAPER-A4',
    name: 'A4 Paper (500 sheets)',
    price: 6.25,
    stock: 800,
    category: 'Office Supplies',
  },
  {
    sku: 'OFF-PEN-BLUE',
    name: 'Blue Ballpoint Pen (10 pack)',
    price: 4.99,
    stock: 500,
    category: 'Office Supplies',
  },
  {
    sku: 'FUR-CHAIR-ERGO',
    name: 'Ergonomic Office Chair',
    price: 279.0,
    stock: 15,
    category: 'Furniture',
  },
  {
    sku: 'FUR-DESK-STAND',
    name: 'Standing Desk',
    price: 529.0,
    stock: 8,
    category: 'Furniture',
  },
];

export async function seed(knex: Knex): Promise<void> {
  // Child tables first so foreign keys never block the reset.
  await knex.raw(
    'TRUNCATE stock_movements, order_items, orders, products, categories, refresh_tokens, users RESTART IDENTITY CASCADE',
  );

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const insertedUsers = await knex('users')
    .insert(users.map((u) => ({ ...u, password_hash: passwordHash })))
    .returning<{ id: string; role: string }[]>(['id', 'role']);
  const adminId = insertedUsers.find((u) => u.role === 'admin')?.id ?? null;

  const insertedCategories = await knex('categories')
    .insert(categories)
    .returning<{ id: string; name: string }[]>(['id', 'name']);
  const categoryIdByName = new Map(
    insertedCategories.map((c) => [c.name, c.id]),
  );

  const insertedProducts = await knex('products')
    .insert(
      products.map(({ category, ...p }) => ({
        ...p,
        category_id: categoryIdByName.get(category),
      })),
    )
    .returning<{ id: string; stock: number }[]>(['id', 'stock']);

  // Opening balances, so the movement history explains the current stock.
  await knex('stock_movements').insert(
    insertedProducts.map((p) => ({
      product_id: p.id,
      type: 'in',
      quantity: p.stock,
      stock_after: p.stock,
      reason: 'Opening balance',
      created_by: adminId,
    })),
  );
}
