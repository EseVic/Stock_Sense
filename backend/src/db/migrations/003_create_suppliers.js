/**
 * Migration 003 — Create suppliers table
 */
async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id           SERIAL PRIMARY KEY,
      user_id      INT REFERENCES users(id) ON DELETE CASCADE,
      name         VARCHAR(200) NOT NULL,
      contact_name VARCHAR(150),
      phone        VARCHAR(30),
      email        VARCHAR(150),
      city         VARCHAR(100),
      address      TEXT,
      category     VARCHAR(100),
      notes        TEXT,
      created_at   TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
  `);

  console.log("  ✔ suppliers table ready");
}

module.exports = up;
