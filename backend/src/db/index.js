const { Pool } = require("pg");
const { db: dbConfig } = require("../config");
const bcrypt = require("bcryptjs");

// ── PostgreSQL pool ───────────────────────────────────────────────────────────
const pool = new Pool({
  ...dbConfig,
  ssl: {
    rejectUnauthorized: false, // required for Aiven/Reder hosted PostgreSQL
  },
});

let useDB = true;

pool.query("SELECT 1")
  .then(() => console.log("✅ Database Connected "))
  .catch(() => {
    console.log("⚠️  No PostgreSQL found — running in memory-only mode");
    useDB = false;
  });

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = {
  users: [
    {
      id: 1,
      name: "Demo User",
      email: "demo@stocksense.ng",
      password: bcrypt.hashSync("demo1234", 10),
      store_name: "Demo Store",
      city: "Lagos",
    },
  ],
  inventory: [],
  nextId: 1,
};

// ── DB Initialisation (runs migrations) ──────────────────────────────────────
async function initDB() {
  if (!useDB) return;
  try {
    const { runMigrations } = require("./migrations");
    await runMigrations(pool);
    console.log("✅ Database initialised");
  } catch (e) {
    console.error("DB init error:", e.message);
    useDB = false;
  }
}

module.exports = { pool, memStore, initDB, get useDB() { return useDB; } };
