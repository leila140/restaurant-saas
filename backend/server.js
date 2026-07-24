require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible in routes
app.set("io", io);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/restaurants", require("./routes/restaurants"));
app.use("/api/menu", require("./routes/menu"));
// TODO: uncomment as we build them
// app.use("/api/orders", require("./routes/orders"));
// app.use("/api/tables", require("./routes/tables"));
// app.use("/api/reservations", require("./routes/reservations"));

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join restaurant room
  socket.on("join:restaurant", (restaurantId) => {
    socket.join(`restaurant:${restaurantId}`);
    console.log(`${socket.id} joined restaurant:${restaurantId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
