/**
 * Migration 001 — Create users table
 */
async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100)  NOT NULL,
      email      VARCHAR(150)  UNIQUE NOT NULL,
      password   VARCHAR(200)  NOT NULL,
      store_name VARCHAR(150),
      city       VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("  ✔ users table ready");
}

module.exports = up;
