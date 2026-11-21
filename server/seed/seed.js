require("dotenv").config();
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Intervention = require("../models/Intervention");
const Note = require("../models/Note");
const Notification = require("../models/Notification");
const presets = require("../config/institutePresets");
const { evaluateAttempt, notify } = require("../services/interventionService");

const DAY = 24 * 60 * 60 * 1000;
const ago = (d) => new Date(Date.now() - d * DAY);
const ahead = (d) => new Date(Date.now() + d * DAY);

// ---------- Helpers ----------
const makeOrg = (name, slug, type) => Organization.create({ name, slug, type, settings: presets[type] });

const makeUser = (org, name, email, password, role, children = []) =>
  User.create({ organizationId: org._id, name, email, password, role, children });

const makeCourse = async (org, instructor, title, description, outline) => {
  const topics = [...new Set(outline.flatMap((m) => m.lessons.map((l) => l.topic)))];
  const course = await Course.create({
    organizationId: org._id, instructorId: instructor._id, title, description, topics, status: "published",
  });
  const lessons = [];
  for (const [mi, m] of outline.entries()) {
    const mod = await Module.create({ organizationId: org._id, courseId: course._id, title: m.module, order: mi + 1 });
    for (const [li, l] of m.lessons.entries()) {
      lessons.push(await Lesson.create({
        organizationId: org._id, courseId: course._id, moduleId: mod._id,
        title: l.title, content: l.content, topics: [l.topic], durationMinutes: l.minutes || 12, order: li + 1,
      }));
    }
  }
  return { course, lessons };
};

const makeQuiz = async (org, course, title, questions) => {
  const quiz = await Quiz.create({
    organizationId: org._id, courseId: course._id, title, timeLimitMinutes: 15, questionsPerAttempt: questions.length,
  });
  await Question.insertMany(questions.map((q) => ({ ...q, organizationId: org._id, quizId: quiz._id })));
  return quiz;
};

const enroll = async (org, course, student, lessons, completed, lastActiveDaysAgo = 0) => {
  const done = lessons.slice(0, completed).map((l) => l._id);
  const e = await Enrollment.create({
    organizationId: org._id, courseId: course._id, studentId: student._id, completedLessons: done,
    progressPercent: Math.round((done.length / lessons.length) * 100),
    status: done.length === lessons.length ? "completed" : "active",
  });
  if (lastActiveDaysAgo) {
    await Enrollment.updateOne({ _id: e._id }, { $set: { updatedAt: ago(lastActiveDaysAgo) } }, { timestamps: false });
  }
};

// 🎭 mastery = { Topic: how many of its 3 questions are answered correctly }
const takeQuiz = async (org, quiz, student, mastery, daysAgo) => {
  const qs = await Question.find({ quizId: quiz._id }).select("+correctIndex topic options").sort("_id");
  const seen = {};
  const topics = {};
  let score = 0;
  const answers = qs.map((q) => {
    const i = (seen[q.topic] = (seen[q.topic] ?? -1) + 1);
    const right = i < (mastery[q.topic] || 0);
    if (right) score++;
    topics[q.topic] = topics[q.topic] || { correct: 0, total: 0 };
    topics[q.topic].total++;
    if (right) topics[q.topic].correct++;
    return { questionId: q._id, selectedIndex: right ? q.correctIndex : (q.correctIndex + 1) % q.options.length, isCorrect: right };
  });
  const when = ago(daysAgo);
  const percent = Math.round((score / qs.length) * 100);
  const attempt = await Attempt.create({
    organizationId: org._id, quizId: quiz._id, courseId: quiz.courseId, studentId: student._id, kind: "regular",
    questionIds: qs.map((q) => q._id), answers, score, total: qs.length, percent,
    passed: percent >= org.settings.passingMarks,
    topicScores: Object.entries(topics).map(([topic, t]) => ({
      topic, correct: t.correct, total: t.total, percent: Math.round((t.correct / t.total) * 100),
    })),
    status: "submitted", expiresAt: when, submittedAt: when,
  });
  await evaluateAttempt(attempt, org.settings.passingMarks);
};

const takeRetest = async (org, student, course, topic, pass) => {
  const iv = await Intervention.findOne({ studentId: student._id, courseId: course._id, topic, level: { $ne: "resolved" } });
  if (!iv) return;
  const quizIds = (await Quiz.find({ courseId: course._id }).select("_id")).map((q) => q._id);
  const qs = await Question.find({ quizId: { $in: quizIds }, topic }).select("+correctIndex options");
  const score = pass ? qs.length : 0;
  const percent = pass ? 100 : 0;
  const attempt = await Attempt.create({
    organizationId: org._id, courseId: course._id, studentId: student._id, kind: "retest", interventionId: iv._id,
    questionIds: qs.map((q) => q._id),
    answers: qs.map((q) => ({
      questionId: q._id, selectedIndex: pass ? q.correctIndex : (q.correctIndex + 1) % q.options.length, isCorrect: pass,
    })),
    score, total: qs.length, percent, passed: pass,
    topicScores: [{ topic, correct: score, total: qs.length, percent }],
    status: "submitted", expiresAt: new Date(), submittedAt: new Date(),
  });
  await evaluateAttempt(attempt, org.settings.passingMarks);
};

const sendNotes = async (org, teacher, course, topic, title, text) => {
  const ivs = await Intervention.find({ courseId: course._id, topic, level: { $in: ["intervention", "one_on_one"] } });
  const ids = ivs.map((i) => i.studentId);
  await Note.create({ organizationId: org._id, courseId: course._id, topic, title, text, createdBy: teacher._id, recipients: ids });
  for (const iv of ivs) {
    iv.notesSent = true;
    iv.history.push({ event: "notes_sent", percent: iv.latestPercent });
    await iv.save();
  }
  await notify(org._id, ids, {
    type: "notes_received",
    title: `📄 New notes: ${title}`,
    message: `Notes for ${topic} have arrived. Read them, then take the re-test.`,
    meta: { courseId: course._id, topic },
  });
};

// ---------- Question bank (3 per topic) ----------
const Q = (topic, list) => list.map(([text, options, correctIndex]) => ({ text, options, correctIndex, topic }));

const BANK = {
  Express: Q("Express", [
    ["Which HTTP method creates new data?", ["GET", "POST", "DELETE"], 1],
    ["What lets Express read JSON from req.body?", ["cors()", "express.json()", "dotenv"], 1],
    ["How does middleware pass control onward?", ["return", "next()", "stop()"], 1],
  ]),
  JWT: Q("JWT", [
    ["What does JWT stand for?", ["JSON Web Token", "Java Web Tool", "Just Web Text"], 0],
    ["How many parts does a JWT have?", ["3", "2", "5"], 0],
    ["What stops a JWT from being changed?", ["The signature", "The header", "The email"], 0],
  ]),
  Security: Q("Security", [
    ["How should passwords be stored?", ["Plain text", "Hashed with bcrypt", "Base64"], 1],
    ["Why show one message for every failed login?", ["Looks cleaner", "Prevents user enumeration", "It is faster"], 1],
    ["Why is the .env file kept out of GitHub?", ["It is too large", "It holds secrets", "It is not needed"], 1],
  ]),
  MongoDB: Q("MongoDB", [
    ["Which field keeps each institute's data separate?", ["organizationId", "_id", "__v"], 0],
    ["What does Mongoose populate() do?", ["Replaces an ID with the real document", "Deletes data", "Creates an index"], 0],
    ["Which index stops duplicate emails inside one institute?", ["organizationId + email", "name only", "No index"], 0],
  ]),
  JSX: Q("JSX", [
    ["What is JSX?", ["HTML-like syntax in JavaScript", "A database", "A CSS library"], 0],
    ["In JSX, the class attribute is written as...", ["class", "className", "cls"], 1],
    ["Component names should start with...", ["a lowercase letter", "a capital letter", "a number"], 1],
  ]),
  State: Q("State", [
    ["How do you update state?", ["With the useState setter", "Change it directly", "localStorage"], 0],
    ["Who passes props to a component?", ["Its parent", "Its child", "The browser"], 0],
    ["What happens when state changes?", ["The component re-renders", "Nothing", "The page reloads"], 0],
  ]),
  Hooks: Q("Hooks", [
    ["Which hook runs code after render?", ["useEffect", "useMemo", "useRef"], 0],
    ["An empty dependency array [] means the effect runs...", ["once after the first render", "on every render", "never"], 0],
    ["Hooks must be called...", ["at the top level of a component", "inside loops", "inside if blocks"], 0],
  ]),
  "Python Basics": Q("Python Basics", [
    ["Which keyword defines a function?", ["def", "func", "function"], 0],
    ["What does len([1, 2, 3]) return?", ["3", "2", "6"], 0],
    ["What type is (1, 2)?", ["tuple", "list", "dict"], 0],
  ]),
  Pandas: Q("Pandas", [
    ["Which pandas object is a 2D table?", ["DataFrame", "Series", "Array"], 0],
    ["Which method shows the first 5 rows?", ["head()", "top()", "first()"], 0],
    ["How do you read a CSV file?", ["pd.read_csv()", "pd.open()", "pd.csv()"], 0],
  ]),
  Plants: Q("Plants", [
    ["How do plants make their food?", ["Photosynthesis", "Digestion", "Sleeping"], 0],
    ["What do plants need to make food?", ["Sunlight, water and air", "Only soil", "Chocolate"], 0],
    ["Why are leaves green?", ["Chlorophyll", "Water", "Soil"], 0],
  ]),
  "Water Cycle": Q("Water Cycle", [
    ["Water turns into vapour because of...", ["Heat", "Cold", "Darkness"], 0],
    ["Clouds are made of...", ["Water vapour", "Smoke", "Dust"], 0],
    ["Rain is part of the...", ["Water cycle", "Food chain", "Solar system"], 0],
  ]),
  Fractions: Q("Fractions", [
    ["What is 1/2 + 1/4?", ["3/4", "2/6", "1/8"], 0],
    ["Which is bigger?", ["2/3", "1/2", "They are equal"], 0],
    ["Simplify 4/8", ["1/2", "2/3", "4/6"], 0],
  ]),
  Decimals: Q("Decimals", [
    ["0.5 is equal to...", ["1/2", "1/5", "5"], 0],
    ["What is 0.3 + 0.4?", ["0.7", "0.34", "7"], 0],
    ["Which is greater?", ["0.9", "0.45", "They are equal"], 0],
  ]),
};

// ---------- Main ----------
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("🧹 Clearing old data...");
  for (const M of [Organization, User, Course, Module, Lesson, Enrollment, Quiz, Question, Attempt, Assignment, Submission, Intervention, Note, Notification]) {
    await M.deleteMany({});
  }

  // ================= 💻 APTECH KARACHI =================
  console.log("💻 Creating Aptech Karachi...");
  const aptech = await makeOrg("Aptech Karachi", "aptechkhi", "computer_institute");
  await makeUser(aptech, "Hina Malik", "admin@aptech.com", "admin123", "orgadmin");
  const ahmed = await makeUser(aptech, "Sir Ahmed", "ahmed@aptech.com", "teach123", "instructor");
  const fatima = await makeUser(aptech, "Ms. Fatima", "fatima@aptech.com", "teach123", "instructor");
  const kamran = await makeUser(aptech, "Mr. Kamran", "kamran@aptech.com", "teach123", "instructor");

  const [sara, ali, bilal, ayesha, usman, hira, zain, maryam] = await Promise.all([
    makeUser(aptech, "Sara Khan", "sara@aptech.com", "stud123", "student"),
    makeUser(aptech, "Ali Raza", "ali@aptech.com", "stud123", "student"),
    makeUser(aptech, "Bilal Ahmed", "bilal@aptech.com", "stud123", "student"),
    makeUser(aptech, "Ayesha Noor", "ayesha@aptech.com", "stud123", "student"),
    makeUser(aptech, "Usman Tariq", "usman@aptech.com", "stud123", "student"),
    makeUser(aptech, "Hira Shah", "hira@aptech.com", "stud123", "student"),
    makeUser(aptech, "Zain Ali", "zain@aptech.com", "stud123", "student"),
    makeUser(aptech, "Maryam Iqbal", "maryam@aptech.com", "stud123", "student"),
  ]);

  const node = await makeCourse(aptech, ahmed, "Node.js & Express APIs", "Build secure REST APIs with authentication", [
    { module: "Module 1: Express Foundations", lessons: [
      { title: "What is Express?", topic: "Express", content: "Express is a small framework on top of Node.js that makes building web servers simple. You define routes, and each route runs a function when a request arrives." },
      { title: "Routes and Middleware", topic: "Express", content: "A route connects a URL and method to a function. Middleware runs in between, like a security guard, and calls next() to pass the request on." },
    ] },
    { module: "Module 2: Authentication", lessons: [
      { title: "Understanding JWT", topic: "JWT", content: "A JWT is a signed key card with three parts: header, payload and signature. Anyone can read it, but nobody can change it without breaking the signature." },
      { title: "Password Hashing", topic: "Security", content: "Never store plain passwords. bcrypt turns a password into a hash, like a juicer turns an orange into juice. You cannot turn the juice back into the orange." },
    ] },
    { module: "Module 3: Data with MongoDB", lessons: [
      { title: "Multi-tenant Data", topic: "MongoDB", content: "Every record carries an organizationId, so each institute only ever sees its own data. The key comes from the JWT, never from the request body." },
      { title: "Relations with populate()", topic: "MongoDB", content: "populate() swaps a stored ID for the real document, so a course can show its instructor's name instead of a long ID." },
    ] },
  ]);

  const react = await makeCourse(aptech, fatima, "React Fundamentals", "Components, state and hooks for modern UIs", [
    { module: "Module 1: Components", lessons: [
      { title: "Meet JSX", topic: "JSX", content: "JSX lets you write HTML-like markup inside JavaScript. Use className instead of class, and start component names with a capital letter." },
      { title: "Props and State", topic: "State", content: "Props come from the parent. State is a component's own memory. When state changes, React re-renders the component." },
    ] },
    { module: "Module 2: Hooks", lessons: [
      { title: "useEffect Explained", topic: "Hooks", content: "useEffect runs code after render. With an empty dependency array it runs once, which is perfect for loading data." },
      { title: "Rules of Hooks", topic: "Hooks", content: "Call hooks at the top level of your component, never inside loops or conditions, so React can keep track of them." },
    ] },
  ]);

  const python = await makeCourse(aptech, kamran, "Python for Data Analysis", "From Python basics to pandas DataFrames", [
    { module: "Module 1: Python Basics", lessons: [
      { title: "Variables and Types", topic: "Python Basics", content: "Python has lists, tuples and dictionaries. A tuple like (1, 2) cannot be changed after it is created." },
      { title: "Functions", topic: "Python Basics", content: "Use def to create a function. Functions keep your code short and reusable." },
    ] },
    { module: "Module 2: pandas", lessons: [
      { title: "DataFrames", topic: "Pandas", content: "A DataFrame is a table with rows and columns. Use head() to peek at the first five rows." },
      { title: "Reading CSV Files", topic: "Pandas", content: "pd.read_csv() loads a CSV file straight into a DataFrame, ready for analysis." },
    ] },
  ]);

  const nodeQ1 = await makeQuiz(aptech, node.course, "Express & Auth Quiz", [...BANK.Express, ...BANK.JWT]);
  const nodeQ2 = await makeQuiz(aptech, node.course, "Security & Database Quiz", [...BANK.Security, ...BANK.MongoDB]);
  const reactQ1 = await makeQuiz(aptech, react.course, "JSX & State Quiz", [...BANK.JSX, ...BANK.State]);
  const reactQ2 = await makeQuiz(aptech, react.course, "Hooks Quiz", [...BANK.Hooks]);
  const pyQ1 = await makeQuiz(aptech, python.course, "Python & pandas Quiz", [...BANK["Python Basics"], ...BANK.Pandas]);

  // Enrollments (last number = days since last activity)
  await enroll(aptech, node.course, sara, node.lessons, 6);
  await enroll(aptech, react.course, sara, react.lessons, 4);
  await enroll(aptech, node.course, ali, node.lessons, 4);
  await enroll(aptech, react.course, ali, react.lessons, 1);
  await enroll(aptech, node.course, bilal, node.lessons, 2, 12);
  await enroll(aptech, node.course, ayesha, node.lessons, 6);
  await enroll(aptech, react.course, ayesha, react.lessons, 0);
  await enroll(aptech, react.course, usman, react.lessons, 3);
  await enroll(aptech, python.course, hira, python.lessons, 3);
  await enroll(aptech, node.course, zain, node.lessons, 3);
  await enroll(aptech, python.course, zain, python.lessons, 2);
  await enroll(aptech, node.course, maryam, node.lessons, 1);

  // 🎭 Stories (oldest first)
  // Sara: the top student
  await takeQuiz(aptech, nodeQ1, sara, { Express: 2, JWT: 3 }, 28);
  await takeQuiz(aptech, reactQ1, sara, { JSX: 3, State: 2 }, 20);
  await takeQuiz(aptech, nodeQ1, sara, { Express: 3, JWT: 3 }, 14);
  await takeQuiz(aptech, nodeQ2, sara, { Security: 3, MongoDB: 3 }, 7);
  await takeQuiz(aptech, reactQ2, sara, { Hooks: 3 }, 3);

  // Ali: struggling with Express → live re-test demo
  await takeQuiz(aptech, nodeQ1, ali, { Express: 1, JWT: 2 }, 26);
  await takeQuiz(aptech, nodeQ1, ali, { Express: 1, JWT: 3 }, 18);
  await takeQuiz(aptech, nodeQ2, ali, { Security: 2, MongoDB: 3 }, 11);
  await takeQuiz(aptech, reactQ1, ali, { JSX: 3, State: 2 }, 8);
  await takeQuiz(aptech, nodeQ1, ali, { Express: 0, JWT: 3 }, 4);

  // Bilal: weak in JWT, failed re-test, inactive for 12 days → teacher must send notes
  await takeQuiz(aptech, nodeQ1, bilal, { Express: 3, JWT: 1 }, 20);
  await takeQuiz(aptech, nodeQ1, bilal, { Express: 2, JWT: 0 }, 12);
  await takeRetest(aptech, bilal, node.course, "JWT", false);

  // Ayesha: weak in Security → notes → passed. "Your notes worked"
  await takeQuiz(aptech, nodeQ1, ayesha, { Express: 3, JWT: 3 }, 22);
  await takeQuiz(aptech, nodeQ2, ayesha, { Security: 0, MongoDB: 3 }, 15);
  await takeRetest(aptech, ayesha, node.course, "Security", false);
  await sendNotes(aptech, ahmed, node.course, "Security", "Security Essentials",
    "1) Always hash passwords with bcrypt. 2) Show one message for any failed login. 3) Never push .env to GitHub.");
  await takeRetest(aptech, ayesha, node.course, "Security", true);

  // Usman: Hooks needs practice
  await takeQuiz(aptech, reactQ1, usman, { JSX: 3, State: 3 }, 16);
  await takeQuiz(aptech, reactQ2, usman, { Hooks: 1 }, 6);

  // Hira: pandas, failed re-test → Mr. Kamran must send notes
  await takeQuiz(aptech, pyQ1, hira, { "Python Basics": 3, Pandas: 1 }, 13);
  await takeRetest(aptech, hira, python.course, "Pandas", false);

  // Zain: average all-rounder
  await takeQuiz(aptech, nodeQ1, zain, { Express: 2, JWT: 2 }, 9);
  await takeQuiz(aptech, pyQ1, zain, { "Python Basics": 2, Pandas: 2 }, 5);

  // Maryam: just started, no quizzes yet (topics show as "Not started")

  const loginApi = await Assignment.create({
    organizationId: aptech._id, courseId: node.course._id, title: "Build a Login API",
    description: "Create a login route with Express, JWT and bcrypt.", topic: "Express", dueDate: ahead(4), maxMarks: 10,
  });
  await Submission.create({ organizationId: aptech._id, assignmentId: loginApi._id, courseId: node.course._id, studentId: sara._id, content: "Login route with JWT and bcrypt, plus validation.", status: "graded", marks: 9, feedback: "Excellent work! Clean error handling.", gradedAt: ago(1) });
  await Submission.create({ organizationId: aptech._id, assignmentId: loginApi._id, courseId: node.course._id, studentId: ali._id, content: "Login route returns a JWT.", fileUrl: "https://github.com/example/login-api" });
  await Submission.create({ organizationId: aptech._id, assignmentId: loginApi._id, courseId: node.course._id, studentId: zain._id, content: "Done, but no password hashing yet." });

  const todo = await Assignment.create({
    organizationId: aptech._id, courseId: react.course._id, title: "Todo App with Hooks",
    description: "Build a todo list using useState and useEffect.", topic: "Hooks", dueDate: ahead(6), maxMarks: 10,
  });
  await Submission.create({ organizationId: aptech._id, assignmentId: todo._id, courseId: react.course._id, studentId: usman._id, content: "Todo app with add, delete and filter." });

  await Assignment.create({
    organizationId: aptech._id, courseId: python.course._id, title: "Clean a Sales CSV",
    description: "Load sales.csv with pandas, remove empty rows and show the top 5 products.", topic: "Pandas", dueDate: ahead(5), maxMarks: 10,
  });

  // ================= 🏫 CITY SCHOOL =================
  console.log("🏫 Creating City School...");
  const school = await makeOrg("City School", "cityschool", "school");
  await makeUser(school, "Mrs. Khan", "principal@cityschool.com", "admin123", "orgadmin");
  const sana = await makeUser(school, "Miss Sana", "sana@cityschool.com", "teach123", "instructor");
  const farhan = await makeUser(school, "Mr. Farhan", "farhan@cityschool.com", "teach123", "instructor");
  const hamza = await makeUser(school, "Hamza Tariq", "hamza@cityschool.com", "stud123", "student");
  const zara = await makeUser(school, "Zara Nadeem", "zara@cityschool.com", "stud123", "student");
  const ayan = await makeUser(school, "Ayan Rashid", "ayan@cityschool.com", "stud123", "student");
  await makeUser(school, "Mr. Tariq", "tariq@cityschool.com", "parent123", "parent", [hamza._id]);
  await makeUser(school, "Mrs. Nadia", "nadia@cityschool.com", "parent123", "parent", [zara._id]);
  await makeUser(school, "Mr. Rashid", "rashid@cityschool.com", "parent123", "parent", [ayan._id]);

  const science = await makeCourse(school, sana, "Science: Class 5", "Plants and the water cycle", [
    { module: "Chapter 1: Our World", lessons: [
      { title: "How Plants Eat", topic: "Plants", content: "Plants make food from sunlight, water and air. This is called photosynthesis. Chlorophyll makes leaves green. 🌱" },
      { title: "The Journey of Water", topic: "Water Cycle", content: "Heat turns water into vapour. Vapour forms clouds, and clouds bring rain. Round and round it goes! 🌧️" },
    ] },
  ]);
  const maths = await makeCourse(school, farhan, "Mathematics: Class 5", "Fractions and decimals made easy", [
    { module: "Chapter 1: Parts of a Whole", lessons: [
      { title: "Fractions", topic: "Fractions", content: "A fraction is a part of a whole. 1/2 of a pizza means one of two equal slices. 🍕" },
      { title: "Decimals", topic: "Decimals", content: "0.5 is the same as 1/2. Decimals are another way to write fractions." },
    ] },
  ]);

  const sciQ = await makeQuiz(school, science.course, "Science Quiz 1", [...BANK.Plants, ...BANK["Water Cycle"]]);
  const mathQ = await makeQuiz(school, maths.course, "Maths Quiz 1", [...BANK.Fractions, ...BANK.Decimals]);

  await enroll(school, science.course, hamza, science.lessons, 1);
  await enroll(school, maths.course, hamza, maths.lessons, 2);
  await enroll(school, science.course, zara, science.lessons, 2);
  await enroll(school, maths.course, zara, maths.lessons, 2);
  await enroll(school, maths.course, ayan, maths.lessons, 1);

  await takeQuiz(school, sciQ, zara, { Plants: 3, "Water Cycle": 3 }, 6);
  await takeQuiz(school, mathQ, zara, { Fractions: 3, Decimals: 2 }, 3);
  await takeQuiz(school, sciQ, hamza, { Plants: 1, "Water Cycle": 3 }, 6); // 🌱 parent gets an alert
  await takeQuiz(school, mathQ, hamza, { Fractions: 2, Decimals: 3 }, 3);
  await takeQuiz(school, mathQ, ayan, { Fractions: 0, Decimals: 2 }, 8);
  await takeRetest(school, ayan, maths.course, "Fractions", false); // 🔴 Mr. Farhan must send notes

  await Assignment.create({
    organizationId: school._id, courseId: science.course._id, title: "Draw a Plant at Home",
    description: "Draw a plant from your home and label 3 parts.", topic: "Plants", dueDate: ahead(3), maxMarks: 10,
  });

  console.log("\n✅ Seed complete! Demo accounts:\n");
  console.table([
    { Institute: "aptechkhi", Role: "Admin", Email: "admin@aptech.com", Password: "admin123" },
    { Institute: "aptechkhi", Role: "Teacher", Email: "ahmed@aptech.com", Password: "teach123" },
    { Institute: "aptechkhi", Role: "Student (weak: Express)", Email: "ali@aptech.com", Password: "stud123" },
    { Institute: "aptechkhi", Role: "Student (top)", Email: "sara@aptech.com", Password: "stud123" },
    { Institute: "aptechkhi", Role: "Student (needs notes)", Email: "bilal@aptech.com", Password: "stud123" },
    { Institute: "cityschool", Role: "Principal", Email: "principal@cityschool.com", Password: "admin123" },
    { Institute: "cityschool", Role: "Teacher", Email: "sana@cityschool.com", Password: "teach123" },
    { Institute: "cityschool", Role: "Student", Email: "hamza@cityschool.com", Password: "stud123" },
    { Institute: "cityschool", Role: "Parent", Email: "tariq@cityschool.com", Password: "parent123" },
  ]);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});