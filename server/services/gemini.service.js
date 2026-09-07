const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;

function initGemini(apiKey) {
  if (!apiKey) {
    console.warn(
      "WARNING: GEMINI_API_KEY is not configured in .env"
    );
  }

  genAI = new GoogleGenerativeAI(apiKey);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
  const status = Number(error?.status);

  const statusText =
    String(error?.statusText || "").toLowerCase();

  const message =
    String(error?.message || "").toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    statusText.includes("too many requests") ||
    statusText.includes("service unavailable") ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("service unavailable") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable")
  );
}

async function generateWithRetry(
  prompt,
  maxRetries = 3
) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
  });

  let lastError;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `Gemini request - Attempt ${
          attempt + 1
        }/${maxRetries + 1}`
      );

      const result = await model.generateContent(
        prompt
      );

      console.log(
        "Gemini request successful."
      );

      return result;
    } catch (error) {
      lastError = error;

      console.error(
        "Gemini request failed:",
        error?.status,
        error?.statusText,
        error?.message
      );

      const retryable =
        isRetryableGeminiError(error);

      if (!retryable) {
        throw error;
      }

      if (attempt === maxRetries) {
        console.error(
          "Gemini retry limit reached."
        );
        break;
      }

      const delay =
        2000 * Math.pow(2, attempt);

      console.log(
        `Waiting ${
          delay / 1000
        } seconds before retry...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

module.exports = {
  initGemini,
  generateWithRetry,
};
