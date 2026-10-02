
const pdfParse = require("pdf-parse");

async function initPdfParse() {
  if (typeof pdfParse !== "function") {
    throw new Error("PDF parser failed to initialize.");
  }
}

async function parseBuffer(buffer) {
  const pdfData = await pdfParse(buffer);
  const text = (pdfData.text || "").trim();

  return {
    parser: { text },
    text,
  };
}

async function extractText(parser) {
  return (parser?.text || "").trim();
}

async function destroyParser(parser) {
  // No cleanup required for pdf-parse v1.
}

module.exports = {
  initPdfParse,
  parseBuffer,
  extractText,
  destroyParser,
};