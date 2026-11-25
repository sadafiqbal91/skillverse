const Attempt = require("../models/Attempt");
const Course = require("../models/Course");
const User = require("../models/User");
const Intervention = require("../models/Intervention");
const Notification = require("../models/Notification");

const MIN_QUESTIONS = 3; // no decision with fewer than 3 questions
const MAX_RETESTS = 3; // 3 chances, then 1-on-1

const notify = async (organizationId, userIds, { type, title, message, meta = {} }) => {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (ids.length === 0) return;
  await Notification.insertMany(ids.map((userId) => ({ organizationId, userId, type, title, message, meta })));
};

const parentsOf = async (studentId) =>
  (await User.find({ role: "parent", children: studentId }).select("_id")).map((p) => p._id);

const topicTotals = async (studentId, courseId, topic) => {
  const attempts = await Attempt.find({ studentId, courseId, status: "submitted", kind: "regular" }).select("topicScores");
  let correct = 0;
  let total = 0;
  for (const a of attempts) {
    for (const t of a.topicScores) {
      if (t.topic === topic) {
        correct += t.correct;
        total += t.total;
      }
    }
  }
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
};

// ⭐ Runs after every quiz submission
const evaluateAttempt = async (attempt, passingMarks) => {
  const org = attempt.organizationId;
  const course = await Course.findById(attempt.courseId).select("title instructorId");
  const parents = await parentsOf(attempt.studentId);
  const results = [];

  // ===== A) RE-TEST result =====
  if (attempt.kind === "retest" && attempt.interventionId) {
    const iv = await Intervention.findById(attempt.interventionId);
    if (!iv || iv.level === "resolved") return results;

    const p = attempt.percent;
    iv.retestsTaken = (iv.retestsTaken || 0) + 1;
    const round = iv.retestsTaken;
    const left = MAX_RETESTS - round;
    const meta = { courseId: course._id, topic: iv.topic, interventionId: iv._id };
    iv.latestPercent = p;

    if (p >= passingMarks) {
      // ✅ Passed in any round
      iv.history.push({ event: iv.notesSent ? "notes_worked" : "retest_passed", percent: p, round });
      iv.level = "resolved";
      iv.resolvedAt = new Date();
      await notify(org, [attempt.studentId, ...parents], {
        type: "intervention_resolved",
        title: `${iv.topic}: great job! 🎉`,
        message: `You scored ${p}% on re-test ${round} of ${MAX_RETESTS}. This topic is back on track.`,
        meta,
      });
      if (iv.notesSent) {
        await notify(org, [course.instructorId], {
          type: "notes_worked",
          title: "Your notes worked ✅",
          message: `A student scored ${p}% on the ${iv.topic} re-test after reading your notes.`,
          meta,
        });
      }
    } else if (round >= MAX_RETESTS) {
      // 🙋 All 3 chances used
      iv.level = "one_on_one";
      iv.history.push({ event: "all_retests_failed", percent: p, round });
      await notify(org, [course.instructorId], {
        type: "one_on_one_needed",
        title: `🙋 ${iv.topic}: 1-on-1 help needed`,
        message: `A student scored ${p}% on the final re-test (${MAX_RETESTS} of ${MAX_RETESTS}). Please give them some personal time.`,
        meta,
      });
      await notify(org, [attempt.studentId, ...parents], {
        type: "one_on_one",
        title: `${iv.topic}: your teacher will help you personally 🙋`,
        message: "You tried 3 times, well done for not giving up. Your teacher will sit with you on this topic.",
        meta,
      });
            // 🔴 Principal ko foran khabar
      const admins = await User.find({ organizationId: org, role: "orgadmin" }).select("_id");
      const student = await User.findById(attempt.studentId).select("name");
      await notify(org, admins.map((a) => a._id), {
        type: "admin_alert",
        title: `🔴 1-on-1 needed: ${student?.name || "A student"}`,
        message: `${iv.topic} (${course.title}): failed all ${MAX_RETESTS} re-tests. The teacher has been told to help personally.`,
        meta: { ...meta, studentId: attempt.studentId },
      });
      // 👩‍🏫 Class teacher ko bhi (agar wo khud is subject ki teacher nahi)
      try {
        const SchoolClass = require("../models/SchoolClass");
        const classes = await SchoolClass.find({ organizationId: org, courseIds: course._id }).select("name classTeacherId");
        for (const k of classes) {
          if (!k.classTeacherId || String(k.classTeacherId) === String(course.instructorId)) continue;
          await notify(org, [k.classTeacherId], {
            type: "class_one_on_one",
            title: `🙋 ${k.name} · ${student?.name || "A student"} needs 1-on-1`,
            message: `${iv.topic} (${course.title}): failed all ${MAX_RETESTS} re-tests. The subject teacher will help personally.`,
            meta: { ...meta, studentId: attempt.studentId },
          });
        }
      } catch (e) {
        // class na mile to kuch nahi
      }
    } else if (iv.level === "needs_practice") {
      // 🔴 Round 1 failed → teacher sends notes
      iv.level = "intervention";
      iv.history.push({ event: "retest_failed", percent: p, round });
      const others = await Intervention.countDocuments({
        courseId: course._id, topic: iv.topic, level: "intervention", _id: { $ne: iv._id },
      });
      await notify(org, [course.instructorId], {
        type: "intervention_needed",
        title: `🔴 ${iv.topic}: notes needed`,
        message: `${others + 1} student(s) are still weak in ${iv.topic} after a re-test. Send notes once and everyone gets them.`,
        meta,
      });
      await notify(org, [attempt.studentId, ...parents], {
        type: "help_coming",
        title: `Help is on the way for ${iv.topic} 🤝`,
        message: `Your teacher has been notified. After the notes, you get re-test 2 of ${MAX_RETESTS}.`,
        meta,
      });
    } else {
      // 🔁 Round 2 failed → one more chance
      iv.history.push({ event: "retest_failed", percent: p, round });
      await notify(org, [attempt.studentId, ...parents], {
        type: "retest_ready",
        title: `${iv.topic}: one more try 💪`,
        message: `You scored ${p}%. You have ${left} re-test left. Read the notes again, then take re-test ${round + 1} of ${MAX_RETESTS}.`,
        meta,
      });
    }

    await iv.save();
    results.push({ topic: iv.topic, level: iv.level, percent: p, round, retestsLeft: iv.level === "resolved" ? 0 : left });
    return results;
  }

  // ===== B) REGULAR quiz: check every topic =====
  for (const t of attempt.topicScores) {
    const agg = await topicTotals(attempt.studentId, attempt.courseId, t.topic);
    let iv = await Intervention.findOne({
      studentId: attempt.studentId, courseId: attempt.courseId, topic: t.topic, level: { $ne: "resolved" },
    });

    if (agg.percent >= passingMarks) {
      if (iv && iv.level === "watch") {
        iv.level = "resolved";
        iv.resolvedAt = new Date();
        iv.history.push({ event: "recovered", percent: agg.percent });
        await iv.save();
      }
      continue;
    }

    const isNew = !iv;
    if (isNew) {
      iv = new Intervention({
        organizationId: org, courseId: attempt.courseId, studentId: attempt.studentId,
        topic: t.topic, startPercent: agg.percent,
      });
    }
    iv.latestPercent = agg.percent;

    if (agg.total < MIN_QUESTIONS) {
      if (isNew) iv.history.push({ event: "watch", percent: agg.percent });
    } else if (isNew || iv.level === "watch") {
      iv.level = "needs_practice";
      iv.history.push({ event: "needs_practice", percent: agg.percent });
      await iv.save();
      await notify(org, [attempt.studentId, ...parents], {
        type: "retest_ready",
        title: `🌱 ${t.topic}: time to practice`,
        message: `You're at ${agg.percent}% in ${t.topic}. Re-test 1 of ${MAX_RETESTS} is ready for you.`,
        meta: { courseId: attempt.courseId, topic: t.topic, interventionId: iv._id },
      });
    }

    await iv.save();
    results.push({ topic: iv.topic, level: iv.level, percent: agg.percent });
  }
  return results;
};

module.exports = { evaluateAttempt, notify, parentsOf, MAX_RETESTS };