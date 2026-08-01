const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

// Owner routes (must be declared before /:slug)
router.get("/me", auth, tenant, restaurantController.getMyRestaurant);
router.put(
  "/me",
  auth,
  tenant,
  roleCheck(["owner"]),
  restaurantController.updateMyRestaurant
);

// Public: restaurant by slug
router.get("/:slug", restaurantController.getBySlug);

module.exports = router;
