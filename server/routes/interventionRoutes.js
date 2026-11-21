const express = require("express");
const { myInterventions, startRetest, listForCourse, sendNotes, sentNotes, myNotes } = require("../controllers/interventionController");
const { draftNotes } = require("../controllers/notesAiController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me", authorize("student"), myInterventions);
router.get("/notes/me", authorize("student"), myNotes);
router.get("/notes/sent", authorize("instructor"), sentNotes);
router.post("/notes/draft", authorize("instructor"), draftNotes);
router.post("/notes", authorize("instructor"), sendNotes);
router.get("/", authorize("instructor"), listForCourse);
router.post("/:id/retest", authorize("student"), startRetest);

module.exports = router;