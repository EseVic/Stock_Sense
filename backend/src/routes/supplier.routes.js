const router             = require("express").Router();
const SupplierController = require("../controllers/supplier.controller");
const auth               = require("../middleware/auth");

router.get("/",  auth, SupplierController.getAll);
router.post("/",  auth, SupplierController.create);
router.put("/:id",  auth, SupplierController.update);
router.delete("/:id", auth, SupplierController.remove);

module.exports = router;
