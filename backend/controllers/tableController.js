const Table = require("../models/Table");
const Reservation = require("../models/Reservation");
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

    if (status) {
      const io = req.app.get("io");
      if (io) {
        io.to(`restaurant:${req.restaurantId}`).emit("table:statusChanged", table);
      }
    }

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

// Staff: tables available for a given date + time slot
exports.getAvailability = async (req, res) => {
  try {
    const { date, time, partySize } = req.query;
    if (!date || !time) {
      return res.status(400).json({ error: "date and time are required" });
    }

    const tables = await Table.find({
      restaurantId: req.restaurantId,
    }).sort("number");

    const conflicts = await Reservation.find({
      restaurantId: req.restaurantId,
      date: new Date(date),
      time,
      status: { $ne: "cancelled" },
      tableId: { $ne: null },
    }).select("tableId");

    const conflictIds = new Set(conflicts.map((c) => String(c.tableId)));
    const minParty = partySize ? parseInt(partySize, 10) : 0;

    const available = tables.filter((t) => {
      if (conflictIds.has(String(t._id))) return false;
      if (minParty > 0 && t.capacity < minParty) return false;
      return true;
    });

    res.json({ date, time, tables: available });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff: QR codes for all tables (print sheet)
exports.getPrintQRs = async (req, res) => {
  try {
    const tables = await Table.find({
      restaurantId: req.restaurantId,
    })
      .populate("restaurantId", "slug")
      .sort("number");

    if (tables.length === 0) {
      return res.json({ tables: [] });
    }

    const base = process.env.CLIENT_URL || "http://localhost:5173";
    const slug = tables[0].restaurantId.slug;

    const items = await Promise.all(
      tables.map(async (table) => {
        const url = `${base}/r/${slug}/table/${table.qrCodeToken}`;
        const qr = await QRCode.toDataURL(url);
        return {
          _id: table._id,
          number: table.number,
          capacity: table.capacity,
          url,
          qr,
        };
      })
    );

    res.json({ tables: items });
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
