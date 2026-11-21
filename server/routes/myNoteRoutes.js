const express = require("express");
const { listMyNotes, createMyNote, updateMyNote, deleteMyNote, draftMyNote } = require("../controllers/myNoteController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("student"));

router.get("/", listMyNotes);
router.post("/ai", draftMyNote);
router.post("/", createMyNote);
router.patch("/:id", updateMyNote);
router.delete("/:id", deleteMyNote);

module.exports = router;