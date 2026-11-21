require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Course = require("../models/Course");
const Module = require("../models/Module");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const org = await Organization.findOne({ slug: "cityschool" });
    const course = await Course.findOne({ organizationId: org._id, title: "Computer: Class 5" });
    if (!course) throw new Error("Computer course not found");

    const mods = await Module.find({ courseId: course._id });
    for (const m of mods) {
      const clean = m.title.replace(/^Chapter\s*\d+\s*:\s*/i, "");
      if (clean !== m.title) {
        m.title = clean;
        await m.save();
        console.log("✅ Renamed to:", clean);
      }
    }
    console.log("Done.");
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await mongoose.disconnect();
  }
})();