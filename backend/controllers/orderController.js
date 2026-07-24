const Order = require("../models/Order");
const Table = require("../models/Table");

// Client creates an order (no auth required)
exports.createOrder = async (req, res) => {
  try {
    const { restaurantId, tableId, items } = req.body;

    if (!restaurantId || !tableId || !items?.length) {
      return res
        .status(400)
        .json({ error: "restaurantId, tableId, and items are required" });
    }

    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      restaurantId,
      tableId,
      items,
      totalPrice,
    });

    const populated = await order.populate("tableId", "number");

    // Emit via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit("order:new", populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff lists orders for their restaurant
exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { restaurantId: req.restaurantId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("tableId", "number")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff updates order status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "served",
      "paid",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { status },
      { new: true }
    ).populate("tableId", "number");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update table status based on order status
    if (status === "paid" || status === "cancelled") {
      await Table.findByIdAndUpdate(order.tableId._id, { status: "free" });
    } else if (status === "pending" || status === "preparing") {
      await Table.findByIdAndUpdate(order.tableId._id, { status: "occupied" });
    }

    // Emit via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant:${req.restaurantId}`).emit("order:statusChanged", order);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    }).populate("tableId", "number");

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
