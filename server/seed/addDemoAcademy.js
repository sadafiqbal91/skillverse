// 🎭 DEMO ACADEMY: audience ke liye alag institute (code: demo)
// Sirf "demo" ka data banata hai. City School aur Aptech ko CHHOTA BHI NAHI.
// Dobara chalao → demo ka data saaf ho kar naya ban jata hai (presentation ke baad reset ke liye) 🔄
//   cd server
//   node seed/addDemoAcademy.js
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const presets = require("../config/institutePresets");
const { evaluateAttempt, notify } = require("../services/interventionService");

const load = (name) => { try { return require("../models/" + name); } catch { return null; } };
const Organization = load("Organization");
const User = load("User");
const Course = load("Course");
const Module = load("Module");
const Lesson = load("Lesson");
const Enrollment = load("Enrollment");
const Quiz = load("Quiz");
const Question = load("Question");
const Attempt = load("Attempt");
const Assignment = load("Assignment");
const Submission = load("Submission");
const Intervention = load("Intervention");
const Note = load("Note");
const ChatMessage = load("ChatMessage");
const SchoolClass = load("SchoolClass");
const ALL = [User, Course, Module, Lesson, Enrollment, Quiz, Question, Attempt, Assignment, Submission, Intervention, Note, ChatMessage,
  load("Notification"), load("MyNote"), load("SchoolClass")].filter(Boolean);

const SLUG = "demo";
const PASS = "demo123";
const DAY = 24 * 60 * 60 * 1000;
const ago = (d) => new Date(Date.now() - d * DAY);
const ahead = (d) => new Date(Date.now() + d * DAY);

// 🍕 Bachon ke liye picture (1/4 pizza) — assignment ke saath
const PIZZA = (() => {
  const cx = 200, cy = 150, r = 110;
  const pt = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const slice = (a, b, fill) => {
    const [x1, y1] = pt(a); const [x2, y2] = pt(b);
    return '<path d="M' + cx + "," + cy + " L" + x1.toFixed(1) + "," + y1.toFixed(1) + " A" + r + "," + r + " 0 0,1 " + x2.toFixed(1) + "," + y2.toFixed(1) + ' Z" fill="' + fill + '" stroke="#92400e" stroke-width="4"/>';
  };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#ffffff"/>'
    + slice(-90, 0, "#ef4444") + slice(0, 90, "#fde68a") + slice(90, 180, "#fde68a") + slice(180, 270, "#fde68a")
    + '<circle cx="250" cy="110" r="8" fill="#7f1d1d"/><circle cx="270" cy="80" r="7" fill="#7f1d1d"/>'
    + '<text x="330" y="60" font-family="Arial" font-size="26" font-weight="bold" fill="#ef4444">1/4</text>'
    + '<text x="200" y="290" font-family="Arial" font-size="16" text-anchor="middle" fill="#334155">1 of 4 equal parts is coloured</text></svg>';
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
})();

// 🌱 Science homework ki tasveer: paudhay ke hissay
const PLANT = (() => {
  const t = (x, y, w) => '<text x="' + x + '" y="' + y + '" font-family="Arial" font-size="18" font-weight="bold" fill="#334155">' + w + '</text>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#ffffff"/>'
    + '<rect x="0" y="215" width="400" height="85" fill="#d6b48a"/>'
    + '<path d="M200 215 L200 95" stroke="#16a34a" stroke-width="8"/>'
    + '<ellipse cx="160" cy="160" rx="38" ry="16" fill="#22c55e" transform="rotate(-25 160 160)"/>'
    + '<ellipse cx="240" cy="140" rx="38" ry="16" fill="#22c55e" transform="rotate(25 240 140)"/>'
    + '<circle cx="200" cy="80" r="16" fill="#facc15"/>'
    + '<circle cx="200" cy="56" r="14" fill="#f472b6"/><circle cx="224" cy="80" r="14" fill="#f472b6"/><circle cx="176" cy="80" r="14" fill="#f472b6"/><circle cx="200" cy="104" r="14" fill="#f472b6"/>'
    + '<path d="M200 215 L170 270 M200 215 L200 280 M200 215 L232 268" stroke="#78350f" stroke-width="5"/>'
    + t(260, 70, "Flower") + t(285, 140, "Leaf") + t(215, 195, "Stem") + t(250, 270, "Root") + '</svg>';
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
})();

const Q = (topic, list) => list.map(([text, options, correctIndex]) => ({ text, options, correctIndex, topic }));
const BANK = {
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
  "حروفِ تہجی": Q("حروفِ تہجی", [
    ["اردو کس طرف سے لکھی جاتی ہے؟", ["دائیں سے بائیں", "بائیں سے دائیں", "اوپر سے نیچے"], 0],
    ["اردو کا پہلا حرف کون سا ہے؟", ["ا", "ب", "ت"], 0],
    ["کون سا حرف آگے نہیں جڑتا؟", ["د", "ب", "س"], 0],
  ]),
  "اسم": Q("اسم", [
    ["کسی چیز کے نام کو کیا کہتے ہیں؟", ["اسم", "فعل", "حرف"], 0],
    ["'کراچی' کیا ہے؟", ["جگہ کا نام", "کوئی کام", "رنگ"], 0],
    ["ان میں اسم کون سا ہے؟", ["کتاب", "دوڑنا", "جلدی"], 0],
  ]),
  HTML: Q("HTML", [
    ["HTML is used to build...", ["Web pages", "Cars", "Cakes"], 0],
    ["Which tag makes a big heading?", ["<h1>", "<p>", "<end>"], 0],
    ["What is the closing tag of <p>?", ["</p>", "<p/>", "<close>"], 0],
  ]),
};

const L = (title, topic, content, keyPoints, example, checkYourself, exampleCode) =>
  ({ title, topic, content, keyPoints, example, checkYourself, exampleCode });

const COURSES = [
  {
    key: "maths", teacher: "bilal", title: "Mathematics: Class 5", description: "Fractions and decimals made easy 🍕",
    chapters: [
      { title: "Fractions", status: "covered", term: 1, lessons: [
        L("What is a Fraction?", "Fractions", "A fraction is a part of a whole.\n\nIf you cut a pizza into 4 equal slices and eat 1, you ate 1/4 of the pizza. The bottom number tells how many equal parts. The top number tells how many parts we take.",
          ["A fraction is a part of a whole", "Bottom number = total equal parts", "Top number = parts we take"], "Cut a roti into 2 equal parts. Each part is 1/2. 🫓",
          [{ question: "A cake is cut into 8 equal pieces. You take 3. What fraction did you take?", answer: "3/8" }, { question: "Which is bigger: 1/2 or 1/4?", answer: "1/2" }]),
      ] },
      { title: "Decimals", status: "this_week", term: 1, lessons: [
        L("Meet Decimals", "Decimals", "Decimals are another way to write fractions.\n\n0.5 means 5 tenths, which is the same as 1/2. The dot is called the decimal point.",
          ["0.5 = 1/2", "The dot is the decimal point", "0.1 means one tenth"], "Rs. 0.50 is half of one rupee.",
          [{ question: "Write 1/2 as a decimal.", answer: "0.5" }]),
      ] },
    ],
    quiz: { title: "Maths Quiz 1", topics: ["Fractions", "Decimals"], testDate: 2 },
  },
  {
    key: "science", teacher: "hina", title: "Science: Class 5", description: "Plants and the water cycle 🌱",
    chapters: [
      { title: "Our Green World", status: "covered", term: 1, lessons: [
        L("How Plants Eat", "Plants", "Plants make their own food from sunlight, water and air. This is called photosynthesis.\n\nChlorophyll makes leaves green and catches sunlight. 🌱",
          ["Photosynthesis = plants making food", "Needs sunlight, water and air", "Chlorophyll makes leaves green"], "A plant kept in a dark room turns yellow, because it cannot make food.",
          [{ question: "What is it called when plants make food?", answer: "Photosynthesis" }]),
        L("The Journey of Water", "Water Cycle", "Heat from the sun turns water into vapour. Vapour goes up and forms clouds. Clouds bring rain. Round and round it goes! 🌧️",
          ["Heat → vapour", "Vapour → clouds", "Clouds → rain"], "Wet clothes dry in the sun because water turns into vapour.",
          [{ question: "What are clouds made of?", answer: "Water vapour" }]),
      ] },
    ],
    quiz: { title: "Science Quiz 1", topics: ["Plants", "Water Cycle"] },
  },
  {
    key: "urdu", teacher: "hina", title: "Urdu: Class 5", description: "اردو: حروف اور الفاظ 📖",
    chapters: [
      { title: "حروفِ تہجی", status: "covered", term: 1, lessons: [
        L("اردو کے حروف", "حروفِ تہجی", "اردو زبان دائیں سے بائیں لکھی جاتی ہے۔ اس کا پہلا حرف 'ا' ہے۔\n\nکچھ حروف اگلے حرف سے جڑ جاتے ہیں، جیسے ب اور ت۔ کچھ حروف آگے نہیں جڑتے، جیسے ا، د، ر اور و۔",
          ["اردو دائیں سے بائیں لکھی جاتی ہے", "پہلا حرف 'ا' ہے", "کچھ حروف آگے نہیں جڑتے: ا، د، ر، و"], "لفظ 'دل' میں 'د' آگے نہیں جڑتا۔",
          [{ question: "اردو کس طرف سے لکھی جاتی ہے؟", answer: "دائیں سے بائیں" }, { question: "دو ایسے حروف بتائیں جو آگے نہیں جڑتے۔", answer: "د اور ر" }]),
      ] },
      { title: "الفاظ اور اسم", status: "this_week", term: 1, lessons: [
        L("اسم کیا ہے؟", "اسم", "کسی شخص، جگہ یا چیز کے نام کو اسم کہتے ہیں۔\n\nجیسے: علی (شخص)، کراچی (جگہ)، کتاب (چیز)۔",
          ["اسم یعنی نام", "شخص کا نام: علی", "جگہ کا نام: کراچی", "چیز کا نام: کتاب"], "'سارہ اسکول جاتی ہے' میں 'سارہ' اور 'اسکول' اسم ہیں۔",
          [{ question: "'کتاب' اسم ہے یا نہیں؟", answer: "ہاں، یہ ایک چیز کا نام ہے" }]),
      ] },
    ],
    quiz: { title: "اردو کوئز 1", topics: ["حروفِ تہجی", "اسم"] },
  },
  {
    key: "computer", teacher: "bilal", title: "Computer: Class 5", description: "Your first web page 💻",
    chapters: [
      { title: "My First Web Page", status: "this_week", term: 2, lessons: [
        L("What is HTML?", "HTML", "Every website is made with HTML. We write HTML with tags like <h1> and <p>. Most tags come in pairs: <p> and </p>.\n\nChange the words in the Code Lab below and watch the page change! 👇",
          ["HTML builds web pages", "Tags look like <p>", "<h1> is a big heading"], "A page about you can have your name as a heading.",
          [{ question: "Which tag makes a big heading?", answer: "<h1>" }],
          "<h1>Hello, I am Ali!</h1>\n<p>I love cricket 🏏</p>\n<p style=\"color: purple;\">Change me!</p>"),
      ] },
    ],
    quiz: { title: "Computer Quiz 1", topics: ["HTML"] },
  },
];

// 🎭 Quiz dena (mastery = har topic ke 3 mein se kitne sahi)
const takeQuiz = async (org, quiz, student, mastery, daysAgo) => {
  const qs = await Question.find({ quizId: quiz._id }).select("+correctIndex topic options").sort("_id");
  const seen = {}; const topics = {}; let score = 0;
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
    topicScores: Object.entries(topics).map(([topic, t]) => ({ topic, correct: t.correct, total: t.total, percent: Math.round((t.correct / t.total) * 100) })),
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
    answers: qs.map((q) => ({ questionId: q._id, selectedIndex: pass ? q.correctIndex : (q.correctIndex + 1) % q.options.length, isCorrect: pass })),
    score, total: qs.length, percent, passed: pass,
    topicScores: [{ topic, correct: score, total: qs.length, percent }],
    status: "submitted", expiresAt: new Date(), submittedAt: new Date(),
  });
  await evaluateAttempt(attempt, org.settings.passingMarks);
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    // 🔄 Purana demo saaf (sirf demo ka!)
    const old = await Organization.findOne({ slug: SLUG });
    if (old) {
      for (const M of ALL) await M.deleteMany({ organizationId: old._id });
      await Organization.deleteOne({ _id: old._id });
      console.log("🧹 Old Demo Academy data cleared");
    }

    const org = await Organization.create({ name: "Demo Academy", slug: SLUG, type: "school", settings: presets.school });
    const mk = (name, email, role, children = []) => User.create({ organizationId: org._id, name, email, password: PASS, role, children });

    await mk("Mrs. Ayesha", "principal@demo.com", "orgadmin");
    const teachers = { bilal: await mk("Mr. Bilal", "teacher@demo.com", "instructor"), hina: await mk("Miss Hina", "science@demo.com", "instructor") };
    const ali = await mk("Ali Khan", "student@demo.com", "student");
    const sara = await mk("Sara Ahmed", "sara@demo.com", "student");
    const omar = await mk("Omar Shah", "omar@demo.com", "student");
    const fatima = await mk("Fatima Noor", "fatima@demo.com", "student");
    await mk("Mr. Khan", "parent@demo.com", "parent", [ali._id]);
    await mk("Mrs. Noor", "fatima.parent@demo.com", "parent", [fatima._id]); // 🔮 Early warning ka parent
    const students = [ali, sara, omar, fatima];

    const made = {};
    for (const c of COURSES) {
      const topics = [...new Set(c.chapters.flatMap((ch) => ch.lessons.map((l) => l.topic)))];
      const course = await Course.create({ organizationId: org._id, instructorId: teachers[c.teacher]._id, title: c.title, description: c.description, topics, status: "published" });
      const lessons = [];
      for (const [ci, ch] of c.chapters.entries()) {
        const mod = await Module.create({ organizationId: org._id, courseId: course._id, title: ch.title, order: ci + 1, status: ch.status, term: ch.term });
        for (const [li, l] of ch.lessons.entries()) {
          lessons.push(await Lesson.create({
            organizationId: org._id, courseId: course._id, moduleId: mod._id, order: li + 1, title: l.title, topics: [l.topic],
            durationMinutes: 12, content: l.content, keyPoints: l.keyPoints, example: l.example, exampleCode: l.exampleCode || "", checkYourself: l.checkYourself,
          }));
        }
      }
      const qList = c.quiz.topics.flatMap((t) => BANK[t]);
      const quiz = await Quiz.create({
        organizationId: org._id, courseId: course._id, title: c.quiz.title, timeLimitMinutes: 15, questionsPerAttempt: qList.length,
        testDate: c.quiz.testDate ? ahead(c.quiz.testDate) : undefined,
      });
      await Question.insertMany(qList.map((q) => ({ ...q, organizationId: org._id, quizId: quiz._id })));
      for (const [i, s] of students.entries()) {
        const done = lessons.slice(0, s === sara ? lessons.length : i % 2 ? 1 : 0).map((l) => l._id);
        await Enrollment.create({
          organizationId: org._id, courseId: course._id, studentId: s._id, completedLessons: done,
          progressPercent: Math.round((done.length / lessons.length) * 100), status: done.length === lessons.length ? "completed" : "active",
        });
      }
      made[c.key] = { course, quiz };
    }

    // 🎭 Kahaniyan
    const { maths, science, computer, urdu } = made;
    await takeQuiz(org, maths.quiz, sara, { Fractions: 3, Decimals: 3 }, 5);          // ⭐ top student
    await takeQuiz(org, science.quiz, sara, { Plants: 3, "Water Cycle": 3 }, 4);
    await takeQuiz(org, maths.quiz, ali, { Fractions: 0, Decimals: 2 }, 6);           // 🔴 weak → re-test failed → notes needed
    await takeRetest(org, ali, maths.course, "Fractions", false);
    await takeQuiz(org, science.quiz, omar, { Plants: 1, "Water Cycle": 3 }, 3);       // 🌱 re-test ready (audience can try)
    await takeQuiz(org, maths.quiz, fatima, { Fractions: 3, Decimals: 3 }, 12);        // 🔮 scores dropping: 100 → 83 → 67
    await takeQuiz(org, maths.quiz, fatima, { Fractions: 3, Decimals: 2 }, 8);
    await takeQuiz(org, maths.quiz, fatima, { Fractions: 2, Decimals: 2 }, 2);
    await takeQuiz(org, computer.quiz, fatima, { HTML: 3 }, 1);
    await takeQuiz(org, urdu.quiz, sara, { "حروفِ تہجی": 3, "اسم": 3 }, 2);         // 📖 Urdu
    await takeQuiz(org, urdu.quiz, ali, { "حروفِ تہجی": 3, "اسم": 2 }, 1);

    // ⚖️ Planner ki kahani: Science ka quiz 10 din purana → is hafte Miss Hina ka quiz ⏳ baaki
    await Quiz.updateOne({ _id: science.quiz._id }, { $set: { createdAt: ago(10) } }, { timestamps: false, strict: false });

    // 📝 Assignment with picture
    const pizza = await Assignment.create({
      organizationId: org._id, courseId: maths.course._id, title: "Colour 1/4 of a Pizza",
      description: "Look at the picture. Draw your own pizza, colour 1/4 of it, and upload a photo.",
      topic: "Fractions", dueDate: ahead(3), maxMarks: 10, image: PIZZA, imageKind: "diagram", imageCaption: "A pizza with 1 of 4 equal parts coloured",
    });
    await Submission.create({ organizationId: org._id, assignmentId: pizza._id, courseId: maths.course._id, studentId: sara._id, content: "I coloured 1 slice red!", status: "graded", marks: 9, feedback: "Beautiful work, Sara! 🌟", gradedAt: ago(1) });
    await Submission.create({ organizationId: org._id, assignmentId: pizza._id, courseId: maths.course._id, studentId: fatima._id, content: "My pizza has 4 slices and 1 is coloured." });
    await Assignment.create({
      organizationId: org._id, courseId: computer.course._id, title: "Make a Web Page About You",
      description: "Use the Code Lab. Write your name in <h1> and 2 things you like in <p>.", topic: "HTML", dueDate: ahead(5), maxMarks: 10,
    });
    await Assignment.create({
      organizationId: org._id, courseId: science.course._id, title: "Parts of a Plant",
      description: "Look at the picture. Draw a plant in your copy and label 4 parts: root, stem, leaf, flower. Upload a photo.",
      topic: "Plants", dueDate: ahead(4), maxMarks: 10, image: PLANT, imageKind: "diagram", imageCaption: "A plant with its root, stem, leaf and flower",
    });
    await Assignment.create({
      organizationId: org._id, courseId: urdu.course._id, title: "پانچ اسم لکھیں",
      description: "اپنے گھر کی پانچ چیزوں کے نام لکھیں۔ مثال: کرسی، کتاب",
      topic: "اسم", dueDate: ahead(6), maxMarks: 10,
    });

    // 💬 Chat: ek sawal jo teacher ke review ka intezar kar raha hai
    if (ChatMessage) {
      const q = await ChatMessage.create({ organizationId: org._id, courseId: maths.course._id, userId: ali._id, name: ali.name, role: "student", text: "Why is 1/2 bigger than 1/4? 4 is bigger than 2!", kind: "question", answered: false });
      await ChatMessage.create({ organizationId: org._id, courseId: maths.course._id, name: "AI Helper", role: "ai", kind: "ai", replyTo: q._id, review: "pending",
        text: "Great question! Think of one pizza. If you cut it into 2 parts, each part is big. If you cut the same pizza into 4 parts, each part is smaller. So 1/2 (one of 2 big parts) is more pizza than 1/4 (one of 4 small parts). 🍕" });
      await notify(org._id, [teachers.bilal._id], { type: "ask_teacher", title: "❓ Ali Khan asked in Mathematics: Class 5", message: "Why is 1/2 bigger than 1/4? · AI answered, please check it", meta: { courseId: maths.course._id } });
    }

    // 🌳 School Tree: Class 5-A, class teacher, subjects, timetable
    if (SchoolClass) {
      const M = maths.course._id, S = science.course._id, C = computer.course._id, U = urdu.course._id;
      await SchoolClass.create({
        organizationId: org._id, name: "Class 5-A", classTeacherId: teachers.bilal._id, courseIds: [M, S, C, U], testsPerWeek: 2,
        timetable: [
          { day: "Mon", time: "08:30", courseId: M }, { day: "Mon", time: "09:30", courseId: S },
          { day: "Tue", time: "08:30", courseId: C }, { day: "Tue", time: "09:30", courseId: M },
          { day: "Wed", time: "08:30", courseId: S }, { day: "Wed", time: "09:30", courseId: M },
          { day: "Thu", time: "08:30", courseId: M }, { day: "Thu", time: "09:30", courseId: C },
          { day: "Fri", time: "08:30", courseId: S }, { day: "Mon", time: "10:30", courseId: U },
          { day: "Wed", time: "10:30", courseId: U }, { day: "Fri", time: "09:30", courseId: U },
        ],
      });
    }

    console.log("\n✅ Demo Academy ready! Institute code: demo · Password for everyone: " + PASS + "\n");
    console.table([
      { Role: "Principal", Email: "principal@demo.com" },
      { Role: "Teacher (Maths + Computer, class teacher 5-A)", Email: "teacher@demo.com" },
      { Role: "Teacher (Science + Urdu)", Email: "science@demo.com" },
      { Role: "Student (weak in Fractions)", Email: "student@demo.com" },
      { Role: "Student (top)", Email: "sara@demo.com" },
      { Role: "Student (re-test ready)", Email: "omar@demo.com" },
      { Role: "Parent of Ali", Email: "parent@demo.com" },
      { Role: "Parent of Fatima (early warning)", Email: "fatima.parent@demo.com" },
    ]);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await mongoose.disconnect();
  }
})();