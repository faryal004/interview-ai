
let pdfParse;
let PDFParse;
let initializationPromise;

async function initPdfParse() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { DOMMatrix } = require("@napi-rs/canvas");
      globalThis.DOMMatrix ??= DOMMatrix;

      let pdfParseModule;

      try {
        pdfParseModule = require("pdf-parse");
      } catch (error) {
        if (
          error.code !== "ERR_REQUIRE_ESM" &&
          error.code !== "ERR_REQUIRE_ASYNC_MODULE"
        ) {
          throw error;
        }

        pdfParseModule = await import("pdf-parse");
      }

      PDFParse = pdfParseModule.PDFParse;
      pdfParse =
        typeof pdfParseModule === "function"
          ? pdfParseModule
          : pdfParseModule.default;

      if (typeof PDFParse !== "function" && typeof pdfParse !== "function") {
        throw new Error("PDF parser failed to initialize.");
      }
    })();
  }

  return initializationPromise;
}

async function parseBuffer(buffer) {
  await initPdfParse();

  if (typeof PDFParse === "function") {
    const instance = new PDFParse({ data: buffer });
    const pdfData = await instance.getText();
    const text = (pdfData.text || "").trim();

    return {
      parser: { text, instance },
      text,
    };
  }

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
  await parser?.instance?.destroy?.();
}

module.exports = {
  initPdfParse,
  parseBuffer,
  extractText,
  destroyParser,
};