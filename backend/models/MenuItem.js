const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    photo: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    prepTimeMinutes: {
      type: Number,
      default: 15,
    },
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, categoryId: 1 });

module.exports = mongoose.model("MenuItem", menuItemSchema);
