const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, restaurantId: user.restaurantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, restaurantName } = req.body;

    if (!name || !email || !password || !restaurantName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const slug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingRestaurant = await Restaurant.findOne({ slug });
    if (existingRestaurant) {
      return res.status(409).json({ error: "Restaurant name already taken" });
    }

    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
    });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      restaurantId: restaurant._id,
      name,
      email,
      passwordHash,
      role: "owner",
    });

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: restaurant._id,
        restaurantSlug: restaurant.slug,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate("restaurantId");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId._id,
        restaurantSlug: user.restaurantId.slug,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const tokens = generateTokens(user);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-passwordHash")
      .populate("restaurantId", "name slug");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId._id,
      restaurantSlug: user.restaurantId.slug,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Staff management ──────────────────────────────────────────

exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ restaurantId: req.restaurantId })
      .select("-passwordHash")
      .sort({ role: 1, name: 1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["manager", "kitchen", "server"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      restaurantId: req.restaurantId,
      name,
      email,
      passwordHash,
      role,
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { name, email, role, isActive },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "Staff deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
