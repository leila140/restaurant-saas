const Table = require("../models/Table");
const QRCode = require("qrcode");

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({
      restaurantId: req.restaurantId,
    }).sort("number");
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createTable = async (req, res) => {
  try {
    const { number, capacity } = req.body;
    if (!number) return res.status(400).json({ error: "Number is required" });

    const existing = await Table.findOne({
      restaurantId: req.restaurantId,
      number,
    });
    if (existing) {
      return res.status(409).json({ error: "Table number already exists" });
    }

    const table = await Table.create({
      restaurantId: req.restaurantId,
      number,
      capacity,
    });

    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { number, capacity, status } = req.body;
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { number, capacity, status },
      { new: true }
    );
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json({ message: "Table deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getQRCode = async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    }).populate("restaurantId", "slug");

    if (!table) return res.status(404).json({ error: "Table not found" });

    const url = `${process.env.CLIENT_URL || "http://localhost:5173"}/r/${table.restaurantId.slug}/table/${table.qrCodeToken}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    res.json({ tableNumber: table.number, url, qr: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Public: get table info by QR token
exports.getByToken = async (req, res) => {
  try {
    const table = await Table.findOne({
      qrCodeToken: req.params.token,
    }).populate("restaurantId", "name slug");

    if (!table) return res.status(404).json({ error: "Table not found" });

    res.json({
      _id: table._id,
      number: table.number,
      capacity: table.capacity,
      status: table.status,
      restaurantId: table.restaurantId._id,
      restaurantName: table.restaurantId.name,
      restaurantSlug: table.restaurantId.slug,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
