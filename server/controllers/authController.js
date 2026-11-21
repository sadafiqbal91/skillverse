const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const User = require("../models/User");
const { notify } = require("../services/interventionService");

// "Test-Grammar- School" → "test-grammar-school" (capital aur space khud theek)
const normSlug = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").trim();

// Token + user info ek jagah banta hai (login aur register dono yahi use karte hain)
const authPayload = (user, org) => ({
  token: jwt.sign(
    { userId: user._id, role: user.role, organizationId: org._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  ),
  user: { id: user._id, name: user.name, role: user.role },
  organization: { name: org.name, slug: org.slug, type: org.type, settings: org.settings },
});

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { slug, email, password } = req.body || {};
    if (!slug || !email || !password) {
      return res.status(400).json({ message: "Institute code, email and password are required" });
    }

    const org = await Organization.findOne({ slug: normSlug(slug), isActive: true });
    if (!org) return res.status(401).json({ message: "Invalid login details" });

    const user = await User.findOne({ organizationId: org._id, email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid login details" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "Your account is disabled. Please contact your institute." });
    }

    res.json(authPayload(user, org));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/register  (sirf STUDENT apna account bana sakta hai)
const register = async (req, res) => {
  try {
    const { slug, name, email, password } = req.body || {};
    if (!slug || !name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (name.trim().length < 3) {
      return res.status(400).json({ message: "Please enter your full name" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const org = await Organization.findOne({ slug: normSlug(slug), isActive: true });
    if (!org) {
      return res.status(404).json({ message: "Institute code not found. Ask your institute for the correct code." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ organizationId: org._id, email: cleanEmail });
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists. Please sign in." });
    }

    // 🔐 Role hamesha "student". Koi body mein "orgadmin" bhej de tab bhi nahi chalega.
    const user = await User.create({
      organizationId: org._id,
      name: name.trim(),
      email: cleanEmail,
      password,
      role: "student",
    });

    // 🔔 Principal ko batao ke naya student aaya
    const admins = await User.find({ organizationId: org._id, role: "orgadmin" }).select("_id");
    await notify(org._id, admins.map((a) => a._id), {
      type: "new_student",
      title: `🆕 New student joined: ${user.name}`,
      message: `${user.email} created an account with your institute code. See them in Users.`,
      meta: { studentId: user._id },
    }).catch(() => {});

    res.status(201).json(authPayload(user, org));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists. Please sign in." });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findOne({
    _id: req.user.userId,
    organizationId: req.user.organizationId,
  }).populate("organizationId", "name slug type settings");
  res.json(user);
};

module.exports = { login, register, getMe };