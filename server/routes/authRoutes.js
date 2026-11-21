const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { login, register, getMe } = require("../controllers/authController");

const router = express.Router();
router.post("/login", login);
router.post("/register", register);
router.get("/me", protect, getMe);


module.exports = router;