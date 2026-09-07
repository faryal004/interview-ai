function cleanJsonResponse(text) {
  if (!text) {
    throw new Error(
      "Empty response received from AI."
    );
  }

  let cleaned = String(text).trim();

  // Remove markdown code fences
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Sometimes AI returns extra text before JSON.
  // Try to locate the first JSON object/array.
  const firstArray = cleaned.indexOf("[");
  const firstObject = cleaned.indexOf("{");

  let start = -1;

  if (
    firstArray !== -1 &&
    firstObject !== -1
  ) {
    start = Math.min(
      firstArray,
      firstObject
    );
  } else if (firstArray !== -1) {
    start = firstArray;
  } else if (firstObject !== -1) {
    start = firstObject;
  }

  if (start > 0) {
    cleaned = cleaned.substring(start);
  }

  return cleaned.trim();
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asTextArray(value) {
  return asArray(value).filter(
    (item) => typeof item === "string"
  );
}

function hasPdfSignature(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }

  return buffer
    .subarray(0, 1024)
    .toString("ascii")
    .includes("%PDF-");
}

function normalizeScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeResumeAnalysis(analysis) {
  if (!isPlainObject(analysis)) {
    throw new Error("Invalid resume analysis format returned by AI.");
  }

  return {
    summary: asText(analysis.summary),
    skills: asTextArray(analysis.skills),
    technologies: asTextArray(analysis.technologies),
    education: asArray(analysis.education)
      .filter(isPlainObject)
      .map((item) => ({
        degree: asText(item.degree),
        institution: asText(item.institution),
        period: asText(item.period),
      })),
    experience: asArray(analysis.experience)
      .filter(isPlainObject)
      .map((item) => ({
        jobTitle: asText(item.jobTitle),
        company: asText(item.company),
        duration: asText(item.duration),
        responsibilities: asTextArray(item.responsibilities),
      })),
    projects: asArray(analysis.projects)
      .filter(isPlainObject)
      .map((item) => ({
        name: asText(item.name),
        duration: asText(item.duration),
        description: asText(item.description),
        technologies: asTextArray(item.technologies),
      })),
    strengths: asTextArray(analysis.strengths),
    areasToImprove: asTextArray(
      analysis.areasToImprove ?? analysis.improvements
    ),
    recommendedRoles: asTextArray(analysis.recommendedRoles),
  };
}

function normalizeEvaluation(evaluation, questions = []) {
  if (!isPlainObject(evaluation)) {
    throw new Error("Invalid evaluation format returned by AI.");
  }

  const questionList = asArray(questions);
  const sourceFeedback = asArray(evaluation.questionFeedback);
  const feedbackCount = Math.max(
    questionList.length,
    sourceFeedback.length
  );

  return {
    overallScore: normalizeScore(evaluation.overallScore),
    technicalScore: normalizeScore(evaluation.technicalScore),
    communicationScore: normalizeScore(evaluation.communicationScore),
    answerQualityScore: normalizeScore(evaluation.answerQualityScore),
    summary: asText(evaluation.summary),
    strengths: asTextArray(evaluation.strengths),
    areasToImprove: asTextArray(evaluation.areasToImprove),
    recommendation: asText(evaluation.recommendation),
    questionFeedback: Array.from(
      { length: feedbackCount },
      (_, index) => {
        const feedback = isPlainObject(sourceFeedback[index])
          ? sourceFeedback[index]
          : {};
        const question = isPlainObject(questionList[index])
          ? questionList[index]
          : {};

        return {
          question: asText(feedback.question, asText(question.question)),
          score: normalizeScore(
            feedback.score ??
              feedback.answerScore ??
              feedback.qualityScore
          ),
          feedback: asText(
            feedback.feedback ??
              feedback.comment ??
              feedback.evaluation ??
              feedback.explanation
          ),
          resumeContext: asText(feedback.resumeContext),
        };
      }
    ),
  };
}

module.exports = {
  cleanJsonResponse,
  isPlainObject,
  asArray,
  asText,
  asTextArray,
  hasPdfSignature,
  normalizeScore,
  normalizeResumeAnalysis,
  normalizeEvaluation,
};
