const create_users      = require("./001_create_users");
const create_inventory  = require("./002_create_inventory");

/**
 * Runs all migrations in order.
 * Each migration is idempotent (uses IF NOT EXISTS / IF NOT EXISTS checks).
 */
async function runMigrations(pool) {
  console.log("🔄 Running migrations...");
  await create_users(pool);
  await create_inventory(pool);
  console.log("✅ All migrations complete");
}

module.exports = { runMigrations };
