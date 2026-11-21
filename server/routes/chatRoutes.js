const express = require("express");
const { myRooms, roomMessages, postMessage, approveAI, teacherAnswer, removeMessage } = require("../controllers/chatController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/rooms", myRooms);
router.get("/course/:courseId", roomMessages);
router.post("/course/:courseId", postMessage); // andar check hota hai kaun bhej sakta hai
router.patch("/:id/approve", authorize("instructor"), approveAI);
router.post("/:id/answer", authorize("instructor"), teacherAnswer);
router.delete("/:id", removeMessage);

module.exports = router;