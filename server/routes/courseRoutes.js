const express = require("express");
const {
  createCourse, listCourses, getCourse, addModule, updateModule, addLesson, publishCourse,
} = require("../controllers/courseController");
const { enrollInCourse, getCertificate } = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.post("/", authorize("instructor"), createCourse);
router.get("/", listCourses);
router.get("/:id", getCourse);
router.post("/:id/modules", authorize("instructor"), addModule);
router.patch("/:id/modules/:moduleId", authorize("instructor"), updateModule);
router.post("/:id/modules/:moduleId/lessons", authorize("instructor"), addLesson);
router.patch("/:id/publish", authorize("instructor"), publishCourse);
router.post("/:id/enroll", authorize("student"), enrollInCourse);
router.get("/:id/certificate", authorize("student"), getCertificate);

module.exports = router;