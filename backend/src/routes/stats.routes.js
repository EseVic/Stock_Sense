const router          = require("express").Router();
const StatsController = require("../controllers/stats.controller");
const auth            = require("../middleware/auth");

router.get("/stats", auth, StatsController.getStats);

module.exports = router;
