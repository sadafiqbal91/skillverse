// 🔔 Subject teacher ne kaam diya → class teacher ko khabar
const SchoolClass = require("../models/SchoolClass");
const Course = require("../models/Course");
const User = require("../models/User");
const { notify } = require("./interventionService");

const alertClassTeacher = async (organizationId, courseId, posterId, what) => {
  try {
    const classes = await SchoolClass.find({ organizationId, courseIds: courseId }).select("name classTeacherId");
    if (!classes.length) return;
    const [course, poster] = await Promise.all([
      Course.findById(courseId).select("title"),
      User.findById(posterId).select("name"),
    ]);
    for (const k of classes) {
      if (!k.classTeacherId || String(k.classTeacherId) === String(posterId)) continue; // apne kaam ki khabar khud ko nahi
      await notify(organizationId, [k.classTeacherId], {
        type: "class_update",
        title: "📚 " + k.name + " · " + (course?.title || "Subject"),
        message: (poster?.name || "A teacher") + " " + what,
        meta: { courseId },
      });
    }
  } catch (e) {
    // khabar na ja saki to asal kaam na ruke
  }
};

module.exports = { alertClassTeacher };