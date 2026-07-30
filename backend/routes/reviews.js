const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");

// Public: create a review
router.post("/", reviewController.createReview);

// Staff: get popular items
router.get("/popular/:restaurantId", auth, tenant, reviewController.getPopularItems);

module.exports = router;
