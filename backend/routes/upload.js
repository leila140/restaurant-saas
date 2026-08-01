const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");

router.post(
  "/",
  auth,
  tenant,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  },
  (err, req, res, next) => {
    res.status(400).json({ error: err.message });
  }
);

module.exports = router;
