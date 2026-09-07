const express = require("express");
const router = express.Router();
const multer = require("multer");
const { hasPdfSignature, cleanJsonResponse, normalizeResumeAnalysis } = require("../utils/normalize");
const { generateFallbackResumeAnalysis } = require("../utils/fallbacks");
const { generateWithRetry } = require("../services/gemini.service");
const { buildResumeAnalysisPrompt } = require("../services/prompts");
const { parseBuffer, extractText, destroyParser } = require("../services/pdf.service");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/analyze-resume",
  upload.single("resume"),
  async (req, res) => {
    let parser = null;

    try {
      // --------------------------------------
      // Check file
      // --------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error:
            "Please upload a PDF resume.",
        });
      }

      // --------------------------------------
      // Check PDF signature
      // --------------------------------------

      if (!hasPdfSignature(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          error:
            "The uploaded file is not a valid PDF resume.",
        });
      }

      // --------------------------------------
      // Extract PDF text
      // --------------------------------------

      const parseResult =
        await parseBuffer(req.file.buffer);

      parser = parseResult.parser;
      const resumeText = parseResult.text;

      if (!resumeText) {
        return res.status(400).json({
          success: false,
          error:
            "Could not extract text from this PDF.",
        });
      }

      console.log(
        "Resume text extracted successfully."
      );

      console.log(
        `Resume characters: ${resumeText.length}`
      );

      const prompt = buildResumeAnalysisPrompt({ resumeText });

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

      const analysis = normalizeResumeAnalysis(
        JSON.parse(cleanedText)
      );

      console.log(
        "Resume AI Analysis completed."
      );

      return res.json({
        success: true,
        message:
          "Resume analyzed successfully.",
        resumeText,
        analysis,
      });
    } catch (error) {
      console.error(
        "Resume Analysis Error:",
        error
      );

      // --------------------------------------
      // Emergency resume fallback
      // --------------------------------------

      console.log(
        "Using emergency resume analysis fallback..."
      );

      // Try to use extracted text if
      // available in the parser.
      let fallbackResumeText = "";

      try {
        if (parser) {
          fallbackResumeText =
            await extractText(parser);
        }
      } catch (fallbackError) {
        console.error(
          "Fallback PDF extraction error:",
          fallbackError
        );
      }

      if (!fallbackResumeText) {
        return res.status(500).json({
          success: false,
          error:
            "Failed to analyze resume. Please try again.",
          code:
            "RESUME_ANALYSIS_ERROR",
        });
      }

      const fallbackAnalysis =
        generateFallbackResumeAnalysis(
          fallbackResumeText
        );

      return res.json({
        success: true,
        message:
          "Resume text extracted successfully. Detailed AI analysis was temporarily unavailable.",
        resumeText:
          fallbackResumeText,
        analysis:
          fallbackAnalysis,
        aiFallback: true,
      });
    } finally {
      // --------------------------------------
      // Destroy PDF parser safely
      // --------------------------------------

      await destroyParser(parser);
    }
  }
);

module.exports = router;
