const Order = require("../models/Order");
const Table = require("../models/Table");
const MenuItem = require("../models/MenuItem");
const MenuCategory = require("../models/MenuCategory");

// Staff: aggregate stats over the last N days
exports.getStats = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 30);
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      restaurantId: req.restaurantId,
      createdAt: { $gte: start, $lte: end },
    });

    const active = orders.filter((o) => o.status !== "cancelled");
    const revenueOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "served"
    );

    const totalRevenue = revenueOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = active.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const prepTimes = orders
      .filter((o) => o.status !== "pending" && o.status !== "cancelled")
      .map((o) => (o.updatedAt - o.createdAt) / 60000)
      .filter((t) => t > 0);
    const avgPrepTime =
      prepTimes.length > 0
        ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length
        : 0;

    // Revenue by day (fills gaps, server-local dates)
    const keyOf = (d) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };

    const revenueByDay = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      revenueByDay.push({ date: keyOf(day), revenue: 0 });
    }
    const dayIndex = {};
    revenueByDay.forEach((d, i) => {
      dayIndex[d.date] = i;
    });
    revenueOrders.forEach((o) => {
      const key = keyOf(o.createdAt);
      if (key in dayIndex) revenueByDay[dayIndex[key]].revenue += o.totalPrice;
    });

    // Top items by quantity
    const itemCounts = {};
    active.forEach((o) => {
      o.items?.forEach((it) => {
        itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
      });
    });
    const topItems = Object.entries(itemCounts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    // Revenue by category
    const items = await MenuItem.find({ restaurantId: req.restaurantId });
    const categories = await MenuCategory.find({ restaurantId: req.restaurantId });
    const catNames = {};
    categories.forEach((c) => {
      catNames[c._id.toString()] = c.name;
    });
    const itemCat = {};
    items.forEach((i) => {
      itemCat[i._id.toString()] = i.categoryId
        ? catNames[i.categoryId.toString()] || "Autre"
        : "Autre";
    });
    const catRevenue = {};
    revenueOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const cat = it.menuItemId
          ? itemCat[it.menuItemId.toString()] || "Autre"
          : "Autre";
        catRevenue[cat] = (catRevenue[cat] || 0) + it.price * it.quantity;
      });
    });
    const revenueByCategory = Object.entries(catRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const statusCounts = {
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      served: orders.filter((o) => o.status === "served").length,
      paid: orders.filter((o) => o.status === "paid").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };

    res.json({
      days,
      start,
      end,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      avgPrepTime: Math.round(avgPrepTime * 10) / 10,
      revenueByDay: revenueByDay.map((d) => ({
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
      })),
      topItems,
      revenueByCategory,
      statusCounts,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};


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

    // Mark table occupied
    const updatedTable = await Table.findByIdAndUpdate(
      tableId,
      { status: "occupied" },
      { new: true }
    );

    // Emit via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit("order:new", populated);
      if (updatedTable) {
        io.to(`restaurant:${restaurantId}`).emit("table:statusChanged", updatedTable);
      }
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
    let table;
    if (status === "paid" || status === "cancelled") {
      table = await Table.findByIdAndUpdate(
        order.tableId._id,
        { status: "free" },
        { new: true }
      );
    } else if (status === "pending" || status === "preparing") {
      table = await Table.findByIdAndUpdate(
        order.tableId._id,
        { status: "occupied" },
        { new: true }
      );
    }

    // Emit via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant:${req.restaurantId}`).emit("order:statusChanged", order);
      if (table) {
        io.to(`restaurant:${req.restaurantId}`).emit("table:statusChanged", table);
      }
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

// Public: track order status (no auth)
exports.getOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("tableId", "number");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      _id: order._id,
      status: order.status,
      totalPrice: order.totalPrice,
      tableNumber: order.tableId?.number,
      items: order.items,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
