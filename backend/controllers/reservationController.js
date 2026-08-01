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
    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { tableId, status },
      { new: true }
    ).populate("tableId", "number");

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (tableId && status === "confirmed") {
      await Table.findByIdAndUpdate(tableId, { status: "reserved" });
    }

    res.json(reservation);
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

    if (reservation.tableId) {
      await Table.findByIdAndUpdate(reservation.tableId, { status: "free" });
    }

    res.json({ message: "Reservation deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
