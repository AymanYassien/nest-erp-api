import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stock_movements', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('RESTRICT');
    table
      .enu('type', ['in', 'out', 'adjustment'], {
        useNative: true,
        enumName: 'stock_movement_type',
      })
      .notNullable();
    // Signed change applied to products.stock (+ for in, - for out).
    table.integer('quantity').notNullable();
    table.integer('stock_after').notNullable();
    table.string('reason', 255).nullable();
    table
      .uuid('order_id')
      .nullable()
      .references('id')
      .inTable('orders')
      .onDelete('SET NULL');
    table
      .uuid('created_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['product_id', 'created_at']);
    table.index(['order_id']);
  });

  await knex.raw(
    'ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_quantity_non_zero CHECK (quantity <> 0)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('stock_movements');
  await knex.raw('DROP TYPE IF EXISTS stock_movement_type');
}
