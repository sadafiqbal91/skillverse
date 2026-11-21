const express = require("express");
const {
  instructorDashboard, adminDashboard, searchStudents, studentQuickView,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/instructor", authorize("instructor"), instructorDashboard);
router.get("/admin", authorize("orgadmin"), adminDashboard);
router.get("/admin/students", authorize("orgadmin"), searchStudents);
router.get("/admin/students/:id", authorize("orgadmin"), studentQuickView);

module.exports = router;