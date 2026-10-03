import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('sku', 64).notNullable();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.decimal('price', 12, 2).notNullable();
    table.integer('stock').notNullable().defaultTo(0);
    table
      .uuid('category_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.timestamps(true, true);

    table.index(['category_id']);
    table.index(['name']);
  });

  // The database is the last line of defence against negative stock or prices.
  await knex.raw(
    'ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0)',
  );
  await knex.raw(
    'ALTER TABLE products ADD CONSTRAINT products_price_non_negative CHECK (price >= 0)',
  );
  // SKU is unique among live products, so a soft-deleted SKU can be reused.
  await knex.raw(
    'CREATE UNIQUE INDEX products_sku_unique ON products (sku) WHERE deleted_at IS NULL',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('products');
}
