const create_users           = require("./001_create_users");
const create_inventory       = require("./002_create_inventory");
const create_suppliers       = require("./003_create_suppliers");
const create_purchase_orders = require("./004_create_purchase_orders");
const create_sales_history   = require("./005_create_sales_history");
const add_auth_tokens        = require("./006_add_auth_tokens");

/**
 * Runs all migrations in order.
 * Each migration is idempotent (uses IF NOT EXISTS / IF NOT EXISTS checks).
 */
async function runMigrations(pool) {
  console.log("🔄 Running migrations...");
  await create_users(pool);
  await create_inventory(pool);
  await create_suppliers(pool);
  await create_purchase_orders(pool);
  await create_sales_history(pool);
  await add_auth_tokens(pool);
  console.log("✅ All migrations complete");
}

module.exports = { runMigrations };
