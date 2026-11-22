# 🎓 SkillVerse AI

**An AI-powered Learning Management System (LMS) with Smart Assessment, built as SaaS for any school or institute.**

> Other apps tell you a student scored 60%. SkillVerse tells you **which topic** they are stuck on, and **helps them out of it**.

🌐 **Live website:** https://skillverse-mu-snowy.vercel.app
🎭 **Try the demo:** https://skillverse-mu-snowy.vercel.app/login/demo (pick a role, then press Sign in)

👩‍💻 Built by **Sadaf Iqbal**

---

## 💡 The problem

In most schools, a weak student is found at the **PTM (parent-teacher meeting)**, after the exam. By then it is too late.

**SkillVerse finds the problem on day 1, not at the PTM.**

---

## 🔁 The Smart Intervention Loop (the heart of SkillVerse)

Like a doctor: **measure, find the cause, treat, and check again.**

1. 📝 Student takes a quiz. SkillVerse scores **every topic separately**.
2. 🌱 A weak topic is found. A short **re-test** opens automatically.
3. 📄 Still weak? The **teacher is alerted** and sends notes (or lets ✨ AI draft them).
4. 🔁 Re-test round 2 and round 3.
5. 🙋 Still stuck? **1-on-1 help** is flagged, and the **principal gets an alert**.
6. 🎉 Passed? The topic is marked **Recovered**, and the parent sees it.

The parent is kept informed at every step.

---

## ✨ Features

### 🧒 Student
- Lessons with explanation, key points, examples and "check yourself" questions
- Quizzes with a timer, per-topic results and a **Mistake Notebook**
- Automatic **re-tests** for weak topics
- 💻 **Code Lab**: write HTML, CSS or JavaScript and see the result live
- 💬 **Class Chat + Ask Teacher**: AI answers right away, the teacher checks it
- 📓 **My Notes**: write your own notes, or let AI make them
- 📷 Submit homework as a photo or PDF
- 🏆 Certificate when a course is complete

### 👩‍🏫 Teacher
- Build courses: chapters, lessons, quizzes (with ✨ AI to draft lessons and questions)
- 📅 Tag chapters as **Term 1 / 2 / 3**, and mark them Upcoming, This week or Covered
- 📝 **Revision Test**: exam prep from chosen chapters. Weak topics get more questions, ⭐ important questions come first, and AI fills topics that have too few questions. Marks count in the report card.
- 🖼️ Add a picture to assignments (own photo or ✨ AI diagram), great for Grade 1 to 5
- Grade work with marks and feedback
- **Weak Topics** page and a class topic heatmap
- Results and gradebook

### 👨‍👩‍👦 Parent
- 🟢🟡🔴 One-look status of the child, with the reason
- 🔊 **Listen** in English or **Urdu** (for parents who prefer to hear, not read)
- Subject cards: tests, homework, quiz results and notes for each subject
- 🧒 **Child mode**: open the child's account to help submit homework
- See the child's exact quiz answers

### 🏫 Principal / Admin
- **Today at school**: a daily summary (quizzes, notes sent, grading pending, students recovered)
- 🔴 Alerts when a student needs 1-on-1 help
- Student lookup with a full activity timeline
- Manage users and reset passwords
- Getting started checklist for new institutes

### 🏢 SaaS: one platform, every institute
- Any **school, college, university, computer institute or online academy** can register itself
- Each institute's data is **separate and private**
- Labels fit the institute (for example "Subject" for a school, "Course" for an institute)

---

## 🎭 Demo accounts

**Demo Academy** (for anyone to try freely)

| Role | Institute code | Email | Password |
|---|---|---|---|
| Principal | `demo` | principal@demo.com | demo123 |
| Teacher | `demo` | teacher@demo.com | demo123 |
| Student | `demo` | student@demo.com | demo123 |
| Parent | `demo` | parent@demo.com | demo123 |

The login page also has one-click demo buttons.

---

## 🛠️ Tech stack

| Part | Tools |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router 7, Recharts, Lucide icons |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB Atlas |
| AI | Google Gemini (lessons, questions, notes, chat answers, diagrams) |
| Security | JWT login, bcrypt password hashing, Helmet, rate limits, CORS whitelist |
| Hosting | Vercel (website + API), daily cron for the principal summary |

---

## 📁 Folder structure

```
skillverse/
├── client/          React website
│   └── src/
│       ├── pages/       student, teacher, admin, parent pages
│       ├── components/  shared UI (Code Lab, Quiz Player, Topbar...)
│       └── context/     login state
└── server/          Express API
    ├── models/          MongoDB schemas
    ├── controllers/     the logic for each feature
    ├── routes/          API endpoints
    ├── services/        AI, intervention loop, daily summary
    └── seed/            demo data scripts
```

---

## 🚀 Run it on your computer

**1. Server**
```bash
cd server
npm install
```
Create `server/.env`:
```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=any-long-random-text
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
```
Then:
```bash
npm run dev
```

**2. Website**
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

**3. Demo data (optional)**
```bash
cd server
node seed/addDemoAcademy.js
```

> ⚠️ Never upload your `.env` file to GitHub.

---

## 🗺️ Roadmap (V3)

- 🏫 Class and batch levels (school tree: class, section, subject)
- 🖼️ AI images for lessons
- 📲 WhatsApp and SMS alerts for parents
- 🎤 Urdu voice input
- 📄 Upload a PDF syllabus and let AI build the course
- 📥 Import students from Excel
- ☁️ Cloud file storage
- 📱 Mobile app
- 💳 Subscription plans for institutes
- ✅ Principal approval for new sign-ups and email verification
- 🐍 Python lab
- 🖥️ Self-hosted version for institutes that want their own server

---

## 🙏 Thank you

SkillVerse was built to make sure **no student is left behind quietly**.

Made with ❤️ by **Sadaf Iqbal**