/**
 * Migration 007 — Store the full ML result for all four prediction tasks.
 */
async function up(pool) {
  await pool.query(`
    ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS prediction_details JSONB DEFAULT '{}'::jsonb;
  `);

  console.log("  ✔ inventory prediction details ready");
}

module.exports = up;
