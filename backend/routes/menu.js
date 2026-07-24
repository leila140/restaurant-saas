const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

// Public: get full menu for admin view
router.get(
  "/:restaurantId",
  auth,
  tenant,
  menuController.getFullMenu
);

// Categories
router.get(
  "/:restaurantId/categories",
  auth,
  tenant,
  menuController.getCategories
);
router.post(
  "/:restaurantId/categories",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  menuController.createCategory
);
router.put(
  "/:restaurantId/categories/:id",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  menuController.updateCategory
);
router.delete(
  "/:restaurantId/categories/:id",
  auth,
  tenant,
  roleCheck(["owner"]),
  menuController.deleteCategory
);

// Items
router.get(
  "/:restaurantId/items",
  auth,
  tenant,
  menuController.getItems
);
router.post(
  "/:restaurantId/items",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  menuController.createItem
);
router.put(
  "/:restaurantId/items/:id",
  auth,
  tenant,
  roleCheck(["owner", "manager"]),
  menuController.updateItem
);
router.delete(
  "/:restaurantId/items/:id",
  auth,
  tenant,
  roleCheck(["owner"]),
  menuController.deleteItem
);

module.exports = router;
