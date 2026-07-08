// Builds the same "at-risk" alert list used by the Notifications page,
// so anything emailed to a user matches exactly what they'd see if they
// logged in and checked the app themselves.
function buildAlerts(items, limit = 10) {
  return items
    .filter(i => i.expiry_risk === "High" || i.expiry_risk === "Expired" || i.slow_mover === "Yes")
    .slice(0, limit)
    .map(i => ({
      product:  i.product_name,
      type:     i.expiry_risk === "Expired" ? "Expired" : i.expiry_risk === "High" ? "Expiry Risk" : "Slow Mover",
      severity: i.expiry_risk === "Expired" ? "critical" : i.expiry_risk === "High" ? "high" : "medium",
      days:     i.days_to_expiry,
    }));
}

module.exports = { buildAlerts };
