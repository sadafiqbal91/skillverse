const Notification = require("../models/Notification");

// GET /api/notifications/me
const myNotifications = async (req, res) => {
  const filter = { organizationId: req.user.organizationId, userId: req.user.userId };
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort("-createdAt").limit(30),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);
  res.json({ unread, notifications: items });
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Notification nahi mili" });
    res.json({ message: "Parh li ✅" });
  } catch (error) {
    res.status(400).json({ message: "Ghalat ID" });
  }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  const r = await Notification.updateMany({ userId: req.user.userId, isRead: false }, { isRead: true });
  res.json({ message: `${r.modifiedCount} notifications parh li ✅` });
};

module.exports = { myNotifications, markRead, markAllRead };