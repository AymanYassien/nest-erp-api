import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table
      .enu(
        'status',
        ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        { useNative: true, enumName: 'order_status' },
      )
      .notNullable()
      .defaultTo('pending');
    table.decimal('total_amount', 12, 2).notNullable();
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.index(['user_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('orders');
  await knex.raw('DROP TYPE IF EXISTS order_status');
}
