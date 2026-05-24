const router            = require("express").Router();
const PredictController = require("../controllers/predict.controller");
const auth              = require("../middleware/auth");

router.post("/predict", auth, PredictController.predict);
router.post("/predict/:id", auth, PredictController.predictOne);

module.exports = router;