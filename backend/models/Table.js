const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    qrCodeToken: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },
    status: {
      type: String,
      enum: ["free", "occupied", "reserved"],
      default: "free",
    },
    capacity: {
      type: Number,
      default: 4,
    },
  },
  { timestamps: true }
);

tableSchema.index({ restaurantId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Table", tableSchema);
