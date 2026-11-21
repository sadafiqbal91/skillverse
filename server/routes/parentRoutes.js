const express = require("express");
const { myChildren, childProgress, childOverview, attemptAnswers, childMode } = require("../controllers/parentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("parent"));

router.get("/me/children", myChildren);
router.get("/children/:id/progress", childProgress);
router.get("/children/:id/overview", childOverview);
router.get("/children/:id/attempts/:attemptId", attemptAnswers);
router.post("/children/:id/child-mode", childMode);

module.exports = router;