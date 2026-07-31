const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(
      "MongoDB connection failed. Si tu utilises MongoDB Atlas Free Tier (M0), vérifie que ton cluster n'est pas en pause : https://cloud.mongodb.com"
    );
    throw err;
  }
};

module.exports = connectDB;
