const router                  = require("express").Router();
const PurchaseOrderController = require("../controllers/purchase_order.controller");
const auth                    = require("../middleware/auth");

router.get("/",           auth, PurchaseOrderController.getAll);
router.post("/",          auth, PurchaseOrderController.create);
router.patch("/:id",      auth, PurchaseOrderController.updateStatus);
router.delete("/:id",     auth, PurchaseOrderController.remove);

module.exports = router;
