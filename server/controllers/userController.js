const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");

const tempPassword = () => crypto.randomBytes(4).toString("hex"); // 8 easy characters

// POST /api/users → principal only
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, childEmails } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "Name, email, password and role are required" });
    if (!["instructor", "student", "parent"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    let children = [];
    if (role === "parent") {
      if (!Array.isArray(childEmails) || childEmails.length === 0) return res.status(400).json({ message: "Please add the child's email" });
      const kids = await User.find({
        organizationId: req.user.organizationId, role: "student",
        email: { $in: childEmails.map((e) => e.trim().toLowerCase()) },
      });
      if (kids.length !== childEmails.length) return res.status(400).json({ message: "Some children were not found in this institute" });
      children = kids.map((k) => k._id);
    }

    const user = await User.create({ organizationId: req.user.organizationId, name, email, password, role, children });
    res.status(201).json({
      message: `${name} added ✅`,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "This email already exists in your institute" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users?role=student&q=ali → principal and teacher
const listUsers = async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      const q = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
    }
    const users = await User.find(filter)
      .select("name email role isActive children createdAt")
      .populate("children", "name")
      .sort({ role: 1, name: 1 });
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/reset-password → principal: gives a temporary password
const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "orgadmin") return res.status(403).json({ message: "Principal accounts can't be reset here" });

        const temp = req.body?.password || tempPassword();
    if (temp.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    user.password = temp;
    await user.save();
    res.json({ message: `Password reset ✅ Share it privately with ${user.name}.`, tempPassword: temp });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/me/password → anyone: change own password
const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.userId).select("+password");
    const ok = user && (await bcrypt.compare(currentPassword, user.password));
    if (!ok) return res.status(400).json({ message: "Current password is not correct" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed ✅" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createUser, listUsers, resetPassword, changeMyPassword };