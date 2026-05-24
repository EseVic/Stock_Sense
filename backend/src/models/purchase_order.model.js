const { pool, memStore } = require("../db");

const PurchaseOrderModel = {
  async findAll({ userId, status, page, limit }, useDB) {
    const offset = (page - 1) * limit;
    if (useDB) {
      const params = [userId];
      let q = `
        SELECT po.*, s.name AS supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.user_id=$1
      `;
      if (status) { q += ` AND po.status=$${params.length + 1}`; params.push(status); }
      q += ` ORDER BY po.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [rows, count] = await Promise.all([
        pool.query(q, params),
        pool.query(
          `SELECT COUNT(*) FROM purchase_orders WHERE user_id=$1${status ? " AND status=$2" : ""}`,
          status ? [userId, status] : [userId]
        ),
      ]);
      return { items: rows.rows, total: parseInt(count.rows[0].count) };
    }
    let items = (memStore.purchaseOrders || []).filter((o) => o.user_id === userId);
    if (status) items = items.filter((o) => o.status === status);
    return { items: items.slice(offset, offset + limit), total: items.length };
  },

  async create(payload, useDB) {
    if (useDB) {
      const keys   = Object.keys(payload);
      const values = Object.values(payload);
      const cols   = keys.join(", ");
      const vars   = keys.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query(
        `INSERT INTO purchase_orders (${cols}) VALUES (${vars}) RETURNING *`,
        values
      );
      return r.rows[0];
    }
    if (!memStore.purchaseOrders) memStore.purchaseOrders = [];
    const item = {
      id: memStore.purchaseOrders.length + 1,
      ...payload,
      total_cost: (payload.quantity || 0) * (payload.unit_price || 0),
      created_at: new Date().toISOString(),
    };
    memStore.purchaseOrders.push(item);
    return item;
  },

  async updateStatus(id, userId, { status, received_date, notes }, useDB) {
    if (useDB) {
      const r = await pool.query(
        `UPDATE purchase_orders
         SET status=$1, received_date=$2, notes=COALESCE($3, notes)
         WHERE id=$4 AND user_id=$5
         RETURNING *`,
        [status, received_date || null, notes || null, id, userId]
      );
      return r.rows[0] || null;
    }
    const idx = (memStore.purchaseOrders || []).findIndex(
      (o) => o.id === parseInt(id) && o.user_id === userId
    );
    if (idx >= 0) Object.assign(memStore.purchaseOrders[idx], { status, received_date, notes });
    return memStore.purchaseOrders[idx] || null;
  },

  async delete(id, userId, useDB) {
    if (useDB) {
      await pool.query(
        "DELETE FROM purchase_orders WHERE id=$1 AND user_id=$2",
        [id, userId]
      );
    } else {
      memStore.purchaseOrders = (memStore.purchaseOrders || []).filter(
        (o) => !(o.id === parseInt(id) && o.user_id === userId)
      );
    }
  },
};

module.exports = PurchaseOrderModel;
