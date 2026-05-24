const { pool, memStore } = require("../db");

const SupplierModel = {
  async findAll(userId, useDB) {
    if (useDB) {
      const r = await pool.query(
        "SELECT * FROM suppliers WHERE user_id=$1 ORDER BY name ASC",
        [userId]
      );
      return r.rows;
    }
    return (memStore.suppliers || []).filter((s) => s.user_id === userId);
  },

  async findById(id, userId, useDB) {
    if (useDB) {
      const r = await pool.query(
        "SELECT * FROM suppliers WHERE id=$1 AND user_id=$2",
        [id, userId]
      );
      return r.rows[0] || null;
    }
    return (memStore.suppliers || []).find(
      (s) => s.id === parseInt(id) && s.user_id === userId
    ) || null;
  },

  async create(payload, useDB) {
    if (useDB) {
      const keys   = Object.keys(payload);
      const values = Object.values(payload);
      const cols   = keys.join(", ");
      const vars   = keys.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query(
        `INSERT INTO suppliers (${cols}) VALUES (${vars}) RETURNING *`,
        values
      );
      return r.rows[0];
    }
    if (!memStore.suppliers) memStore.suppliers = [];
    const item = { id: memStore.suppliers.length + 1, ...payload, created_at: new Date().toISOString() };
    memStore.suppliers.push(item);
    return item;
  },

  async update(id, userId, fields, useDB) {
    if (useDB) {
      const keys   = Object.keys(fields);
      const values = Object.values(fields);
      const sets   = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
      const r = await pool.query(
        `UPDATE suppliers SET ${sets} WHERE id=$${keys.length + 1} AND user_id=$${keys.length + 2} RETURNING *`,
        [...values, id, userId]
      );
      return r.rows[0] || null;
    }
    const idx = (memStore.suppliers || []).findIndex(
      (s) => s.id === parseInt(id) && s.user_id === userId
    );
    if (idx >= 0) Object.assign(memStore.suppliers[idx], fields);
    return memStore.suppliers[idx] || null;
  },

  async delete(id, userId, useDB) {
    if (useDB) {
      await pool.query(
        "DELETE FROM suppliers WHERE id=$1 AND user_id=$2",
        [id, userId]
      );
    } else {
      memStore.suppliers = (memStore.suppliers || []).filter(
        (s) => !(s.id === parseInt(id) && s.user_id === userId)
      );
    }
  },
};

module.exports = SupplierModel;
