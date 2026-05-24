const router                 = require("express").Router();
const SalesHistoryController = require("../controllers/sales_history.controller");
const auth                   = require("../middleware/auth");

router.get("/",         auth, SalesHistoryController.getAll);
router.get("/summary",  auth, SalesHistoryController.getSummary);
router.post("/",        auth, SalesHistoryController.create);
router.delete("/:id",   auth, SalesHistoryController.remove);

module.exports = router;
