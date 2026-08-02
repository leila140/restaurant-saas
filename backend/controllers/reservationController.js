const Reservation = require("../models/Reservation");
const Table = require("../models/Table");

exports.createReservation = async (req, res) => {
  try {
    const { restaurantId, customerName, customerPhone, date, time, partySize } =
      req.body;

    if (!restaurantId || !customerName || !customerPhone || !date || !time || !partySize) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const reservationDate = new Date(date);
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      return res.status(400).json({ error: "Date cannot be in the past" });
    }

    const reservation = await Reservation.create({
      restaurantId,
      customerName,
      customerPhone,
      date: reservationDate,
      time,
      partySize,
    });

    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getReservations = async (req, res) => {
  try {
    const { date, status } = req.query;
    const filter = { restaurantId: req.restaurantId };
    if (date) filter.date = new Date(date);
    if (status) filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate("tableId", "number")
      .sort({ date: 1, time: 1 });

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const { tableId, status } = req.body;
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (tableId) {
      const table = await Table.findOne({
        _id: tableId,
        restaurantId: req.restaurantId,
      });
      if (!table) {
        return res.status(400).json({ error: "Table not found" });
      }
      if (reservation.partySize > table.capacity) {
        return res.status(409).json({
          error: `Cette table ne peut accueillir que ${table.capacity} personnes`,
        });
      }
      const conflict = await Reservation.findOne({
        restaurantId: req.restaurantId,
        tableId,
        date: reservation.date,
        time: reservation.time,
        status: { $ne: "cancelled" },
        _id: { $ne: reservation._id },
      });
      if (conflict) {
        return res.status(409).json({
          error: "Cette table est déjà réservée à ce créneau",
        });
      }
    }

    reservation.tableId = tableId ?? reservation.tableId;
    if (status) reservation.status = status;
    await reservation.save();
    const populated = await reservation.populate("tableId", "number");

    let table;
    if (tableId && status === "confirmed") {
      table = await Table.findByIdAndUpdate(
        tableId,
        { status: "reserved" },
        { new: true }
      );
    }
    if (reservation.tableId && status === "cancelled") {
      table = await Table.findByIdAndUpdate(
        reservation.tableId,
        { status: "free" },
        { new: true }
      );
    }

    const io = req.app.get("io");
    if (io && table) {
      io.to(`restaurant:${req.restaurantId}`).emit("table:statusChanged", table);
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    let table = null;
    if (reservation.tableId) {
      table = await Table.findByIdAndUpdate(
        reservation.tableId,
        { status: "free" },
        { new: true }
      );
    }

    const io = req.app.get("io");
    if (io && table) {
      io.to(`restaurant:${req.restaurantId}`).emit("table:statusChanged", table);
    }

    res.json({ message: "Reservation deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
