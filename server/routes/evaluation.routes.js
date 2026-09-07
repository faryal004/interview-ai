const express = require("express");
const router = express.Router();
const { generateWithRetry } = require("../services/gemini.service");
const { buildEvaluationPrompt } = require("../services/prompts");
const { cleanJsonResponse, normalizeEvaluation } = require("../utils/normalize");
const { generateFallbackEvaluation } = require("../utils/fallbacks");
const { saveInterview } = require("../services/interview.service");

router.post(
  "/evaluate-interview",
  async (req, res) => {
    try {
      const {
        role,
        experience,
        type,
        numberOfQuestions,
        questions,
        answers,
        resumeText,
        resumeAnalysis,
      } = req.body;

      // --------------------------------------
      // Validation
      // --------------------------------------

      if (
        !role ||
        !questions ||
        !answers
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing interview data.",
        });
      }

      const interview =
        questions.map(
          (item, index) => ({
            question:
              item.question,
            category:
              item.category,
            difficulty:
              item.difficulty,
            answer:
              answers[index] ||
              "No answer provided",
          })
        );

      const prompt = buildEvaluationPrompt({
        role,
        experience,
        resumeText,
        interview,
      });

      // --------------------------------------
      // Gemini request
      // --------------------------------------

      const result =
        await generateWithRetry(
          prompt,
          3
        );

      const text =
        result.response.text();

      const cleanedText =
        cleanJsonResponse(text);

      const evaluation = normalizeEvaluation(
        JSON.parse(cleanedText),
        questions
      );

      await saveInterview({
          role,
          experience,
          interviewType: type,
          numberOfQuestions,
          resume: {
            text: resumeText || "",
            analysis: resumeAnalysis || null,
          },
          questions,
          answers,
          evaluation,
        });

      return res.json({
        success: true,
        evaluation,
      });
    } catch (error) {
      console.error(
        "Evaluation Error:",
        error
      );

      // --------------------------------------
      // Emergency evaluation fallback
      // --------------------------------------

      console.log(
        "Using emergency evaluation fallback..."
      );

      const fallbackEvaluation =
        generateFallbackEvaluation(
          questions || [],
          answers || [],
          role || ""
        );

        await saveInterview({
          role,
          experience,
          interviewType: type,
          numberOfQuestions,
          resume: {
            text: resumeText || "",
            analysis: resumeAnalysis || null,
          },
          questions,
          answers,
          evaluation: fallbackEvaluation,
        });


      return res.json({
        success: true,
        evaluation:
          fallbackEvaluation,
        aiFallback: true,
        message:
          "Gemini was temporarily unavailable. A basic fallback evaluation was generated.",
      });
    }
  }
);

module.exports = router;
