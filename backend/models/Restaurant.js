const mongoose = require("mongoose");

const openingHoursSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    open: {
      type: String,
      default: "10:00",
    },
    close: {
      type: String,
      default: "22:00",
    },
    closed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    openingHours: {
      type: [openingHoursSchema],
      default: () =>
        Array.from({ length: 7 }, (_, day) => ({
          day,
          open: "10:00",
          close: "22:00",
          closed: false,
        })),
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trial"],
      default: "trial",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
