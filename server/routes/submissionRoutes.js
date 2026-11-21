const express = require("express");
const { gradeSubmission, mySubmissions } = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me", authorize("student"), mySubmissions);
router.patch("/:id/grade", authorize("instructor"), gradeSubmission);

module.exports = router;