const express = require("express");
const {
  createAssignment, listAssignments, submitAssignment, listSubmissions, deleteAssignment,
} = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.post("/", authorize("instructor"), createAssignment);
router.get("/", listAssignments);
router.delete("/:id", authorize("instructor"), deleteAssignment);
router.post("/:id/submissions", authorize("student"), submitAssignment);
router.get("/:id/submissions", authorize("instructor"), listSubmissions);

module.exports = router;