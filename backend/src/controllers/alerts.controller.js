const UserModel      = require("../models/user.model");
const InventoryModel = require("../models/inventory.model");
const { useDB }      = require("../db");
const { buildAlerts } = require("../utils/alerts.utils");
const { sendAlertDigestEmail } = require("../services/email.service");

const AlertsController = {
  // Triggered by an external scheduler (see .github/workflows/daily-alerts.yml),
  // not by a logged-in user — this is what makes the alert "offline": the
  // person doesn't have to open StockSense for it to run.
  async runDailyAlerts(req, res) {
    try {
      const users = await UserModel.findAllUsers(useDB);

      let usersChecked = 0;
      let emailsSent    = 0;
      const failures    = [];

      for (const user of users) {
        usersChecked++;
        try {
          const items  = await InventoryModel.findAllForUser(user.id, useDB);
          const alerts = buildAlerts(items, 25); // full digest, not just top 10 like the in-app widget

          if (alerts.length === 0) continue;

          await sendAlertDigestEmail(
            user.email,
            user.name,
            user.store_name || "your store",
            alerts
          );
          emailsSent++;
        } catch (err) {
          failures.push({ userId: user.id, email: user.email, error: err.message });
        }
      }

      return res.json({ usersChecked, emailsSent, failures });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  },
};

module.exports = AlertsController;
