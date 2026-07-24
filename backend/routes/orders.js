const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");

// Client creates order (no auth)
router.post("/", orderController.createOrder);

// Staff routes
router.get("/", auth, tenant, orderController.getOrders);
router.get("/:id", auth, tenant, orderController.getOrder);
router.patch("/:id/status", auth, tenant, orderController.updateStatus);

module.exports = router;
