let pdfParse = null;

async function initPdfParse() {
  const pdfParseModule = await import("pdf-parse");
  pdfParse = pdfParseModule.PDFParse;
}

async function parseBuffer(buffer) {
  const parser = new pdfParse({
    data: buffer,
  });

  const pdfData = await parser.getText();

  return {
    parser,
    text: pdfData.text.trim(),
  };
}

async function extractText(parser) {
  const pdfData = await parser.getText();
  return pdfData.text.trim();
}

async function destroyParser(parser) {
  if (parser) {
    try {
      await parser.destroy();
    } catch (destroyError) {
      console.error(
        "PDF parser cleanup error:",
        destroyError
      );
    }
  }
}

module.exports = {
  initPdfParse,
  parseBuffer,
  extractText,
  destroyParser,
};
