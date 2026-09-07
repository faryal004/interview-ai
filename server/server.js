const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const connectDB = require("./config/db");
const Interview = require("./models/Interview");
const { cleanJsonResponse, isPlainObject, asArray, asText, asTextArray, hasPdfSignature, normalizeScore, normalizeResumeAnalysis, normalizeEvaluation } = require("./utils/normalize");
const { generateFallbackQuestions, generateFallbackEvaluation, generateFallbackResumeAnalysis } = require("./utils/fallbacks");
const { TEST_AI_PROMPT, buildQuestionsPrompt, buildEvaluationPrompt, buildResumeAnalysisPrompt } = require("./services/prompts");
const { initGemini, generateWithRetry } = require("./services/gemini.service");
const { initPdfParse, parseBuffer, extractText, destroyParser } = require("./services/pdf.service");

dotenv.config();


// ==========================================
// INITIALIZE SERVER
// ==========================================

async function initializeServer() {
  try {
    await connectDB();
    await initPdfParse();

    const app = express();

    // ==========================================
    // MIDDLEWARE
    // ==========================================

    app.use(cors());
    app.use(express.json({ limit: "10mb" }));

    // ==========================================
    // MULTER CONFIGURATION
    // ==========================================

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    });

    initGemini(process.env.GEMINI_API_KEY);

    // ==========================================
    // HOME / HEALTH CHECK
    // ==========================================

    app.get("/", (req, res) => {
      res.json({
        success: true,
        message:
          "InterviewAI backend is running",
      });
    });

    // ==========================================
    // TEST GEMINI
    // ==========================================

    app.post(
      "/api/test-ai",
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

    // ==========================================
    // GENERATE INTERVIEW QUESTIONS
    // ==========================================

    app.post(
      "/api/generate-questions",
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

    // ==========================================
    // EVALUATE INTERVIEW
    // ==========================================

    app.post(
      "/api/evaluate-interview",
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

          await Interview.create({
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

            await Interview.create({
              role,
              experience,
              interviewType: type,
              numberOfQuestions,
              resume: {
                text: resumeText || "",
              },
              analysis: resumeAnalysis || null,
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

    // ==========================================
    // ANALYZE RESUME
    // ==========================================

    app.post(
      "/api/analyze-resume",
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

          const { parser, text: resumeText } =
            await parseBuffer(req.file.buffer);

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

    // ==========================================
    // GLOBAL ERROR HANDLER
    // ==========================================

    app.use(
      (err, req, res, next) => {
        console.error(
          "Unhandled server error:",
          err
        );

        if (res.headersSent) {
          return next(err);
        }

        if (
          err instanceof multer.MulterError &&
          err.code === "LIMIT_FILE_SIZE"
        ) {
          return res.status(413).json({
            success: false,
            error:
              "Resume file must be smaller than 5 MB.",
            code: "FILE_TOO_LARGE",
          });
        }

        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            error:
              "Unable to process the uploaded resume.",
            code: "UPLOAD_ERROR",
          });
        }

        return res.status(500).json({
          success: false,
          error:
            "An unexpected server error occurred.",
          code: "SERVER_ERROR",
        });
      }
    );

    app.get("/api/interviews", async (req, res) => {
        try {
        const interviews = await Interview.find()
          .sort({ createdAt: -1 });

        return res.json({
              success: true,
              interviews,
              });
            } catch (error) {
              console.error("Fetch interview history error:", error);

              return res.status(500).json({
                success: false,
                error: "Failed to fetch interview history.",
              });
            }
          });

      app.delete("/api/interviews", async (req, res) => {
          try {
            await Interview.deleteMany({});

            return res.json({
              success: true,
              message: "Interview history cleared successfully.",
            });
          } catch (error) {
            console.error("Clear interview history error:", error);

            return res.status(500).json({
              success: false,
              error: "Failed to clear interview history.",
            });
          }
        });

    // ==========================================
    // START SERVER
    // ==========================================

    const PORT =
      process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        "=========================================="
      );
      console.log(
        "InterviewAI backend is running"
      );
      console.log(
        `Server: http://localhost:${PORT}`
      );
      console.log(
        "Gemini retry + fallback protection: ON"
      );
      console.log(
        "=========================================="
      );
    });
  } catch (err) {
    console.error(
      "Failed to initialize server:",
      err
    );

    process.exit(1);
  }
}

// ==========================================
// INITIALIZE SERVER
// ==========================================

initializeServer();
   
