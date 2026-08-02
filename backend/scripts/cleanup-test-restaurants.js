require("dotenv").config();
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const MenuCategory = require("../models/MenuCategory");
const MenuItem = require("../models/MenuItem");
const Table = require("../models/Table");
const Reservation = require("../models/Reservation");
const Order = require("../models/Order");
const Review = require("../models/Review");

const prefixes = ["tables-test", "tables-test2", "tables-test3", "bill-test"];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const regex = new RegExp("^(" + prefixes.join("|") + ")");
  const restaurants = await Restaurant.find({ slug: regex }).select("_id");
  const ids = restaurants.map((r) => r._id);
  console.log("restaurants to delete:", ids.length);
  if (ids.length === 0) {
    await mongoose.disconnect();
    return;
  }
  const [cats, items, tables, reservations, orders, reviews] =
    await Promise.all([
      MenuCategory.deleteMany({ restaurantId: { $in: ids } }),
      MenuItem.deleteMany({ restaurantId: { $in: ids } }),
      Table.deleteMany({ restaurantId: { $in: ids } }),
      Reservation.deleteMany({ restaurantId: { $in: ids } }),
      Order.deleteMany({ restaurantId: { $in: ids } }),
      Review.deleteMany({ restaurantId: { $in: ids } }),
    ]);
  console.log(
    "children removed:",
    cats.deletedCount,
    items.deletedCount,
    tables.deletedCount,
    reservations.deletedCount,
    orders.deletedCount,
    reviews.deletedCount
  );
  const users = await User.deleteMany({ restaurantId: { $in: ids } });
  console.log("users removed:", users.deletedCount);
  const r = await Restaurant.deleteMany({ _id: { $in: ids } });
  console.log("restaurants removed:", r.deletedCount);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
