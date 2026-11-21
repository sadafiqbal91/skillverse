const presets = {
  school: {
    labels: { course: "Subject", batch: "Class" },
    gradingScheme: "letter",
    passingMarks: 50,
    features: { codingLab: false, parentView: true, aiTutor: false },
  },
  college: {
    labels: { course: "Subject", batch: "Year" },
    gradingScheme: "percentage",
    passingMarks: 40,
    features: { codingLab: false, parentView: false, aiTutor: true },
  },
  university: {
    labels: { course: "Course", batch: "Semester" },
    gradingScheme: "gpa",
    passingMarks: 50,
    features: { codingLab: false, parentView: false, aiTutor: true },
  },
  computer_institute: {
    labels: { course: "Course", batch: "Batch" },
    gradingScheme: "percentage",
    passingMarks: 50,
    features: { codingLab: true, parentView: false, aiTutor: true },
  },
  online_academy: {
    labels: { course: "Course", batch: "Batch" },
    gradingScheme: "percentage",
    passingMarks: 50,
    features: { codingLab: false, parentView: true, aiTutor: true },
  },
};

module.exports = presets;