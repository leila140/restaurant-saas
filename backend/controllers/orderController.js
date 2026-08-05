const Order = require("../models/Order");
const Table = require("../models/Table");
const Restaurant = require("../models/Restaurant");
const { isOpenNow } = require("../utils/hours");
const { sendSMS } = require("../services/notify");
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

    const effectiveTotal = (o) =>
      o.totalPrice * (1 - (o.discountPercent || 0) / 100) + (o.tip || 0);

    const totalRevenue = revenueOrders.reduce((s, o) => s + effectiveTotal(o), 0);
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
      if (key in dayIndex) revenueByDay[dayIndex[key]].revenue += effectiveTotal(o);
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
    const { restaurantId, tableId, items, customerPhone } = req.body;

    if (!restaurantId || !tableId || !items?.length) {
      return res
        .status(400)
        .json({ error: "restaurantId, tableId, and items are required" });
    }

    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    if (!isOpenNow(restaurant.openingHours)) {
      return res.status(409).json({ error: "Le restaurant est fermé" });
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
      customerPhone: customerPhone || "",
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

// Staff: orders for a date range (used for CSV export)
exports.exportOrders = async (req, res) => {
  try {
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 864e5);
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    toDate.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      restaurantId: req.restaurantId,
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .populate("tableId", "number")
      .sort({ createdAt: 1 });

    const rows = orders.map((order) => {
      const subtotal = order.totalPrice;
      const discountAmount = subtotal * ((order.discountPercent || 0) / 100);
      const totalPaid = subtotal - discountAmount + (order.tip || 0);
      return {
        id: order._id,
        createdAt: order.createdAt,
        tableNumber: order.tableId ? order.tableId.number : "",
        status: order.status,
        items: order.items
          .map((item) => `${item.quantity}x ${item.name}`)
          .join(" / "),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        discountPercent: order.discountPercent || 0,
        discountAmount: Math.round(discountAmount * 100) / 100,
        tip: order.tip || 0,
        totalPaid: Math.round(totalPaid * 100) / 100,
        paymentMethod: order.paymentMethod || "",
        receiptNumber: order.receiptNumber || "",
      };
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff: open bills grouped by table
exports.getOpenBills = async (req, res) => {
  try {
    const openOrders = await Order.find({
      restaurantId: req.restaurantId,
      status: { $nin: ["paid", "cancelled"] },
    }).populate("tableId", "number");

    const byTable = {};
    openOrders.forEach((order) => {
      const key = String(order.tableId._id);
      if (!byTable[key]) {
        byTable[key] = {
          tableId: order.tableId._id,
          tableNumber: order.tableId.number,
          orders: [],
          total: 0,
          count: 0,
        };
      }
      byTable[key].orders.push(order);
      byTable[key].total += order.totalPrice;
      byTable[key].count += 1;
    });

    const bills = Object.values(byTable).sort(
      (a, b) => a.tableNumber - b.tableNumber
    );
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff: mark all open orders for a table as paid and free the table
exports.checkoutTable = async (req, res) => {
  try {
    const { tableId, paymentMethod = "cash", discountPercent = 0, tip = 0 } =
      req.body;
    if (!tableId) {
      return res.status(400).json({ error: "tableId is required" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }
    const discount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    const tipAmount = Math.max(0, Number(tip) || 0);

    const table = await Table.findOne({
      _id: tableId,
      restaurantId: req.restaurantId,
    });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    const openOrders = await Order.find({
      restaurantId: req.restaurantId,
      tableId,
      status: { $nin: ["paid", "cancelled"] },
    });

    if (openOrders.length === 0) {
      return res.status(400).json({ error: "No open orders for this table" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $inc: { receiptCounter: 1 } },
      { new: true }
    );
    const receiptNumber = restaurant ? restaurant.receiptCounter : 0;
    const paidAt = new Date();

    await Order.updateMany(
      { _id: { $in: openOrders.map((o) => o._id) } },
      {
        status: "paid",
        paymentMethod,
        discountPercent: discount,
        tip: tipAmount,
        paidAt,
        receiptNumber,
      }
    );

    const freeTable = await Table.findByIdAndUpdate(
      tableId,
      { status: "free" },
      { new: true }
    );

    const subtotal = Math.round(
      openOrders.reduce((s, o) => s + o.totalPrice, 0) * 100
    ) / 100;
    const discountAmount =
      Math.round(subtotal * (discount / 100) * 100) / 100;
    const total = Math.round((subtotal - discountAmount + tipAmount) * 100) / 100;

    const receipt = {
      receiptNumber,
      tableId: table._id,
      tableNumber: table.number,
      paymentMethod,
      discountPercent: discount,
      discountAmount,
      tip: tipAmount,
      subtotal,
      total,
      paidAt,
      orders: openOrders,
    };

    const io = req.app.get("io");
    if (io) {
      openOrders.forEach((o) => {
        o.status = "paid";
        io.to(`restaurant:${req.restaurantId}`).emit("order:statusChanged", o);
      });
      io.to(`restaurant:${req.restaurantId}`).emit(
        "table:statusChanged",
        freeTable
      );
      io.to(`restaurant:${req.restaurantId}`).emit("orders:checkout", {
        tableId,
        receipt,
      });
    }

    res.json({ paid: openOrders.length, table: freeTable, receipt });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff: recent receipts, grouped by receipt number
exports.getReceipts = async (req, res) => {
  try {
    const paidOrders = await Order.find({
      restaurantId: req.restaurantId,
      status: "paid",
      receiptNumber: { $gt: 0 },
    }).populate("tableId", "number");

    const byReceipt = {};
    paidOrders.forEach((o) => {
      const key = String(o.receiptNumber);
      if (!byReceipt[key]) {
        byReceipt[key] = {
          receiptNumber: o.receiptNumber,
          tableNumber: o.tableId?.number,
          paymentMethod: o.paymentMethod,
          discountPercent: o.discountPercent || 0,
          tip: o.tip || 0,
          subtotal: 0,
          count: 0,
          paidAt: o.paidAt || o.updatedAt,
        };
      }
      const b = byReceipt[key];
      b.subtotal += o.totalPrice;
      b.count += 1;
    });

    const receipts = Object.values(byReceipt)
      .map((b) => {
        const discountAmount =
          Math.round(b.subtotal * (b.discountPercent / 100) * 100) / 100;
        return {
          ...b,
          subtotal: Math.round(b.subtotal * 100) / 100,
          discountAmount,
          total: Math.round((b.subtotal - discountAmount + b.tip) * 100) / 100,
        };
      })
      .sort((a, b2) => b2.receiptNumber - a.receiptNumber)
      .slice(0, 20);

    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Staff: single receipt detail by number
exports.getReceipt = async (req, res) => {
  try {
    const receiptNumber = parseInt(req.params.receiptNumber, 10);
    if (!receiptNumber || receiptNumber <= 0) {
      return res.status(400).json({ error: "Invalid receipt number" });
    }

    const restaurant = await Restaurant.findById(req.restaurantId);
    const orders = await Order.find({
      restaurantId: req.restaurantId,
      receiptNumber,
    }).populate("tableId", "number");

    if (orders.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const first = orders[0];
    const subtotal = Math.round(
      orders.reduce((s, o) => s + o.totalPrice, 0) * 100
    ) / 100;
    const discountPercent = first.discountPercent || 0;
    const discountAmount =
      Math.round(subtotal * (discountPercent / 100) * 100) / 100;
    const tip = first.tip || 0;
    const total = Math.round((subtotal - discountAmount + tip) * 100) / 100;

    res.json({
      receiptNumber,
      restaurant: {
        name: restaurant?.name || "",
        logo: restaurant?.logo || "",
        address: restaurant?.address || "",
        phone: restaurant?.phone || "",
      },
      tableNumber: first.tableId?.number,
      paymentMethod: first.paymentMethod,
      discountPercent,
      discountAmount,
      tip,
      subtotal,
      total,
      paidAt: first.paidAt || first.updatedAt,
      orders,
    });
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

    // Notify client by SMS when their order is ready
    if (status === "ready" && order.customerPhone) {
      try {
        await sendSMS({
          to: order.customerPhone,
          body: `Votre commande (Table ${order.tableId?.number || "?"}) est prête ! Bon appétit.`,
        });
      } catch (err) {
        console.error("Ready SMS error:", err.message);
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

const round2 = (n) => Math.round(n * 100) / 100;

// Staff: daily cash register report (Z-report) for a given date
exports.getDailyReport = async (req, res) => {
  try {
    const dateStr = req.query.date;
    const day = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    if (isNaN(day.getTime())) {
      return res.status(400).json({ error: "Invalid date (expected YYYY-MM-DD)" });
    }
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const paidOrders = await Order.find({
      restaurantId: req.restaurantId,
      status: "paid",
      paidAt: { $gte: start, $lte: end },
    }).populate("tableId", "number");

    const cancelledOrders = await Order.find({
      restaurantId: req.restaurantId,
      status: "cancelled",
      createdAt: { $gte: start, $lte: end },
    }).populate("tableId", "number");

    const byPaymentMethod = { cash: { count: 0, amount: 0 }, card: { count: 0, amount: 0 } };
    const byTable = {};
    const groups = new Map();
    let totalRevenue = 0;
    let discountTotal = 0;
    let tipTotal = 0;
    let itemCount = 0;
    const tickets = new Set();

    paidOrders.forEach((o) => {
      itemCount += (o.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
      const key =
        o.receiptNumber > 0 ? `r_${o.receiptNumber}` : `o_${String(o._id)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          orders: [],
          paymentMethod: o.paymentMethod,
          discountPercent: o.discountPercent || 0,
          tip: o.tip || 0,
          receiptNumber: o.receiptNumber,
        });
      }
      groups.get(key).orders.push(o);
    });

    groups.forEach((g) => {
      const subtotal = round2(
        g.orders.reduce((s, o) => s + o.totalPrice, 0)
      );
      const discountAmount =
        Math.round(subtotal * (g.discountPercent / 100) * 100) / 100;
      const total = round2(subtotal - discountAmount + g.tip);
      totalRevenue += total;
      discountTotal += discountAmount;
      tipTotal += g.tip;
      if (g.receiptNumber > 0) tickets.add(String(g.receiptNumber));

      const method = g.paymentMethod === "card" ? "card" : "cash";
      byPaymentMethod[method].count += 1;
      byPaymentMethod[method].amount += total;

      const tableNumber = g.orders[0].tableId?.number;
      const key = tableNumber ? String(tableNumber) : "Sans table";
      if (!byTable[key]) byTable[key] = { tableNumber, orders: 0, amount: 0 };
      byTable[key].orders += g.orders.length;
      byTable[key].amount += total;
    });

    const cancelledValue = cancelledOrders.reduce((s, o) => s + o.totalPrice, 0);

    res.json({
      date: dateStr || day.toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      totalRevenue: round2(totalRevenue),
      orderCount: paidOrders.length,
      ticketCount: tickets.size,
      averageTicket: tickets.size ? round2(totalRevenue / tickets.size) : 0,
      itemCount,
      discountTotal: round2(discountTotal),
      tipTotal: round2(tipTotal),
      cancelledCount: cancelledOrders.length,
      cancelledValue: round2(cancelledValue),
      byPaymentMethod: {
        cash: {
          count: byPaymentMethod.cash.count,
          amount: round2(byPaymentMethod.cash.amount),
        },
        card: {
          count: byPaymentMethod.card.count,
          amount: round2(byPaymentMethod.card.amount),
        },
      },
      byTable: Object.values(byTable)
        .map((t) => ({
          tableNumber: t.tableNumber,
          orders: t.orders,
          amount: round2(t.amount),
        }))
        .sort((a, b) => (a.tableNumber || 0) - (b.tableNumber || 0)),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
