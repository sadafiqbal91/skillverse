const express = require("express");
const { listClasses, myClasses, myTurns, createClass, updateClass, deleteClass } = require("../controllers/classController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/mine", authorize("instructor"), myClasses); // 👩‍🏫 My Class + My Timetable
router.get("/turns", authorize("instructor"), myTurns); // ⚖️ Is hafte meri baari
router.get("/", authorize("orgadmin"), listClasses); // 🌳 School Tree
router.post("/", authorize("orgadmin"), createClass);
router.patch("/:id", authorize("orgadmin"), updateClass);
router.delete("/:id", authorize("orgadmin"), deleteClass);

module.exports = router;