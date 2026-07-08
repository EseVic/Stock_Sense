const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");
const { buildAlerts } = require("../utils/alerts.utils");

const StatsController = {
  async getStats(req, res) {
    try {
      const items = await InventoryModel.findAllForUser(req.user.id, useDB);

      const total      = items.length;
      const highRisk   = items.filter(i => i.expiry_risk === "High" || i.expiry_risk === "Expired").length;
      const slowMovers = items.filter(i => i.slow_mover === "Yes").length;
      const revenue    = items.reduce((s,i) => s + parseFloat(i.unit_price||0) * parseInt(i.qty_sold||0), 0);

      // low stock: remaining <= 5 units OR <= 10% of qty_in
      const lowStock = items
        .filter(i => i.qty_remaining != null && i.qty_in > 0 &&
          (i.qty_remaining <= 5 || (i.qty_remaining / i.qty_in) <= 0.1))
        .map(i => ({
          product:   i.product_name,
          remaining: i.qty_remaining,
          qtyIn:     i.qty_in,
          pct:       Math.round((i.qty_remaining / i.qty_in) * 100)
        }));

      // Revenue by category
      const byCat = {};
      items.forEach(i => {
        byCat[i.category] = (byCat[i.category]||0) + parseFloat(i.unit_price||0) * parseInt(i.qty_sold||0);
      });
      const topCategories = Object.entries(byCat)
        .sort((a,b) => b[1]-a[1]).slice(0,7)
        .map(([name,rev]) => ({ name, revenue:Math.round(rev) }));

      // Risk & velocity distribution
      const byRisk = { Low:0, Medium:0, High:0, Expired:0 };
      const byVel  = { Slow:0, Moderate:0, Fast:0 };
      items.forEach(i => {
        if (i.expiry_risk    && byRisk[i.expiry_risk]    !== undefined) byRisk[i.expiry_risk]++;
        if (i.sales_velocity && byVel[i.sales_velocity]  !== undefined) byVel[i.sales_velocity]++;
      });

      // Alerts
      const alerts = buildAlerts(items);

      // Per-product stock value + risk, for the "all products" treemap on the
      // dashboard. Value = unit_price × qty_remaining (what's actually still
      // sitting on the shelf, not total qty_in). Items worth ₦0 are dropped
      // since a treemap can't size a block with zero value.
      //
      // Two things matter here:
      // 1. expiry_risk is literally the string "N/A" for non-perishables
      //    (no expiry_date at all), not empty/null — so it needs its own
      //    explicit "No Expiry" bucket instead of silently falling through.
      // 2. "size" (what the treemap actually lays out by) is a log scale of
      //    value, not raw value. Raw ₦ value lets one expensive slow-moving
      //    product (e.g. a ₦2.8M sack of rice) visually swallow the whole
      //    chart while cheap-but-expired items (e.g. a ₦7,500 pack of Gala)
      //    shrink to an invisible sliver — exactly backwards, since the
      //    cheap expired stuff is usually the more urgent problem. The log
      //    scale keeps relative size meaningful without letting one product
      //    dominate. The real ₦ value is kept separately for the label/tooltip.
      const productMap = items
        .map(i => {
          const value = Math.round(parseFloat(i.unit_price||0) * parseInt(i.qty_remaining||0));
          return {
            name:     i.product_name,
            category: i.category,
            value,
            size:     value > 0 ? Math.log10(value + 1) : 0,
            risk:     (i.expiry_risk && i.expiry_risk !== "N/A") ? i.expiry_risk : "No Expiry",
          };
        })
        .filter(p => p.value > 0);

      // ── Savings estimate ──────────────────────────────────────────────────
      // Potential loss = value of expired stock still sitting on shelf
      const expiredItems = items.filter(i => i.expiry_risk === "Expired");
      const potentialLoss = expiredItems.reduce((s, i) =>
        s + parseFloat(i.unit_price||0) * parseInt(i.qty_remaining||0), 0);

      // Savings from acting on High risk early (assume 60% of stock value saved if discounted)
      const highRiskItems = items.filter(i => i.expiry_risk === "High");
      const potentialSavings = highRiskItems.reduce((s, i) =>
        s + parseFloat(i.unit_price||0) * parseInt(i.qty_remaining||0) * 0.6, 0);

      // Slow mover capital tied up (money stuck in stock not moving)
      const slowMoverItems = items.filter(i => i.slow_mover === "Yes");
      const capitalTiedUp = slowMoverItems.reduce((s, i) =>
        s + parseFloat(i.unit_price||0) * parseInt(i.qty_remaining||0), 0);

      res.json({
        total, highRisk, slowMovers, revenue, lowStock,
        topCategories, byRisk, byVel, alerts, productMap,
        savings: {
          potentialLoss:    Math.round(potentialLoss),
          potentialSavings: Math.round(potentialSavings),
          capitalTiedUp:    Math.round(capitalTiedUp),
          expiredCount:     expiredItems.length,
          highRiskCount:    highRiskItems.length,
          slowMoverCount:   slowMoverItems.length,
        }
      });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = StatsController;
