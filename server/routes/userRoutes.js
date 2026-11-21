const express = require("express");
const { createUser, listUsers, resetPassword, changeMyPassword } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.patch("/me/password", changeMyPassword);
router.post("/", authorize("orgadmin"), createUser);
router.get("/", authorize("orgadmin", "instructor"), listUsers);
router.patch("/:id/reset-password", authorize("orgadmin"), resetPassword);

module.exports = router;