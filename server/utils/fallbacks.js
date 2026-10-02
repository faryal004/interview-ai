// ==========================================
// FALLBACK QUESTION GENERATOR
// ==========================================

function generateFallbackQuestions(
  role,
  experience,
  type,
  numberOfQuestions,
  resumeText = ""
) {
  const requestedCount = Math.max(
    1,
    Number(numberOfQuestions) || 5
  );

  const resume = String(
    resumeText || ""
  ).toLowerCase();

  const questions = [];

  // ------------------------------------------
  // Technology detection
  // ------------------------------------------

  const hasReact =
    resume.includes("react");

  const hasJavaScript =
    resume.includes("javascript") ||
    /\bjs\b/.test(resume);

  const hasTypeScript =
    resume.includes("typescript") ||
    /\bts\b/.test(resume);

  const hasDjango =
    resume.includes("django");

  const hasNode =
    resume.includes("node.js") ||
    resume.includes("nodejs");

  const hasExpress =
    resume.includes("express.js") ||
    resume.includes("express");

  const hasFirebase =
    resume.includes("firebase");

  const hasGit =
    resume.includes("git") ||
    resume.includes("github");

  const hasCSS =
    resume.includes("css");

  const hasHTML =
    resume.includes("html");

  const hasMySQL =
    resume.includes("mysql");

  const hasSQLite =
    resume.includes("sqlite");

  const hasMongoDB =
    resume.includes("mongodb") ||
    resume.includes("mongo db");

  const hasPython =
    resume.includes("python");

  const hasFigma =
    resume.includes("figma");

  // ------------------------------------------
  // Resume-based questions
  // ------------------------------------------

  if (hasReact) {
    questions.push({
      question:
        "You have experience with React.js. How do you structure reusable components in a React application, and how do you manage state between components?",
      category: "React.js",
      difficulty: experience,
    });
  }

  if (hasJavaScript) {
    questions.push({
      question:
        "What is the difference between synchronous and asynchronous JavaScript? Give an example of where asynchronous code is useful in a web application.",
      category: "JavaScript",
      difficulty: experience,
    });
  }

  if (hasTypeScript) {
    questions.push({
      question:
        "What advantages does TypeScript provide when developing a frontend application compared with plain JavaScript?",
      category: "TypeScript",
      difficulty: experience,
    });
  }

  if (hasCSS) {
    questions.push({
      question:
        "What is the difference between CSS Grid and Flexbox, and when would you choose one over the other?",
      category: "CSS",
      difficulty: experience,
    });
  }

  if (hasHTML) {
    questions.push({
      question:
        "How do semantic HTML elements improve the structure and accessibility of a web application?",
      category: "HTML",
      difficulty: experience,
    });
  }

  if (hasDjango) {
    questions.push({
      question:
        "You have worked with Django. How would you connect a React frontend with a Django backend, and how would you protect API endpoints?",
      category: "Backend / Django",
      difficulty: experience,
    });
  }

  if (hasPython) {
    questions.push({
      question:
        "How have you used Python in your projects, and how would you organize Python code in a maintainable application?",
      category: "Python",
      difficulty: experience,
    });
  }

  if (hasNode) {
    questions.push({
      question:
        "What is Node.js and how is it different from traditional server-side technologies? How would you use Express.js with it?",
      category: "Node.js",
      difficulty: experience,
    });
  }

  if (hasExpress) {
    questions.push({
      question:
        "How do Express.js middleware functions work, and where would you use middleware in an API?",
      category: "Express.js",
      difficulty: experience,
    });
  }

  if (hasFirebase) {
    questions.push({
      question:
        "How have you used Firebase in a web application, and what are some benefits of using a real-time backend service?",
      category: "Firebase",
      difficulty: experience,
    });
  }

  if (hasGit) {
    questions.push({
      question:
        "How do you use Git and GitHub when working on a software project with other developers?",
      category: "Git / GitHub",
      difficulty: experience,
    });
  }

  if (hasFigma) {
    questions.push({
      question:
        "How do you translate a Figma design into a responsive and reusable web interface?",
      category: "UI/UX",
      difficulty: experience,
    });
  }

  if (hasMySQL) {
    questions.push({
      question:
        "How would you design and query a MySQL database for a web application?",
      category: "MySQL",
      difficulty: experience,
    });
  }

  if (hasSQLite) {
    questions.push({
      question:
        "What are the advantages of using SQLite for a small web application or development project?",
      category: "SQLite",
      difficulty: experience,
    });
  }

  if (hasMongoDB) {
    questions.push({
      question:
        "What is MongoDB, and when would you choose a document database instead of a relational database?",
      category: "MongoDB",
      difficulty: experience,
    });
  }

  // ------------------------------------------
  // Role-specific technical questions
  // ------------------------------------------

  const roleFocuses = [
    ["frontend", "reusable, accessible, responsive user interfaces"],
    ["backend", "secure, scalable APIs and data access"],
    ["full stack", "features that span the client, API, and database"],
    ["software engineer", "reliable application features and services"],
    ["qa", "test plans, automated checks, and defect prevention"],
    ["data analyst", "data preparation, analysis, and actionable reporting"],
    ["ai engineer", "AI features, model integration, and evaluation"],
    ["data scientist", "data pipelines, model experiments, and metrics"],
    ["devops", "CI/CD pipelines, infrastructure, and observability"],
    ["ui/ux", "research-informed, accessible product experiences"],
  ];

  const normalizedRole = String(role || "").toLowerCase();
  const roleFocus =
    roleFocuses.find(([keyword]) => normalizedRole.includes(keyword))?.[1] ||
    "reliable features in the role's domain";

  questions.push({
    question:
      `As an ${experience} ${role}, how would you design and implement ${roleFocus}?`,
    category: "Role-Specific Technical",
    difficulty: experience,
  });

  questions.push({
    question:
      `How would you test the quality and correctness of your work as a ${role}?`,
    category: "Testing / Quality",
    difficulty: experience,
  });

  questions.push({
    question:
      `Describe how you would debug a production issue affecting ${roleFocus}.`,
    category: "Problem Solving",
    difficulty: experience,
  });

  questions.push({
    question:
      "How do you make technical trade-offs when performance, reliability, and delivery time conflict?",
    category: "Performance",
    difficulty: experience,
  });

  questions.push({
    question:
      "Describe a technical problem you faced while building a project and explain how you solved it.",
    category: "Problem Solving",
    difficulty: experience,
  });

  questions.push({
    question:
      "How do you test your code before considering a feature complete?",
    category: "Testing",
    difficulty: experience,
  });

  const behavioralQuestions = [
    {
      question:
        `Tell me about a time you worked with others to deliver a challenging ${role} project. What was your contribution?`,
      category: "Teamwork",
      difficulty: experience,
    },
    {
      question:
        "Describe a disagreement with a teammate or stakeholder. How did you resolve it constructively?",
      category: "Conflict Resolution",
      difficulty: experience,
    },
    {
      question:
        "Tell me about a time you had to explain a complex idea to a non-technical audience.",
      category: "Communication",
      difficulty: experience,
    },
    {
      question:
        "Describe a situation where requirements changed late in a project. How did you adapt?",
      category: "Adaptability",
      difficulty: experience,
    },
    {
      question:
        "Tell me about a mistake or setback you experienced and what you learned from it.",
      category: "Learning / Growth",
      difficulty: experience,
    },
    {
      question:
        "How do you prioritize competing tasks when several people need your help at the same time?",
      category: "Prioritization",
      difficulty: experience,
    },
    {
      question:
        "Describe a time you received difficult feedback. What did you do with it?",
      category: "Feedback",
      difficulty: experience,
    },
    {
      question:
        "Tell me about a time you took ownership or showed leadership without being asked.",
      category: "Leadership",
      difficulty: experience,
    },
  ];

  const interviewType = String(type || "Technical").toLowerCase();
  let questionsForType = questions;

  if (interviewType === "behavioral") {
    questionsForType = behavioralQuestions;
  } else if (interviewType === "mixed") {
    const mixedQuestions = [];
    const technicalCount = Math.ceil(requestedCount / 2);
    const behavioralCount = Math.floor(requestedCount / 2);

    for (let index = 0; index < technicalCount; index++) {
      if (questions[index]) {
        mixedQuestions.push(questions[index]);
      }

      if (index < behavioralCount && behavioralQuestions[index]) {
        mixedQuestions.push(behavioralQuestions[index]);
      }
    }

    questionsForType = mixedQuestions;
  }

  // ------------------------------------------
  // Remove duplicate questions
  // ------------------------------------------

  const uniqueQuestions = [];

  const seen = new Set();

  for (const item of questionsForType) {
    const key = item.question
      .toLowerCase()
      .trim();

    if (!seen.has(key)) {
      seen.add(key);
      uniqueQuestions.push(item);
    }
  }

  // ------------------------------------------
  // Guarantee requested number
  // ------------------------------------------

  const technicalFallbacks = [
    {
      question:
        `Which technical metrics would you monitor to know whether ${roleFocus} is successful?`,
      category: "Role-Specific Technical",
      difficulty: experience,
    },
    {
      question:
        `How would you document a technical decision for other ${role} team members?`,
      category: "Technical Communication",
      difficulty: experience,
    },
    {
      question:
        `What risks would you assess before releasing a change related to ${roleFocus}?`,
      category: "Risk Management",
      difficulty: experience,
    },
    {
      question:
        `How would you investigate a performance or reliability issue in ${roleFocus}?`,
      category: "Performance / Reliability",
      difficulty: experience,
    },
    {
      question:
        `How do you keep your ${role} work maintainable as requirements grow?`,
      category: "Maintainability",
      difficulty: experience,
    },
    {
      question:
        `What security or privacy considerations apply to ${roleFocus}?`,
      category: "Security / Privacy",
      difficulty: experience,
    },
    {
      question:
        `How would you evaluate whether a new tool or technology is appropriate for a ${role} project?`,
      category: "Technical Decision Making",
      difficulty: experience,
    },
  ];

  const behavioralFallbacks = [
    {
      question:
        "How do you build trust with a new teammate or stakeholder?",
      category: "Teamwork",
      difficulty: experience,
    },
    {
      question:
        "Tell me about a time you had to work effectively with limited information.",
      category: "Adaptability",
      difficulty: experience,
    },
    {
      question:
        "Describe how you handle pressure when a deadline is at risk.",
      category: "Workplace Situations",
      difficulty: experience,
    },
    {
      question:
        "Tell me about a time you helped improve a team process.",
      category: "Continuous Improvement",
      difficulty: experience,
    },
    {
      question:
        "How do you ensure quieter team members are included in a discussion?",
      category: "Inclusive Collaboration",
      difficulty: experience,
    },
    {
      question:
        "Describe a time you had to influence a decision without formal authority.",
      category: "Leadership",
      difficulty: experience,
    },
    {
      question:
        "How do you respond when a stakeholder is dissatisfied with your work?",
      category: "Stakeholder Management",
      difficulty: experience,
    },
  ];

  let genericFallbacks = technicalFallbacks;

  if (interviewType === "behavioral") {
    genericFallbacks = behavioralFallbacks;
  } else if (interviewType === "mixed") {
    genericFallbacks = [];

    for (
      let index = 0;
      index < Math.max(technicalFallbacks.length, behavioralFallbacks.length);
      index++
    ) {
      if (technicalFallbacks[index]) {
        genericFallbacks.push(technicalFallbacks[index]);
      }

      if (behavioralFallbacks[index]) {
        genericFallbacks.push(behavioralFallbacks[index]);
      }
    }
  }

  for (
    let i = 0;
    uniqueQuestions.length < requestedCount;
    i++
  ) {
    const fallback =
      genericFallbacks[
        i % genericFallbacks.length
      ];

    const uniqueFallback = {
      ...fallback,
      question:
        fallback.question +
        (i >= genericFallbacks.length
          ? ` (Scenario ${i + 1})`
          : ""),
    };

    uniqueQuestions.push(
      uniqueFallback
    );
  }

  return uniqueQuestions.slice(
    0,
    requestedCount
  );
}


// ==========================================
// FALLBACK EVALUATION
// ==========================================

function generateFallbackEvaluation(
  questions = [],
  answers = [],
  role = ""
) {
  const totalQuestions =
    Array.isArray(questions)
      ? questions.length
      : 0;

  const feedback = [];

  let answeredCount = 0;

  for (
    let index = 0;
    index < totalQuestions;
    index++
  ) {
    const question =
      questions[index];

    const answer =
      answers[index];

    const hasAnswer =
      typeof answer === "string" &&
      answer.trim().length > 0;

    if (hasAnswer) {
      answeredCount++;
    }

    const score = hasAnswer ? 60 : 0;

    feedback.push({
      question:
        question?.question || "",
      score,
      feedback: hasAnswer
        ? "Your answer was recorded. A detailed AI evaluation could not be completed because Gemini was temporarily unavailable. Review the answer for technical accuracy, relevance, clarity, and completeness."
        : "No answer was provided for this question.",
      resumeContext: "",
    });
  }

  const overallScore =
    totalQuestions > 0
      ? Math.round(
          (answeredCount /
            totalQuestions) *
            60
        )
      : 0;

  return {
    overallScore,
    technicalScore:
      overallScore,
    communicationScore:
      overallScore,
    answerQualityScore:
      overallScore,
    summary:
      `A temporary AI service issue prevented detailed evaluation of the ${role || "interview"} interview. Your responses were recorded successfully.`,
    strengths:
      answeredCount > 0
        ? [
            "Completed and submitted interview responses.",
            "Participated in the interview process.",
          ]
        : [],
    areasToImprove: [
      "Provide clear and complete answers.",
      "Support technical answers with examples where possible.",
      "Review the technical concepts related to the selected role.",
    ],
    recommendation:
      "Use the feedback as a basic indication only and try the evaluation again when the AI service is available.",
    questionFeedback: feedback,
  };
}


// ==========================================
// FALLBACK RESUME ANALYSIS
// ==========================================

function generateFallbackResumeAnalysis(
  resumeText = ""
) {
  const text = String(
    resumeText || ""
  ).trim();

  const technologies = [];

  const technologyPatterns = [
    ["React.js", /\breact(?:\.js)?\b/i],
    ["JavaScript", /\bjavascript\b/i],
    ["TypeScript", /\btypescript\b/i],
    ["Node.js", /\bnode(?:\.js|js)\b/i],
    ["Express.js", /\bexpress(?:\.js)?\b/i],
    ["Django", /\bdjango\b/i],
    ["Python", /\bpython\b/i],
    ["HTML", /\bhtml\b/i],
    ["CSS", /\bcss\b/i],
    ["MySQL", /\bmysql\b/i],
    ["MongoDB", /\bmongodb\b/i],
    ["SQLite", /\bsqlite\b/i],
    ["Firebase", /\bfirebase\b/i],
    ["Git", /\bgit\b/i],
    ["GitHub", /\bgithub\b/i],
    ["Figma", /\bfigma\b/i],
  ];

  for (const [
    name,
    pattern,
  ] of technologyPatterns) {
    if (pattern.test(text)) {
      technologies.push(name);
    }
  }

  return {
    summary:
      "Resume text was successfully extracted, but detailed AI analysis is temporarily unavailable.",
    skills: [],
    technologies,
    education: [],
    experience: [],
    projects: [],
    strengths:
      technologies.length > 0
        ? [
            "The resume contains identifiable technical skills or technologies.",
          ]
        : [],
    areasToImprove: [
      "Try resume analysis again when the AI service is available.",
    ],
    recommendedRoles: [],
  };
}


module.exports = {
  generateFallbackQuestions,
  generateFallbackEvaluation,
  generateFallbackResumeAnalysis,
};