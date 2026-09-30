import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("notification_deliveries", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("notification_id")
      .notNullable()
      .references("id")
      .inTable("notifications")
      .onDelete("CASCADE");

    table
      .string("channel", 20)
      .notNullable()
      .defaultTo("whatsapp");

    table
      .string("status", 20)
      .notNullable()
      .defaultTo("pending");

    table
      .integer("attempts")
      .notNullable()
      .defaultTo(0);

    table
      .string("provider_message_id", 255)
      .nullable();

    table
      .timestamp("sent_at", { useTz: true })
      .nullable();

    table
      .timestamp("delivered_at", { useTz: true })
      .nullable();

    table
      .timestamp("read_at", { useTz: true })
      .nullable();

    table
      .timestamp("failed_at", { useTz: true })
      .nullable();

    table
      .string("error_code", 100)
      .nullable();

    table
      .text("error_message")
      .nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(
      ["notification_id", "channel"],
      "notification_deliveries_notification_channel_unique",
    );

    table.index(
      ["status", "created_at"],
      "notification_deliveries_status_created_idx",
    );

    table.index(
      ["provider_message_id"],
      "notification_deliveries_provider_message_idx",
    );

    table.check(
      "channel IN ('whatsapp')",
      [],
      "notification_deliveries_channel_check",
    );

    table.check(
      "status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed')",
      [],
      "notification_deliveries_status_check",
    );

    table.check(
      "attempts >= 0",
      [],
      "notification_deliveries_attempts_check",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("notification_deliveries");
}
