const { pool, memStore } = require("../db");

const InventoryModel = {
  async findAll({ userId, search, risk, page, limit }, useDB) {
    const offset = (page - 1) * limit;

    if (useDB) {
      const params = [userId];
      let q = "SELECT * FROM inventory WHERE user_id=$1";
      if (search) { q += ` AND product_name ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
      if (risk)   { q += ` AND expiry_risk=$${params.length + 1}`; params.push(risk); }
      q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [rows, count] = await Promise.all([
        pool.query(q, params),
        pool.query("SELECT COUNT(*) FROM inventory WHERE user_id=$1", [userId]),
      ]);
      return { items: rows.rows, total: parseInt(count.rows[0].count) };
    }

    let items = memStore.inventory.filter((i) => i.user_id === userId);
    if (search) items = items.filter((i) => i.product_name.toLowerCase().includes(search.toLowerCase()));
    if (risk)   items = items.filter((i) => i.expiry_risk === risk);
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  },

  async findByIds({ userId, ids }, useDB) {
    if (useDB) {
      const r = await pool.query(
        `SELECT * FROM inventory WHERE user_id=$1 ${ids?.length ? "AND id=ANY($2)" : ""}`,
        ids?.length ? [userId, ids] : [userId]
      );
      return r.rows;
    }
    return memStore.inventory.filter(
      (i) => i.user_id === userId && (!ids?.length || ids.includes(i.id))
    );
  },

  async create(payload, useDB) {
    if (useDB) {
      const keys   = Object.keys(payload);
      const values = Object.values(payload);
      const cols   = keys.join(", ");
      const vars   = keys.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query(
        `INSERT INTO inventory (${cols}) VALUES (${vars}) RETURNING *`,
        values
      );
      return r.rows[0];
    }
    const item = { id: memStore.nextId++, ...payload, created_at: new Date().toISOString() };
    memStore.inventory.push(item);
    return item;
  },

  async updatePredictions({ id, expiry_risk, sales_velocity, customer_preference, slow_mover, prediction_confidence, recommendation }, useDB) {
    if (useDB) {
      await pool.query(
        `UPDATE inventory
         SET expiry_risk=$1, sales_velocity=$2, customer_preference=$3,
             slow_mover=$4, prediction_confidence=$5, recommendation=$6
         WHERE id=$7`,
        [expiry_risk, sales_velocity, customer_preference, slow_mover, prediction_confidence, recommendation, id]
      );
    } else {
      const idx = memStore.inventory.findIndex((m) => m.id === id);
      if (idx >= 0) {
        Object.assign(memStore.inventory[idx], {
          expiry_risk, sales_velocity, customer_preference,
          slow_mover, prediction_confidence, recommendation,
        });
      }
    }
  },

  async delete({ id, userId }, useDB) {
    if (useDB) {
      await pool.query("DELETE FROM inventory WHERE id=$1 AND user_id=$2", [id, userId]);
    } else {
      memStore.inventory = memStore.inventory.filter(
        (i) => !(i.id === parseInt(id) && i.user_id === userId)
      );
    }
  },

  async findAllForUser(userId, useDB) {
    if (useDB) {
      const r = await pool.query("SELECT * FROM inventory WHERE user_id=$1", [userId]);
      return r.rows;
    }
    return memStore.inventory.filter((i) => i.user_id === userId);
  },
};

module.exports = InventoryModel;
