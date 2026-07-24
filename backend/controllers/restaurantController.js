const Restaurant = require("../models/Restaurant");
const MenuCategory = require("../models/MenuCategory");
const MenuItem = require("../models/MenuItem");

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

    const menu = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      order: cat.order,
      items: items.filter(
        (item) => item.categoryId.toString() === cat._id.toString()
      ),
    }));

    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo: restaurant.logo,
      address: restaurant.address,
      menu,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
