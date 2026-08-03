const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const roleCheck = require("../middleware/roleCheck");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", auth, authController.me);

// Account management
router.put("/profile", auth, tenant, authController.updateProfile);
router.post("/change-password", auth, authController.changePassword);
router.delete("/account", auth, tenant, roleCheck(["owner"]), authController.deleteAccount);

// Staff management (owner only)
router.get("/staff", auth, tenant, roleCheck(["owner"]), authController.getStaff);
router.post("/staff", auth, tenant, roleCheck(["owner"]), authController.createStaff);
router.put("/staff/:id", auth, tenant, roleCheck(["owner"]), authController.updateStaff);
router.delete("/staff/:id", auth, tenant, roleCheck(["owner"]), authController.deleteStaff);

module.exports = router;
