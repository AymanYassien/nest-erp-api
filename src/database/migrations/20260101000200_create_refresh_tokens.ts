import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    // All tokens issued from one login share a family; reuse revokes the family.
    table.uuid('family_id').notNullable();
    // SHA-256 of the opaque token; the raw value is never stored.
    table.string('token_hash', 64).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.uuid('replaced_by_id').nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['family_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('refresh_tokens');
}
