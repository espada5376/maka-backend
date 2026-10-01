import db from "../../src/database/knex";

export async function cleanDatabase(): Promise<void> {
  await db.raw(`
    TRUNCATE TABLE
      notifications,
      events,
      order_items,
      orders,
      cart_items,
      carts,
      product_images,
      products,
      categories,
      stores,
      otp_deliveries,
      otp_verifications,
      sessions,
      users,
      insights
    CASCADE
  `);
}
