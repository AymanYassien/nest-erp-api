import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    // Emails are lower-cased by the application before they reach the DB.
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 120).notNullable();
    table
      .enu('role', ['admin', 'manager', 'staff'], {
        useNative: true,
        enumName: 'user_role',
      })
      .notNullable()
      .defaultTo('staff');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
  await knex.raw('DROP TYPE IF EXISTS user_role');
}
