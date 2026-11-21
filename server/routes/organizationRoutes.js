const express = require("express");
const { registerOrganization, checkSlug } = require("../controllers/organizationController");

const router = express.Router();

router.get("/check/:slug", checkSlug);
router.post("/register", registerOrganization);

module.exports = router;