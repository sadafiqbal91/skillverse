require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Assignment = require("../models/Assignment");

const DAY = 24 * 60 * 60 * 1000;
const TITLE = "Computer: Class 5";

const LESSONS = [
  {
    chapter: "Chapter 1: Meet the Computer", status: "covered", lessons: [
      {
        title: "Parts of a Computer", topic: "Computer Parts", minutes: 12,
        content: "A computer is a smart machine that helps us write, draw, learn and play.\n\nIt has a few main parts. The monitor is the screen where we see things. The keyboard lets us type letters and numbers. The mouse helps us point and click. The CPU is the brain of the computer. It does all the thinking.\n\nAll these parts work together, like a team.",
        keyPoints: ["Monitor = the screen", "Keyboard = for typing", "Mouse = point and click", "CPU = the brain of the computer"],
        example: "When you play a game, you move with the mouse, the CPU thinks, and the monitor shows you the picture.",
        checkYourself: [
          { question: "Which part is called the brain of the computer?", answer: "The CPU" },
          { question: "Where do we see pictures and words?", answer: "On the monitor" },
          { question: "What do we use to type our name?", answer: "The keyboard" },
        ],
      },
      {
        title: "Input and Output", topic: "Input & Output", minutes: 10,
        content: "Input means giving something TO the computer. Output means getting something FROM the computer.\n\nThe keyboard, mouse and microphone are input devices, because we use them to tell the computer what to do.\n\nThe monitor, speakers and printer are output devices, because they show or give us the result.",
        keyPoints: ["Input = we give to the computer", "Output = the computer gives to us", "Keyboard and mouse are input", "Monitor and speakers are output"],
        example: "You speak into the microphone (input) and hear your voice from the speakers (output).",
        checkYourself: [
          { question: "Is a printer input or output?", answer: "Output" },
          { question: "Is a mouse input or output?", answer: "Input" },
          { question: "Name one output device.", answer: "Monitor, speakers or printer" },
        ],
      },
    ],
  },
  {
    chapter: "Chapter 2: My First Web Page", status: "this_week", lessons: [
      {
        title: "What is HTML?", topic: "HTML", minutes: 15,
        content: "Every website you open is made with HTML. HTML is like the bones of a web page.\n\nWe write HTML with tags. A tag looks like <h1>. Most tags come in pairs: an opening tag <h1> and a closing tag </h1>.\n\n<h1> makes a big heading. <p> makes a paragraph. Try changing the words in the Code Lab below!",
        keyPoints: ["HTML builds web pages", "Tags look like <p>", "Tags come in pairs: <p> and </p>", "<h1> is a big heading"],
        example: "A web page about you can have your name as a heading and your hobby as a paragraph.",
        exampleCode: "<h1>Hello, I am Hamza!</h1>\n<p>I love cricket 🏏</p>\n<p>My favourite colour is blue.</p>",
        checkYourself: [
          { question: "What does HTML build?", answer: "Web pages" },
          { question: "Which tag makes a big heading?", answer: "<h1>" },
          { question: "What is the closing tag for <p>?", answer: "</p>" },
        ],
      },
      {
        title: "Colours with CSS", topic: "CSS", minutes: 15,
        content: "HTML gives a page its bones. CSS gives it clothes and colours! 🎨\n\nWith CSS we can change the colour of text, the background, and the size of letters.\n\nWe write CSS inside a style. For example: color: red makes the text red.",
        keyPoints: ["CSS makes pages beautiful", "color changes text colour", "background changes the background", "font-size changes the size of letters"],
        example: "You can make your name green and your page background light yellow.",
        exampleCode: "<h1 style=\"color: green;\">My Colourful Page</h1>\n<p style=\"background: lightyellow; font-size: 20px;\">CSS is fun!</p>",
        checkYourself: [
          { question: "What does CSS do?", answer: "It adds colours and style to web pages" },
          { question: "Which property changes text colour?", answer: "color" },
          { question: "Which property makes letters bigger?", answer: "font-size" },
        ],
      },
    ],
  },
];

const Q = (topic, list) => list.map(([text, options, correctIndex]) => ({ text, options, correctIndex, topic }));
const QUESTIONS = [
  ...Q("Computer Parts", [
    ["Which part is the brain of the computer?", ["CPU", "Mouse", "Monitor"], 0],
    ["Which part shows pictures?", ["Monitor", "Keyboard", "CPU"], 0],
    ["What do we use to type?", ["Keyboard", "Speaker", "Monitor"], 0],
  ]),
  ...Q("Input & Output", [
    ["A mouse is an...", ["Input device", "Output device", "Food"], 0],
    ["Speakers are an...", ["Output device", "Input device", "Cable"], 0],
    ["A microphone is an...", ["Input device", "Output device", "Screen"], 0],
  ]),
  ...Q("HTML", [
    ["HTML is used to build...", ["Web pages", "Cars", "Cakes"], 0],
    ["Which tag makes a big heading?", ["<h1>", "<p>", "<end>"], 0],
    ["What is the closing tag of <p>?", ["</p>", "<p/>", "<close>"], 0],
  ]),
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const org = await Organization.findOne({ slug: "cityschool" });
    if (!org) throw new Error("City School not found");

    if (await Course.exists({ organizationId: org._id, title: TITLE })) {
      console.log("✅ Computer course already exists, nothing to do.");
      return;
    }

    const farhan = await User.findOne({ organizationId: org._id, email: "farhan@cityschool.com" });
    const students = await User.find({ organizationId: org._id, role: "student" });
    if (!farhan) throw new Error("Mr. Farhan not found");

    const topics = [...new Set(LESSONS.flatMap((c) => c.lessons.map((l) => l.topic)))];
    const course = await Course.create({
      organizationId: org._id, instructorId: farhan._id, title: TITLE,
      description: "Computer basics and your first web page 💻", topics, status: "published",
    });

    for (const [ci, ch] of LESSONS.entries()) {
      const mod = await Module.create({ organizationId: org._id, courseId: course._id, title: ch.chapter, order: ci + 1, status: ch.status });
      for (const [li, l] of ch.lessons.entries()) {
        await Lesson.create({
          organizationId: org._id, courseId: course._id, moduleId: mod._id, order: li + 1,
          title: l.title, topics: [l.topic], durationMinutes: l.minutes, content: l.content,
          keyPoints: l.keyPoints, example: l.example, exampleCode: l.exampleCode || "", checkYourself: l.checkYourself,
        });
      }
    }

    const quiz = await Quiz.create({
      organizationId: org._id, courseId: course._id, title: "Computer Quiz 1",
      timeLimitMinutes: 15, questionsPerAttempt: QUESTIONS.length, testDate: new Date(Date.now() + 2 * DAY),
    });
    await Question.insertMany(QUESTIONS.map((q) => ({ ...q, organizationId: org._id, quizId: quiz._id })));

    await Assignment.create({
      organizationId: org._id, courseId: course._id, title: "Make a Web Page About You",
      description: "Use the Code Lab. Write your name in <h1> and 2 things you like in <p>. Take a screenshot or photo and upload it.",
      topic: "HTML", dueDate: new Date(Date.now() + 5 * DAY), maxMarks: 10,
    });

    for (const s of students) {
      await Enrollment.create({ organizationId: org._id, courseId: course._id, studentId: s._id, completedLessons: [], progressPercent: 0, status: "active" });
    }

    console.log(`✅ "${TITLE}" created: 4 lessons, 1 quiz (test in 2 days), 1 assignment, ${students.length} students enrolled.`);
  } catch (e) {
    console.error("❌", e.message);
  } finally {
    await mongoose.disconnect();
  }
})();