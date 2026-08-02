const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

// Client creates order (no auth)
router.post("/", orderController.createOrder);
router.get("/:id/track", orderController.getOrderStatus);

// Staff routes
router.get("/", auth, tenant, orderController.getOrders);
router.get("/stats", auth, tenant, orderController.getStats);
router.get(
  "/bills",
  auth,
  tenant,
  roleCheck(["owner", "manager", "server"]),
  orderController.getOpenBills
);
router.post(
  "/checkout",
  auth,
  tenant,
  roleCheck(["owner", "manager", "server"]),
  orderController.checkoutTable
);
router.get(
  "/receipts",
  auth,
  tenant,
  roleCheck(["owner", "manager", "server"]),
  orderController.getReceipts
);
router.get(
  "/receipt/:receiptNumber",
  auth,
  tenant,
  roleCheck(["owner", "manager", "server"]),
  orderController.getReceipt
);
router.get("/:id", auth, tenant, orderController.getOrder);
router.patch("/:id/status", auth, tenant, orderController.updateStatus);

module.exports = router;
