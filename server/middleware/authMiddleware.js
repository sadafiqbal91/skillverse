const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Login zaroori hai" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.userId,
      organizationId: decoded.organizationId,
      isActive: true,
    });
    if (!user) {
      return res.status(401).json({ message: "Account maujood nahi" });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      organizationId: user.organizationId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Card ghalat ya expire ho gaya" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Aapko is ki ijazat nahi" });
    }
    next();
  };
};

module.exports = { protect, authorize };