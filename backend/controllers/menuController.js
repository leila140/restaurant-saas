const MenuCategory = require("../models/MenuCategory");
const MenuItem = require("../models/MenuItem");

// ─── Categories ────────────────────────────────────────────────

exports.getCategories = async (req, res) => {
  try {
    const categories = await MenuCategory.find({
      restaurantId: req.restaurantId,
    }).sort("order");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, order } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const category = await MenuCategory.create({
      restaurantId: req.restaurantId,
      name,
      order: order ?? 0,
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, order } = req.body;
    const category = await MenuCategory.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { name, order },
      { new: true }
    );
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await MenuCategory.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });
    if (!category) return res.status(404).json({ error: "Category not found" });

    await MenuItem.deleteMany({
      categoryId: req.params.id,
      restaurantId: req.restaurantId,
    });

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Menu Items ────────────────────────────────────────────────

exports.getItems = async (req, res) => {
  try {
    const items = await MenuItem.find({
      restaurantId: req.restaurantId,
    }).populate("categoryId", "name order");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { categoryId, name, description, price, photo, prepTimeMinutes } =
      req.body;
    if (!categoryId || !name || price == null) {
      return res
        .status(400)
        .json({ error: "categoryId, name, and price are required" });
    }

    const item = await MenuItem.create({
      restaurantId: req.restaurantId,
      categoryId,
      name,
      description,
      price,
      photo,
      prepTimeMinutes,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { categoryId, name, description, price, photo, isAvailable, prepTimeMinutes } =
      req.body;
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId },
      { categoryId, name, description, price, photo, isAvailable, prepTimeMinutes },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Full menu (categories + items grouped) ────────────────────

exports.getFullMenu = async (req, res) => {
  try {
    const categories = await MenuCategory.find({
      restaurantId: req.restaurantId,
    }).sort("order");

    const items = await MenuItem.find({
      restaurantId: req.restaurantId,
    });

    const menu = categories.map((cat) => ({
      ...cat.toObject(),
      items: items.filter((item) => item.categoryId.toString() === cat._id.toString()),
    }));

    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
