const express = require("express");
const router = express.Router();
const { generateWithRetry } = require("../services/gemini.service");
const { buildQuestionsPrompt } = require("../services/prompts");
const { cleanJsonResponse, isPlainObject } = require("../utils/normalize");
const { generateFallbackQuestions } = require("../utils/fallbacks");

router.post(
  "/generate-questions",
  async (req, res) => {
    const {
      role,
      experience,
      type,
      numberOfQuestions,
      resumeText,
    } = req.body;

    try {
      // --------------------------------------
      // Validation
      // --------------------------------------

      if (
        !role ||
        !experience ||
        !type ||
        !numberOfQuestions
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing interview details.",
        });
      }

      const requestedCount =
        Math.max(
          1,
          Number(numberOfQuestions) || 5
        );

      // --------------------------------------
      // Resume section
      // --------------------------------------

      const resumeSection =
        resumeText
          ? `
CANDIDATE RESUME:
-----------------
${resumeText}
-----------------

IMPORTANT:
- Use the candidate's actual resume information.
- Ask personalized questions about real skills, technologies,
  internships, projects, education, and experience.
- Do NOT invent information that is not present in the resume.
`
          : `
No resume was provided.

Generate questions based only on:
- Job role
- Experience level
- Interview type
`;

      const prompt = buildQuestionsPrompt({
        requestedCount,
        role,
        experience,
        type,
        resumeSection,
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

      const questions =
        JSON.parse(cleanedText);

      // --------------------------------------
      // Validate AI questions
      // --------------------------------------

      if (
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        throw new Error(
          "Invalid questions format returned by AI."
        );
      }

      const validQuestions =
        questions
          .filter(
            (item) =>
              isPlainObject(item) &&
              typeof item.question === "string" &&
              item.question.trim() &&
              typeof item.category === "string" &&
              item.category.trim() &&
              typeof item.difficulty === "string" &&
              item.difficulty.trim()
          )
          .map((item) => ({
            question: item.question.trim(),
            category: item.category.trim(),
            difficulty: item.difficulty.trim(),
          }));

      if (
        validQuestions.length === 0
      ) {
        throw new Error(
          "AI returned no valid questions."
        );
      }

      // If AI returns fewer than requested,
      // complete using local fallback.
      if (
        validQuestions.length <
        requestedCount
      ) {
        const fallback =
          generateFallbackQuestions(
            role,
            experience,
            type,
            requestedCount,
            resumeText
          );

        for (
          const fallbackQuestion of fallback
        ) {
          if (
            validQuestions.length >=
            requestedCount
          ) {
            break;
          }

          const duplicate =
            validQuestions.some(
              (q) =>
                q.question
                  .toLowerCase()
                  .trim() ===
                fallbackQuestion.question
                  .toLowerCase()
                  .trim()
            );

          if (!duplicate) {
            validQuestions.push(
              fallbackQuestion
            );
          }
        }
      }

      return res.json({
        success: true,
        questions:
          validQuestions.slice(
            0,
            requestedCount
          ),
      });
    } catch (error) {
      console.error(
        "Question Generation Error:",
        error
      );

      console.log(
        "Gemini unavailable. Using emergency fallback questions..."
      );

      const fallbackQuestions =
        generateFallbackQuestions(
          role,
          experience,
          type,
          numberOfQuestions,
          resumeText
        );

      return res.json({
        success: true,
        questions:
          fallbackQuestions,
        aiFallback: true,
        message:
          "Gemini was temporarily unavailable. Emergency fallback questions were used.",
      });
    }
  }
);

module.exports = router;
