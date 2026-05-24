const router              = require("express").Router();
const InventoryController = require("../controllers/inventory.controller");
const auth                = require("../middleware/auth");

router.get("/",       auth, InventoryController.getAll);
router.post("/",      auth, InventoryController.create);
router.delete("/:id", auth, InventoryController.remove);

module.exports = router;
