const Review = require("../models/Review");

exports.createReview = async (req, res) => {
  try {
    const { restaurantId, menuItemId, orderId, tableNumber, rating, comment } =
      req.body;

    if (!restaurantId || !menuItemId || !orderId || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existing = await Review.findOne({ orderId, menuItemId });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Already reviewed this item for this order" });
    }

    const review = await Review.create({
      restaurantId,
      menuItemId,
      orderId,
      tableNumber,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getPopularItems = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { restaurantId: req.restaurantId } },
      {
        $group: {
          _id: "$menuItemId",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "menuitems",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          menuItemId: "$_id",
          name: "$item.name",
          avgRating: { $round: ["$avgRating", 1] },
          count: 1,
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
