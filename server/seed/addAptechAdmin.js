require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const org = await Organization.findOne({ slug: "aptechkhi" });
    if (!org) throw new Error("Aptech organization not found");

    const exists = await User.findOne({ organizationId: org._id, email: "admin@aptech.com" });
    if (exists) {
      console.log("✅ Admin already exists: admin@aptech.com");
    } else {
      await User.create({
        organizationId: org._id,
        name: "Mr. Imran",
        email: "admin@aptech.com",
        password: "admin123",
        role: "orgadmin",
      });
      console.log("✅ Aptech admin created: admin@aptech.com / admin123");
    }
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await mongoose.disconnect();
  }
})();