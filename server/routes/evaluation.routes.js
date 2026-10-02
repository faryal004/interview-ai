
const express = require("express");
const router = express.Router();

const { generateWithRetry } = require("../services/gemini.service");
const { buildEvaluationPrompt } = require("../services/prompts");
const {
  cleanJsonResponse,
  normalizeEvaluation,
} = require("../utils/normalize");
const { generateFallbackEvaluation } = require("../utils/fallbacks");
const { saveInterview } = require("../services/interview.service");

router.post("/evaluate-interview", async (req, res) => {
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

  if (!role || !questions || !answers) {
    return res.status(400).json({
      success: false,
      error: "Missing interview data.",
    });
  }

  try {
    // --------------------------------------
    // Prepare interview data
    // --------------------------------------

    const interview = questions.map((item, index) => ({
      question: item.question,
      category: item.category,
      difficulty: item.difficulty,
      answer: answers[index] || "No answer provided",
    }));

    const prompt = buildEvaluationPrompt({
      role,
      experience,
      resumeText,
      interview,
    });

    console.log("Starting AI interview evaluation...");

    // --------------------------------------
    // Gemini request
    // --------------------------------------

    let evaluation;

    try {
      console.log("Sending evaluation request to Gemini...");

      const result = await generateWithRetry(prompt, 3);

      console.log("Gemini evaluation response received.");

      const text = result.response.text();

      console.log(
        "Gemini evaluation response length:",
        text?.length || 0
      );

      const cleanedText = cleanJsonResponse(text);

      console.log("Parsing Gemini evaluation JSON...");

      evaluation = normalizeEvaluation(
        JSON.parse(cleanedText),
        questions
      );

      console.log("AI evaluation generated successfully.");
    } catch (aiError) {
      console.error("====================================");
      console.error("GEMINI EVALUATION ERROR");
      console.error("Status:", aiError?.status);
      console.error("Status Text:", aiError?.statusText);
      console.error("Message:", aiError?.message);
      console.error("Stack:", aiError?.stack);
      console.error("====================================");

      console.log(
        "Using emergency evaluation fallback..."
      );

      evaluation = generateFallbackEvaluation(
        questions || [],
        answers || [],
        role || ""
      );
    }

    // --------------------------------------
    // Save interview
    // --------------------------------------

    try {
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

      console.log("Interview saved successfully.");
    } catch (saveError) {
      // Saving the interview must NOT prevent
      // the user from receiving the evaluation.

      console.error("====================================");
      console.error("INTERVIEW SAVE ERROR");
      console.error("Message:", saveError?.message);
      console.error("Stack:", saveError?.stack);
      console.error("====================================");
    }

    // --------------------------------------
    // Return evaluation
    // --------------------------------------

    return res.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    // --------------------------------------
    // Unexpected server error
    // --------------------------------------

    console.error("====================================");
    console.error("UNEXPECTED EVALUATION ERROR");
    console.error("Status:", error?.status);
    console.error("Status Text:", error?.statusText);
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    console.error("====================================");

    // Last-resort fallback.
    // Even if something unexpected happens,
    // try to return an evaluation instead of 500.

    try {
      const fallbackEvaluation = generateFallbackEvaluation(
        questions || [],
        answers || [],
        role || ""
      );

      return res.json({
        success: true,
        evaluation: fallbackEvaluation,
        aiFallback: true,
        message:
          "A basic evaluation was generated because the AI evaluation service was temporarily unavailable.",
      });
    } catch (fallbackError) {
      console.error(
        "Fallback evaluation also failed:",
        fallbackError
      );

      return res.status(500).json({
        success: false,
        error: "Unable to evaluate interview.",
      });
    }
  }
});

module.exports = router;