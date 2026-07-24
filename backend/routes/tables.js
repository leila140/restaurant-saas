const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

// Public: get table by QR token
router.get("/token/:token", tableController.getByToken);

// Staff routes
router.get("/", auth, tenant, tableController.getTables);
router.post(
  "/",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  tableController.createTable
);
router.put(
  "/:id",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  tableController.updateTable
);
router.delete(
  "/:id",
  auth,
  tenant,
  roleCheck(["owner"]),
  tableController.deleteTable
);
router.get(
  "/:id/qr",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  tableController.getQRCode
);

module.exports = router;
