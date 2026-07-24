const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");

router.get("/:slug", restaurantController.getBySlug);

module.exports = router;
