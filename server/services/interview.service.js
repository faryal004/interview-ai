const Interview = require("../models/Interview");

async function saveInterview(data) {
  return Interview.create(data);
}

async function getInterviewHistory() {
  return Interview.find().sort({ createdAt: -1 });
}

async function clearInterviewHistory() {
  return Interview.deleteMany({});
}

module.exports = {
  saveInterview,
  getInterviewHistory,
  clearInterviewHistory,
};
