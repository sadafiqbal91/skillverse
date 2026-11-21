const express = require("express");
const { makeDiagram } = require("../controllers/diagramController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.post("/", protect, authorize("instructor"), makeDiagram);

module.exports = router;