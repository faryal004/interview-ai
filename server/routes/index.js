const aiRoutes = require("./ai.routes");
const questionsRoutes = require("./questions.routes");
const evaluationRoutes = require("./evaluation.routes");
const resumeRoutes = require("./resume.routes");
const historyRoutes = require("./history.routes");

function mountRoutes(app) {
  app.use("/api", aiRoutes);
  app.use("/api", questionsRoutes);
  app.use("/api", evaluationRoutes);
  app.use("/api", resumeRoutes);
  app.use("/api", historyRoutes);
}

module.exports = { mountRoutes };
