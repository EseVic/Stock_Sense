/**
 * Migration 006 — Add email verification and password reset columns to users table
 */
async function up(pool) {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_verified    BOOLEAN      DEFAULT false,
      ADD COLUMN IF NOT EXISTS verify_token   VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS verify_expires TIMESTAMPTZ  DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reset_token    VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reset_expires  TIMESTAMPTZ  DEFAULT NULL;
  `);

  // Mark all existing users as already verified so they are not locked out
  await pool.query(`
    UPDATE users SET is_verified = true WHERE is_verified = false OR is_verified IS NULL;
  `);

  console.log("  ✔ auth token columns added to users table");
}

module.exports = up;
