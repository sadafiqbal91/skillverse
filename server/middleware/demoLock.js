// 🔒 Demo Lock: login page par jin institutes ke password sab ke saamne hain
// (Demo Academy, City School, Aptech), wahan audience sab try kare, lekin tod na sake.
// Naye / asal schools par KOI asar nahi.
const PUBLIC_SLUGS = ["demo", "cityschool", "aptechkhi"];
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");

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

const demoLock = async (req, res, next) => {
  try {
    if (!isLocked(req.method, req.path)) return next();
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return next();
    const { organizationId } = jwt.verify(token, process.env.JWT_SECRET);
    const ids = await getLockedIds();
    if (ids.has(String(organizationId))) {
      return res.status(403).json({ message: "🔒 This is a demo, so this action is locked. Everything else is open to try!" });
    }
    next();
  } catch (e) {
    next(); // token ghalat ho to asal route khud jawab dega
  }
};

module.exports = demoLock;