const mongoose = require("mongoose");

const menuCategorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

menuCategorySchema.index({ restaurantId: 1, order: 1 });

module.exports = mongoose.model("MenuCategory", menuCategorySchema);
