/**
 * Migration 004 — Create purchase_orders table
 */
async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id              SERIAL PRIMARY KEY,
      user_id         INT REFERENCES users(id) ON DELETE CASCADE,
      supplier_id     INT REFERENCES suppliers(id) ON DELETE SET NULL,

      product_name    VARCHAR(200) NOT NULL,
      category        VARCHAR(100),
      quantity        INT          NOT NULL DEFAULT 1,
      unit_price      NUMERIC(12,2) DEFAULT 0,
      total_cost      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

      status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'received', 'cancelled')),

      order_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
      expected_date   DATE,
      received_date   DATE,

      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_po_user_id    ON purchase_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_po_supplier   ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders(status);
  `);

  console.log("  ✔ purchase_orders table ready");
}

module.exports = up;
