const express = require("express");
const {
  instructorDashboard, adminDashboard, searchStudents, studentQuickView, earlyWarning, remindEarly,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/instructor", authorize("instructor"), instructorDashboard);
router.get("/admin", authorize("orgadmin"), adminDashboard);
router.get("/admin/students", authorize("orgadmin"), searchStudents);
router.get("/admin/students/:id", authorize("orgadmin"), studentQuickView);
// 🔮 Early warning (teacher: apne courses, principal: poora school)
router.get("/early-warning", earlyWarning); // role check andar
router.post("/early-warning/remind", remindEarly);

module.exports = router;