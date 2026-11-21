const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const User = require("../models/User");
const presets = require("../config/institutePresets");

const SLUG_OK = /^[a-z0-9-]{3,30}$/;

// GET /api/organizations/check/:slug → code free hai?
const checkSlug = async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  if (!SLUG_OK.test(slug)) return res.json({ available: false, reason: "Use 3 to 30 small letters, numbers or -" });
  const taken = await Organization.exists({ slug });
  res.json({ available: !taken, reason: taken ? "This code is already taken" : "" });
};

// POST /api/organizations/register → naya institute + pehla admin (aur seedha login)
const registerOrganization = async (req, res) => {
  try {
    const { name, slug, type, adminName, adminEmail, adminPassword } = req.body || {};
    if (!name || !slug || !type || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const code = String(slug).toLowerCase().trim();
    if (!SLUG_OK.test(code)) return res.status(400).json({ message: "Institute code: 3 to 30 small letters, numbers or -" });
    if (String(adminPassword).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const preset = presets[type];
    if (!preset) return res.status(400).json({ message: "Please choose a valid institute type" });

    if (await Organization.exists({ slug: code })) {
      return res.status(409).json({ message: "This institute code is already taken. Try another one." });
    }

    const org = await Organization.create({ name: name.trim(), slug: code, type, settings: preset });

    try {
      const admin = await User.create({
        organizationId: org._id,
        name: adminName.trim(),
        email: String(adminEmail).toLowerCase().trim(),
        password: adminPassword,
        role: "orgadmin",
      });

      const token = jwt.sign(
        { userId: admin._id, role: admin.role, organizationId: org._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "Institute registered ✅",
        token,
        user: { id: admin._id, name: admin.name, role: admin.role },
        organization: { name: org.name, slug: org.slug, type: org.type, settings: org.settings },
      });
    } catch (userError) {
      await Organization.findByIdAndDelete(org._id); // adhoora institute mat chhodo
      return res.status(400).json({ message: userError.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerOrganization, checkSlug };