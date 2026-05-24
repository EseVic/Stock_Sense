const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");

const StatsController = {
  async getStats(req, res) {
    try {
      const items = await InventoryModel.findAllForUser(req.user.id, useDB);

      const total      = items.length;
      const highRisk   = items.filter((i) => i.expiry_risk === "High" || i.expiry_risk === "Expired").length;
      const slowMovers = items.filter((i) => i.slow_mover === "Yes").length;
      const revenue    = items.reduce(
        (s, i) => s + parseFloat(i.unit_price || 0) * parseInt(i.qty_sold || 0),
        0
      );

      // Revenue by category
      const byCat = {};
      items.forEach((i) => {
        byCat[i.category] = (byCat[i.category] || 0) + parseFloat(i.unit_price || 0) * parseInt(i.qty_sold || 0);
      });
      const topCategories = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, rev]) => ({ name, revenue: Math.round(rev) }));

      // Risk & velocity distribution
      const byRisk = { Low: 0, Medium: 0, High: 0, Expired: 0 };
      const byVel  = { Slow: 0, Moderate: 0, Fast: 0 };
      items.forEach((i) => {
        if (i.expiry_risk && byRisk[i.expiry_risk] !== undefined) byRisk[i.expiry_risk]++;
        if (i.sales_velocity && byVel[i.sales_velocity] !== undefined) byVel[i.sales_velocity]++;
      });

      // Alerts
      const alerts = items
        .filter((i) => i.expiry_risk === "High" || i.expiry_risk === "Expired" || i.slow_mover === "Yes")
        .slice(0, 10)
        .map((i) => ({
          product:  i.product_name,
          type:     i.expiry_risk === "Expired" ? "Expired" : i.expiry_risk === "High" ? "Expiry Risk" : "Slow Mover",
          severity: i.expiry_risk === "Expired" ? "critical" : i.expiry_risk === "High" ? "high" : "medium",
          days:     i.days_to_expiry,
        }));

      res.json({ total, highRisk, slowMovers, revenue, topCategories, byRisk, byVel, alerts });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = StatsController;
