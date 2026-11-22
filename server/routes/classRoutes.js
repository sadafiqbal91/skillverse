const express = require("express");
const { listClasses, createClass, updateClass, deleteClass } = require("../controllers/classController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, authorize("orgadmin"));

router.get("/", listClasses);
router.post("/", createClass);
router.patch("/:id", updateClass);
router.delete("/:id", deleteClass);

module.exports = router;