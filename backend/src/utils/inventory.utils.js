/**
 * Builds a clean inventory payload from raw CSV/form input.
 * Derives all computed fields so controllers stay thin.
 */
function buildPayload(rec, userId) {
  const qty_in  = parseInt(rec.qty_in)      || 0;
  const qty_sold= parseInt(rec.qty_sold)    || 0;
  const qty_dmg = parseInt(rec.qty_damaged) || 0;
  const qty_adj = parseInt(rec.qty_adjusted)|| 0;
  const qty_rem = Math.max(0, qty_in - qty_sold - qty_dmg + qty_adj);
  const shelf_life = parseInt(rec.shelf_life_days) || 30;

  let days_to_expiry = parseInt(rec.days_to_expiry) || 0;
  if (rec.expiry_date) {
    const today = new Date();
    const exp   = new Date(rec.expiry_date);
    days_to_expiry = Math.max(0, Math.round((exp - today) / (1000 * 60 * 60 * 24)));
  }

  const restock_days =
    rec.restock_date && rec.expiry_date
      ? Math.max(1, Math.round((new Date(rec.expiry_date) - new Date(rec.restock_date)) / (1000 * 60 * 60 * 24)))
      : shelf_life;

  const weekly_sales_rate  = parseFloat((qty_sold / restock_days * 7).toFixed(4));
  const sell_through_rate  = qty_in ? parseFloat((qty_sold / qty_in).toFixed(4)) : 0;
  const wastage_rate       = qty_in ? parseFloat((qty_dmg  / qty_in).toFixed(4)) : 0;
  const shelf_utilisation  = parseFloat((1 - days_to_expiry / Math.max(shelf_life, 1)).toFixed(4));

  return {
    user_id:        userId,
    product_name:   rec.product_name,
    category:       rec.category       || "Other",
    qty_in,
    qty_sold,
    qty_remaining:  qty_rem,
    qty_damaged:    qty_dmg,
    qty_adjusted:   qty_adj,
    unit_price:     parseFloat(rec.unit_price || 0),
    restock_date:   rec.restock_date   || null,
    expiry_date:    rec.expiry_date    || null,
    days_to_expiry,
    shelf_life_days: shelf_life,
    weekly_sales_rate,
    sell_through_rate,
    wastage_rate,
    purchase_frequency: parseInt(rec.purchase_frequency) || 1,
    restock_count:      parseInt(rec.restock_count)      || 1,
    shelf_utilisation,
    store_city: rec.store_city || "Lagos",
  };
}

/**
 * Maps raw ML prediction output to flat DB-ready fields.
 */
function applyPredictions(preds = {}) {
  return {
    expiry_risk:          preds.expiry_risk?.label,
    sales_velocity:       preds.sales_velocity?.label,
    customer_preference:  preds.customer_preference?.label,
    slow_mover:           preds.slow_mover?.label,
    prediction_confidence: preds.expiry_risk?.confidence,
    recommendation:       Object.values(preds).map((p) => p.recommendation).join(" | "),
  };
}

module.exports = { buildPayload, applyPredictions };
