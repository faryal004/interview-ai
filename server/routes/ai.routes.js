const express = require("express");
const router = express.Router();
const { generateWithRetry } = require("../services/gemini.service");
const { TEST_AI_PROMPT } = require("../services/prompts");

router.post(
  "/test-ai",
  async (req, res) => {
    try {
      const result =
        await generateWithRetry(
          TEST_AI_PROMPT,
          3
        );

      const response =
        result.response.text();

      res.json({
        success: true,
        message: response,
      });
    } catch (error) {
      console.error(
        "Gemini Test Error:",
        error
      );

      const isRateLimited =
        Number(error?.status) === 429 ||
        String(
          error?.statusText || ""
        )
          .toLowerCase()
          .includes(
            "too many requests"
          );

      const isServiceUnavailable =
        [500, 502, 503, 504].includes(
          Number(error?.status)
        ) ||
        String(
          error?.statusText || ""
        )
          .toLowerCase()
          .includes(
            "service unavailable"
          );

      if (isRateLimited) {
        return res.status(429).json({
          success: false,
          error:
            "Gemini API quota has been reached. Please try again later.",
          code:
            "GEMINI_QUOTA_EXCEEDED",
        });
      }

      if (isServiceUnavailable) {
        return res.status(503).json({
          success: false,
          error:
            "Gemini AI is temporarily experiencing high demand. Please try again later.",
          code:
            "GEMINI_SERVICE_UNAVAILABLE",
        });
      }

      return res.status(500).json({
        success: false,
        error:
          "Failed to connect to Gemini.",
      });
    }
  }
);

module.exports = router;
