const Restaurant = require("../models/Restaurant");
const MenuCategory = require("../models/MenuCategory");
const MenuItem = require("../models/MenuItem");
const Review = require("../models/Review");

exports.getBySlug = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const categories = await MenuCategory.find({
      restaurantId: restaurant._id,
    }).sort("order");

    const items = await MenuItem.find({
      restaurantId: restaurant._id,
      isAvailable: true,
    });

    const reviewStats = await Review.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: "$menuItemId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    reviewStats.forEach((s) => {
      statsMap[s._id.toString()] = {
        avgRating: Math.round(s.avgRating * 10) / 10,
        reviewCount: s.reviewCount,
      };
    });

    const menu = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      order: cat.order,
      items: items
        .filter(
          (item) => item.categoryId.toString() === cat._id.toString()
        )
        .map((item) => {
          const stats = statsMap[item._id.toString()];
          if (!stats) return item;
          return {
            ...item.toObject(),
            avgRating: stats.avgRating,
            reviewCount: stats.reviewCount,
          };
        }),
    }));

    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo: restaurant.logo,
      address: restaurant.address,
      phone: restaurant.phone,
      openingHours: restaurant.openingHours,
      menu,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json({
      name: restaurant.name,
      slug: restaurant.slug,
      logo: restaurant.logo,
      address: restaurant.address,
      phone: restaurant.phone,
      openingHours: restaurant.openingHours,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateMyRestaurant = async (req, res) => {
  try {
    const { name, logo, address, phone, openingHours } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      {
        name: name.trim(),
        logo: logo || "",
        address: address || "",
        phone: phone || "",
        ...(Array.isArray(openingHours) && openingHours.length === 7
          ? {
              openingHours: openingHours.map((s) => ({
                day: s.day,
                open: s.open || "10:00",
                close: s.close || "22:00",
                closed: !!s.closed,
              })),
            }
          : {}),
      },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json({
      name: restaurant.name,
      slug: restaurant.slug,
      logo: restaurant.logo,
      address: restaurant.address,
      phone: restaurant.phone,
      openingHours: restaurant.openingHours,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
