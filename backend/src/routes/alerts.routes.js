const router           = require("express").Router();
const AlertsController = require("../controllers/alerts.controller");
const cronAuth          = require("../middleware/cronAuth");

// Called by an external scheduler (GitHub Actions), not a logged-in user —
// so it uses cronAuth (shared secret) instead of the normal JWT auth middleware.
router.post("/alerts/run", cronAuth, AlertsController.runDailyAlerts);

module.exports = router;
