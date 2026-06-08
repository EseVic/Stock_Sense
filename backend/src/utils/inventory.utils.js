const DAY_MS = 24 * 60 * 60 * 1000;

// Convert date-only values safely.
// Using UTC prevents timezone differences from changing the day count.
function toUtcDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    );
  }

  const match = String(value)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const [, year, month, day] = match.map(Number);

  return Date.UTC(year, month - 1, day);
}

function calendarDaysBetween(startDate, endDate) {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);

  if (start === null || end === null) return null;

  return Math.round((end - start) / DAY_MS);
}

function calculateDaysToExpiry(expiryDate) {
  if (!expiryDate) return 9999;

  const today = new Date().toISOString().slice(0, 10);
  const days = calendarDaysBetween(today, expiryDate);

  return days === null ? 9999 : days;
}

function buildPayload(rec, userId) {
  const qty_in = parseInt(rec.qty_in, 10) || 0;
  const qty_sold = parseInt(rec.qty_sold, 10) || 0;
  const qty_dmg = parseInt(rec.qty_damaged, 10) || 0;
  const qty_adj = parseInt(rec.qty_adjusted, 10) || 0;

  const qty_rem = Math.max(
    0,
    qty_in -
      qty_sold -
      qty_dmg +
      qty_adj,
  );

  const shelf_life =
    rec.shelf_life_days !== undefined &&
    rec.shelf_life_days !== ""
      ? parseInt(rec.shelf_life_days, 10)
      : 30;

  // Expiry rules apply whenever an expiry date exists.
  const has_expiry = Boolean(rec.expiry_date);

  // Calculate shelf life automatically when manufacturing
  // and expiry dates are provided.
  let finalShelfLife = shelf_life;

  if (rec.manufacturing_date && rec.expiry_date) {
    const days = calendarDaysBetween(
      rec.manufacturing_date,
      rec.expiry_date,
    );

    if (days !== null && days > 0) {
      finalShelfLife = days;
    }
  }

  // Negative values must remain negative so an expired
  // product can be distinguished from a product expiring today.
  const days_to_expiry = has_expiry
    ? calculateDaysToExpiry(rec.expiry_date)
    : 9999;

  const calculatedRestockDays =
    rec.restock_date &&
    rec.expiry_date &&
    has_expiry
      ? calendarDaysBetween(
          rec.restock_date,
          rec.expiry_date,
        )
      : null;

  const restock_days =
    calculatedRestockDays !== null
      ? Math.max(1, calculatedRestockDays)
      : Math.max(finalShelfLife, 1);

  const weekly_sales_rate = Number(
    (
      (qty_sold / restock_days) *
      7
    ).toFixed(4),
  );

  const sell_through_rate = qty_in
    ? Number((qty_sold / qty_in).toFixed(4))
    : 0;

  const wastage_rate = qty_in
    ? Number((qty_dmg / qty_in).toFixed(4))
    : 0;

  const shelf_utilisation = has_expiry
    ? Number(
        (
          1 -
          days_to_expiry /
            Math.max(finalShelfLife, 1)
        ).toFixed(4),
      )
    : 0;

  return {
    user_id: userId,
    product_name: rec.product_name,
    category: rec.category || "Other",
    qty_in,
    qty_sold,
    qty_remaining: qty_rem,
    qty_damaged: qty_dmg,
    qty_adjusted: qty_adj,
    unit_price: parseFloat(rec.unit_price || 0),
    restock_date: rec.restock_date || null,
    expiry_date: rec.expiry_date || null,
    days_to_expiry,
    shelf_life_days: finalShelfLife,
    weekly_sales_rate,
    sell_through_rate,
    wastage_rate,
    purchase_frequency:
      parseInt(rec.purchase_frequency, 10) || 1,
    restock_count:
      parseInt(rec.restock_count, 10) || 1,
    shelf_utilisation,
    store_city: rec.store_city || "Lagos",
  };
}

function applyPredictions(preds = {}) {
  const priority = [
    "expiry_risk",
    "slow_mover",
    "sales_velocity",
    "customer_preference",
  ];

  let topRec = null;

  // Pick the most urgent recommendation.
  if (
    preds.expiry_risk?.label === "Expired" ||
    preds.expiry_risk?.label === "High"
  ) {
    topRec = preds.expiry_risk?.recommendation;
  } else if (preds.slow_mover?.label === "Yes") {
    topRec = preds.slow_mover?.recommendation;
  } else if (preds.sales_velocity?.label === "Slow") {
    topRec = preds.sales_velocity?.recommendation;
  } else if (preds.expiry_risk?.label === "Medium") {
    topRec = preds.expiry_risk?.recommendation;
  } else {
    for (const key of priority) {
      if (preds[key]?.recommendation) {
        topRec = preds[key].recommendation;
        break;
      }
    }
  }

  return {
    expiry_risk:
      preds.expiry_risk?.label || null,

    sales_velocity:
      preds.sales_velocity?.label || null,

    customer_preference:
      preds.customer_preference?.label || null,

    slow_mover:
      preds.slow_mover?.label || null,

    prediction_confidence:
      preds.expiry_risk?.confidence || null,

    recommendation:
      topRec || null,
  };
}

module.exports = {
  buildPayload,
  applyPredictions,
};