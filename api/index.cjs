const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

const connectDB = require("../server/config/db");
const { initGemini } = require("../server/services/gemini.service");
const { initPdfParse } = require("../server/services/pdf.service");
const { mountRoutes } = require("../server/routes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

initGemini(process.env.GEMINI_API_KEY);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "InterviewAI backend is running",
  });
});

mountRoutes(app);

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  if (
    err instanceof multer.MulterError &&
    err.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      success: false,
      error: "Resume file must be smaller than 5 MB.",
      code: "FILE_TOO_LARGE",
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: "Unable to process the uploaded resume.",
      code: "UPLOAD_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    error: "An unexpected server error occurred.",
    code: "SERVER_ERROR",
  });
});

// Initialize services once per serverless instance.
let initializationPromise = null;

async function initialize() {
  if (!initializationPromise) {
    initializationPromise = Promise.all([
      connectDB(),
      initPdfParse(),
    ]);
  }

  return initializationPromise;
}

// Vercel invokes this handler.
module.exports = async (req, res) => {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error("Backend initialization failed:", error);

    return res.status(500).json({
      success: false,
      error: "Backend initialization failed.",
      code: "BACKEND_INIT_ERROR",
    });
  }
};