const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      required: true,
      trim: true,
    },

    interviewType: {
      type: String,
      required: true,
      trim: true,
    },

    numberOfQuestions: {
      type: Number,
      required: true,
    },

    resume: {
      text: {
        type: String,
        default: "",
      },

      analysis: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },

    questions: [
      {
        question: {
          type: String,
          required: true,
        },

        category: {
          type: String,
          default: "",
        },

        difficulty: {
          type: String,
          default: "",
        },
      },
    ],

    answers: [
      {
        type: String,
        default: "",
      },
    ],

    evaluation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interview", interviewSchema);