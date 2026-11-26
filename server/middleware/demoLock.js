// 🔒 Demo Lock: Demo Academy (password sab ke saamne) mein audience sab try kare
// lekin tod na sake (password reset / delete / class edit band).
// Naye / asal schools par KOI asar nahi.
const PUBLIC_SLUGS = ["demo"]; // City School / Aptech ke password ab sirf aap ke paas hain
// 🚪 Private institutes: koi ajnabi "Create an account" se khud student na ban sake
const CLOSED_SIGNUP = ["cityschool", "aptechkhi"];
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const User = require("../models/User");

// Ye kaam demo mein band hain (baaki sab khula)
const LOCKED = [
  ["PATCH", /^\/users\/me\/password$/], // apna password badalna (Ali ka password badla to sab ruk jayenge)
  ["PATCH", /^\/users\/[^/]+\/reset-password$/], // principal: kisi ka password reset
  ["PATCH", /^\/classes\/[^/]+$/], // class edit (subjects / class teacher hatana)
  ["DELETE", /^\/classes\/[^/]+$/], // class delete
  ["PATCH", /^\/organizations/], // institute settings
  ["PUT", /^\/organizations/],
  ["DELETE", /^\/organizations/],
];
// DELETE sab band, sirf ye khule (apne notes / notifications: inse demo nahi tootta)
const DELETE_OK = [/^\/my-notes/, /^\/notifications/];

const isLocked = (method, path) => {
  if (LOCKED.some(([m, re]) => m === method && re.test(path))) return true;
  if (method === "DELETE" && !DELETE_OK.some((re) => re.test(path))) return true;
  return false;
};

// Har baar taza dhoondo (seed dobara chale to demo ka ID badal jata hai).
// Ye sirf "khatarnak" kaam par chalta hai, is liye website slow nahi hoti.
const getLockedIds = async () => {
  const orgs = await Organization.find({ slug: { $in: PUBLIC_SLUGS } }).select("_id");
  return new Set(orgs.map((o) => String(o._id)));
};

// Token se institute nikalo (payload ka naam kuch bhi ho, phir bhi chale)
const orgOf = async (req) => {
  const raw = req.headers.authorization || req.headers["x-auth-token"] || "";
  const token = String(raw).replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const p = jwt.verify(token, process.env.JWT_SECRET);
  const org = p.organizationId || p.orgId || p.organization || p.user?.organizationId;
  if (org) return String(org);
  const uid = p.userId || p.id || p._id || p.user?._id || p.user?.id;
  if (!uid) return null;
  const u = await User.findById(uid).select("organizationId");
  return u?.organizationId ? String(u.organizationId) : null;
};

const demoLock = async (req, res, next) => {
  // 🩺 Check: https://skillverse-api.vercel.app/api/lock-status
  if (req.method === "GET" && req.path === "/lock-status") {
    return res.json({ demoLock: "active ✅", institutes: PUBLIC_SLUGS, closedSignup: CLOSED_SIGNUP });
  }
  // 🚪 City School / Aptech mein khud se account banana band (principal "Add user" se add karti hai)
  if (req.method === "POST" && /^\/auth\/register/i.test(req.path)) {
    const vals = Object.values(req.body || {}).filter((v) => typeof v === "string").map((v) => v.trim().toLowerCase());
    if (vals.some((v) => CLOSED_SIGNUP.includes(v))) {
      return res.status(403).json({ message: "🔒 This is a private institute. Please ask your school to add your account." });
    }
  }
  if (!isLocked(req.method, req.path)) return next();
  try {
    const org = await orgOf(req);
    const ids = await getLockedIds();
    if (org && ids.has(org)) {
      return res.status(403).json({ message: "🔒 This is a demo, so this action is locked. Everything else is open to try!" });
    }
  } catch (e) {
    console.error("demoLock:", e.message); // token ghalat ho to asal route khud jawab dega
  }
  next();
};

module.exports = demoLock;