
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

const connectDB = require("./config/db");
const { initGemini } = require("./services/gemini.service");
const { initPdfParse } = require("./services/pdf.service");
const { mountRoutes } = require("./routes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

initGemini(process.env.GEMINI_API_KEY);

// Initialize MongoDB and PDF parsing only once.
let initializationPromise;

function initializeDependencies() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();
      await initPdfParse();
    })();
  }

  return initializationPromise;
}

// Wait for dependencies before handling API requests.
app.use(async (req, res, next) => {
  try {
    await initializeDependencies();
    next();
  } catch (error) {
    console.error("Backend initialization failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Backend initialization failed.",
        code: "BACKEND_INIT_ERROR",
      });
    }
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "InterviewAI backend is running",
  });
});

mountRoutes(app);

// Global error handler
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

// Vercel imports the Express app.
// Locally, start a normal Node.js server.
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 5000;

  initializeDependencies()
    .then(() => {
      app.listen(PORT, () => {
        console.log("==========================================");
        console.log("InterviewAI backend is running");
        console.log(`Server: http://localhost:${PORT}`);
        console.log("Gemini retry + fallback protection: ON");
        console.log("==========================================");
      });
    })
    .catch((error) => {
      console.error("Failed to initialize server:", error);
      process.exitCode = 1;
    });
}