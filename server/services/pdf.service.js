
const pdfParse = require("pdf-parse");

async function initPdfParse() {
  // Verify that the PDF parser is available.
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
  // pdf-parse v1 does not require parser instance cleanup.
}

module.exports = {
  initPdfParse,
  parseBuffer,
  extractText,
  destroyParser,
};