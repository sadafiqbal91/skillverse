const mongoose = require("mongoose");
const dns = require("dns");

// Local par Google DNS (kuch internet providers MongoDB ka pata nahi dhoond paate)
if (!process.env.VERCEL) dns.setServers(["8.8.8.8", "1.1.1.1"]);

// 🔌 Ek hi connection, baar baar use (Vercel par server so kar jaagta hai)
const cached = global._mongo || (global._mongo = { conn: null, promise: null });

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log("✅ MongoDB connected");
        return m;
      })
      .catch((err) => {
        cached.promise = null; // agli dafa dobara koshish
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;