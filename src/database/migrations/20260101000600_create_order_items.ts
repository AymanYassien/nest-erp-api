import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('order_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('order_id')
      .notNullable()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE');
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    // Price is copied at order time so later price changes do not rewrite history.
    table.decimal('unit_price', 12, 2).notNullable();
    table.decimal('line_total', 12, 2).notNullable();

    table.unique(['order_id', 'product_id']);
    table.index(['product_id']);
  });

  await knex.raw(
    'ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('order_items');
}
