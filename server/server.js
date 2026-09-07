const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const connectDB = require("./config/db");
const { initGemini } = require("./services/gemini.service");
const { initPdfParse } = require("./services/pdf.service");
const { mountRoutes } = require("./routes");

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
    // API ROUTES
    // ==========================================

    mountRoutes(app);

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
