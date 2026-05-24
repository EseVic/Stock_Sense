const { pool, memStore } = require("../db");

const SalesHistoryModel = {
  async findAll({ userId, product, from, to, page, limit }, useDB) {
    const offset = (page - 1) * limit;
    if (useDB) {
      const params = [userId];
      let q = "SELECT * FROM sales_history WHERE user_id=$1";
      if (product) { q += ` AND product_name ILIKE $${params.length + 1}`; params.push(`%${product}%`); }
      if (from)    { q += ` AND sale_date >= $${params.length + 1}`; params.push(from); }
      if (to)      { q += ` AND sale_date <= $${params.length + 1}`; params.push(to); }
      q += ` ORDER BY sale_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [rows, count] = await Promise.all([
        pool.query(q, params),
        pool.query("SELECT COUNT(*) FROM sales_history WHERE user_id=$1", [userId]),
      ]);
      return { items: rows.rows, total: parseInt(count.rows[0].count) };
    }
    let items = (memStore.salesHistory || []).filter((s) => s.user_id === userId);
    if (product) items = items.filter((s) => s.product_name.toLowerCase().includes(product.toLowerCase()));
    return { items: items.slice(offset, offset + limit), total: items.length };
  },

  async getDailySummary(userId, days = 30, useDB) {
    if (useDB) {
      const r = await pool.query(
        `SELECT sale_date, SUM(qty_sold) AS total_qty, SUM(revenue) AS total_revenue, COUNT(*) AS entries
         FROM sales_history
         WHERE user_id=$1 AND sale_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
         GROUP BY sale_date
         ORDER BY sale_date ASC`,
        [userId]
      );
      return r.rows;
    }
    return [];
  },

  async getTopProducts(userId, days = 30, useDB) {
    if (useDB) {
      const r = await pool.query(
        `SELECT product_name, category,
                SUM(qty_sold) AS total_qty,
                SUM(revenue)  AS total_revenue
         FROM sales_history
         WHERE user_id=$1 AND sale_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
         GROUP BY product_name, category
         ORDER BY total_revenue DESC
         LIMIT 10`,
        [userId]
      );
      return r.rows;
    }
    return [];
  },

  async create(payload, useDB) {
    if (useDB) {
      const keys   = Object.keys(payload);
      const values = Object.values(payload);
      const cols   = keys.join(", ");
      const vars   = keys.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query(
        `INSERT INTO sales_history (${cols}) VALUES (${vars}) RETURNING *`,
        values
      );
      return r.rows[0];
    }
    if (!memStore.salesHistory) memStore.salesHistory = [];
    const item = {
      id: memStore.salesHistory.length + 1,
      ...payload,
      revenue: (payload.qty_sold || 0) * (payload.unit_price || 0),
      created_at: new Date().toISOString(),
    };
    memStore.salesHistory.push(item);
    return item;
  },

  async delete(id, userId, useDB) {
    if (useDB) {
      await pool.query(
        "DELETE FROM sales_history WHERE id=$1 AND user_id=$2",
        [id, userId]
      );
    } else {
      memStore.salesHistory = (memStore.salesHistory || []).filter(
        (s) => !(s.id === parseInt(id) && s.user_id === userId)
      );
    }
  },
};

module.exports = SalesHistoryModel;
