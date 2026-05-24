/**
 * Migration 002 — Create inventory table
 */
async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id                    SERIAL PRIMARY KEY,
      user_id               INT REFERENCES users(id) ON DELETE CASCADE,

      -- Product info
      product_name          VARCHAR(200) NOT NULL,
      category              VARCHAR(100),
      store_city            VARCHAR(100),

      -- Quantity tracking
      qty_in                INT          DEFAULT 0,
      qty_sold              INT          DEFAULT 0,
      qty_remaining         INT          DEFAULT 0,
      qty_damaged           INT          DEFAULT 0,
      qty_adjusted          INT          DEFAULT 0,

      -- Pricing
      unit_price            NUMERIC(12,2) DEFAULT 0,

      -- Dates
      restock_date          DATE,
      expiry_date           DATE,
      days_to_expiry        INT,
      shelf_life_days       INT,

      -- Computed sales metrics
      weekly_sales_rate     NUMERIC(10,4) DEFAULT 0,
      sell_through_rate     NUMERIC(6,4)  DEFAULT 0,
      wastage_rate          NUMERIC(6,4)  DEFAULT 0,
      shelf_utilisation     NUMERIC(6,4)  DEFAULT 0,
      purchase_frequency    INT           DEFAULT 1,
      restock_count         INT           DEFAULT 1,

      -- ML prediction results
      expiry_risk           VARCHAR(20),
      sales_velocity        VARCHAR(20),
      customer_preference   VARCHAR(20),
      slow_mover            VARCHAR(5),
      prediction_confidence NUMERIC(5,2),
      recommendation        TEXT,

      created_at            TIMESTAMP DEFAULT NOW()
    );
  `);

  // Useful indexes for filtering
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_user_id    ON inventory(user_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_expiry_risk ON inventory(expiry_risk);
    CREATE INDEX IF NOT EXISTS idx_inventory_product     ON inventory(product_name);
  `);

  console.log("  ✔ inventory table ready");
}

module.exports = up;
