/**
 * Migration 005 — Create sales_history table
 * Tracks daily sales log per product
 */
async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_history (
      id              SERIAL PRIMARY KEY,
      user_id         INT REFERENCES users(id) ON DELETE CASCADE,
      inventory_id    INT REFERENCES inventory(id) ON DELETE SET NULL,

      product_name    VARCHAR(200) NOT NULL,
      category        VARCHAR(100),
      store_city      VARCHAR(100),

      qty_sold        INT          NOT NULL DEFAULT 0,
      unit_price      NUMERIC(12,2) DEFAULT 0,
      revenue         NUMERIC(14,2) GENERATED ALWAYS AS (qty_sold * unit_price) STORED,

      sale_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sh_user_id      ON sales_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_sh_inventory_id ON sales_history(inventory_id);
    CREATE INDEX IF NOT EXISTS idx_sh_sale_date    ON sales_history(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sh_product      ON sales_history(product_name);
  `);

  console.log("  ✔ sales_history table ready");
}

module.exports = up;
