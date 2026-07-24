const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

// Public: create reservation
router.post("/", reservationController.createReservation);

// Staff routes
router.get("/", auth, tenant, reservationController.getReservations);
router.put(
  "/:id",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  reservationController.updateReservation
);
router.delete(
  "/:id",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  reservationController.deleteReservation
);

module.exports = router;
