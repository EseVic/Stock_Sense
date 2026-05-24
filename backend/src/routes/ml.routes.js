const router       = require("express").Router();
const MLController = require("../controllers/ml.controller");
const auth         = require("../middleware/auth");

router.post("/train",   auth, MLController.train);
router.get("/metrics",  auth, MLController.metrics);

module.exports = router;
