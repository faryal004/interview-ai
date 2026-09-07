const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const connectDB = require("./config/db");
const Interview = require("./models/Interview");
const { cleanJsonResponse, isPlainObject, asArray, asText, asTextArray, hasPdfSignature, normalizeScore, normalizeResumeAnalysis, normalizeEvaluation } = require("./utils/normalize");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

let pdfParse;

// ==========================================
// INITIALIZE SERVER
// ==========================================

async function initializeServer() {
  try {
    await connectDB();
    const pdfParseModule = await import("pdf-parse");
    pdfParse = pdfParseModule.PDFParse;

    const app = express();

    // ==========================================
    // MIDDLEWARE
    // ==========================================

    app.use(cors());
    app.use(express.json({ limit: "10mb" }));

    // ==========================================
    // MULTER CONFIGURATION
    // ==========================================

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    });

    // ==========================================
    // GEMINI INITIALIZATION
    // ==========================================

    if (!process.env.GEMINI_API_KEY) {
      console.warn(
        "WARNING: GEMINI_API_KEY is not configured in .env"
      );
    }

    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    // ==========================================
    // GEMINI RETRY HELPER
    // ==========================================

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

    // ==========================================
    // HOME / HEALTH CHECK
    // ==========================================

    app.get("/", (req, res) => {
      res.json({
        success: true,
        message:
          "InterviewAI backend is running",
      });
    });

    // ==========================================
    // TEST GEMINI
    // ==========================================

    app.post(
      "/api/test-ai",
      async (req, res) => {
        try {
          const result =
            await generateWithRetry(
              "Say hello to InterviewAI in one short sentence.",
              3
            );

          const response =
            result.response.text();

          res.json({
            success: true,
            message: response,
          });
        } catch (error) {
          console.error(
            "Gemini Test Error:",
            error
          );

          const isRateLimited =
            Number(error?.status) === 429 ||
            String(
              error?.statusText || ""
            )
              .toLowerCase()
              .includes(
                "too many requests"
              );

          const isServiceUnavailable =
            [500, 502, 503, 504].includes(
              Number(error?.status)
            ) ||
            String(
              error?.statusText || ""
            )
              .toLowerCase()
              .includes(
                "service unavailable"
              );

          if (isRateLimited) {
            return res.status(429).json({
              success: false,
              error:
                "Gemini API quota has been reached. Please try again later.",
              code:
                "GEMINI_QUOTA_EXCEEDED",
            });
          }

          if (isServiceUnavailable) {
            return res.status(503).json({
              success: false,
              error:
                "Gemini AI is temporarily experiencing high demand. Please try again later.",
              code:
                "GEMINI_SERVICE_UNAVAILABLE",
            });
          }

          return res.status(500).json({
            success: false,
            error:
              "Failed to connect to Gemini.",
          });
        }
      }
    );

    // ==========================================
    // GENERATE INTERVIEW QUESTIONS
    // ==========================================

    app.post(
      "/api/generate-questions",
      async (req, res) => {
        const {
          role,
          experience,
          type,
          numberOfQuestions,
          resumeText,
        } = req.body;

        try {
          // --------------------------------------
          // Validation
          // --------------------------------------

          if (
            !role ||
            !experience ||
            !type ||
            !numberOfQuestions
          ) {
            return res.status(400).json({
              success: false,
              error:
                "Missing interview details.",
            });
          }

          const requestedCount =
            Math.max(
              1,
              Number(numberOfQuestions) || 5
            );

          // --------------------------------------
          // Resume section
          // --------------------------------------

          const resumeSection =
            resumeText
              ? `
CANDIDATE RESUME:
-----------------
${resumeText}
-----------------

IMPORTANT:
- Use the candidate's actual resume information.
- Ask personalized questions about real skills, technologies,
  internships, projects, education, and experience.
- Do NOT invent information that is not present in the resume.
`
              : `
No resume was provided.

Generate questions based only on:
- Job role
- Experience level
- Interview type
`;

          // --------------------------------------
          // Prompt
          // --------------------------------------

          const prompt = `
You are an expert professional interviewer.

Generate exactly ${requestedCount} realistic interview questions.

INTERVIEW DETAILS:

Job Role:
${role}

Experience Level:
${experience}

Interview Type:
${type}

${resumeSection}

QUESTION GENERATION RULES:

1. Questions must be relevant to the selected job role.

2. Difficulty must match the candidate's experience level.

3. If a resume is provided, personalize questions using actual
information from the resume.

4. Ask questions about technologies mentioned in the resume.

5. Ask questions about internships and professional experience
mentioned in the resume.

6. Ask questions about projects mentioned in the resume.

7. For project questions, ask about:
   - Candidate's role
   - Technical decisions
   - Implementation
   - Challenges
   - Problem solving

8. Do not make every question resume-based.

Mix:
   - Resume-based questions
   - Role-specific technical questions
   - Practical scenario-based questions

9. Avoid duplicate questions.

10. NEVER invent:
   - Companies
   - Projects
   - Technologies
   - Responsibilities
   - Experience

11. Questions should feel like a real professional interview.

12. Return ONLY a valid JSON array.

13. Do not include markdown.

14. Do not include code fences.

Each question object MUST contain exactly:

"question"
"category"
"difficulty"

Return ONLY valid JSON.
`;

          // --------------------------------------
          // Gemini request
          // --------------------------------------

          const result =
            await generateWithRetry(
              prompt,
              3
            );

          const text =
            result.response.text();

          const cleanedText =
            cleanJsonResponse(text);

          const questions =
            JSON.parse(cleanedText);

          // --------------------------------------
          // Validate AI questions
          // --------------------------------------

          if (
            !Array.isArray(questions) ||
            questions.length === 0
          ) {
            throw new Error(
              "Invalid questions format returned by AI."
            );
          }

          const validQuestions =
            questions
              .filter(
                (item) =>
                  isPlainObject(item) &&
                  typeof item.question === "string" &&
                  item.question.trim() &&
                  typeof item.category === "string" &&
                  item.category.trim() &&
                  typeof item.difficulty === "string" &&
                  item.difficulty.trim()
              )
              .map((item) => ({
                question: item.question.trim(),
                category: item.category.trim(),
                difficulty: item.difficulty.trim(),
              }));

          if (
            validQuestions.length === 0
          ) {
            throw new Error(
              "AI returned no valid questions."
            );
          }

          // If AI returns fewer than requested,
          // complete using local fallback.
          if (
            validQuestions.length <
            requestedCount
          ) {
            const fallback =
              generateFallbackQuestions(
                role,
                experience,
                type,
                requestedCount,
                resumeText
              );

            for (
              const fallbackQuestion of fallback
            ) {
              if (
                validQuestions.length >=
                requestedCount
              ) {
                break;
              }

              const duplicate =
                validQuestions.some(
                  (q) =>
                    q.question
                      .toLowerCase()
                      .trim() ===
                    fallbackQuestion.question
                      .toLowerCase()
                      .trim()
                );

              if (!duplicate) {
                validQuestions.push(
                  fallbackQuestion
                );
              }
            }
          }

          return res.json({
            success: true,
            questions:
              validQuestions.slice(
                0,
                requestedCount
              ),
          });
        } catch (error) {
          console.error(
            "Question Generation Error:",
            error
          );

          console.log(
            "Gemini unavailable. Using emergency fallback questions..."
          );

          const fallbackQuestions =
            generateFallbackQuestions(
              role,
              experience,
              type,
              numberOfQuestions,
              resumeText
            );

          return res.json({
            success: true,
            questions:
              fallbackQuestions,
            aiFallback: true,
            message:
              "Gemini was temporarily unavailable. Emergency fallback questions were used.",
          });
        }
      }
    );

    // ==========================================
    // EVALUATE INTERVIEW
    // ==========================================

    app.post(
      "/api/evaluate-interview",
      async (req, res) => {
        try {
          const {
            role,
            experience,
            type,
            numberOfQuestions,
            questions,
            answers,
            resumeText,
            resumeAnalysis,
          } = req.body;

          // --------------------------------------
          // Validation
          // --------------------------------------

          if (
            !role ||
            !questions ||
            !answers
          ) {
            return res.status(400).json({
              success: false,
              error:
                "Missing interview data.",
            });
          }

          const interview =
            questions.map(
              (item, index) => ({
                question:
                  item.question,
                category:
                  item.category,
                difficulty:
                  item.difficulty,
                answer:
                  answers[index] ||
                  "No answer provided",
              })
            );

          // --------------------------------------
          // Prompt
          // --------------------------------------

          const prompt = `
You are an expert professional interview evaluator and career coach.

Evaluate the candidate's interview performance using BOTH:

1. Interview questions and answers
2. Candidate's resume, when provided

JOB ROLE:
${role}

EXPERIENCE LEVEL:
${experience}

CANDIDATE RESUME:
${resumeText || "No resume was provided."}

INTERVIEW:
${JSON.stringify(
  interview,
  null,
  2
)}

Evaluate each answer based on:

- Technical correctness
- Relevance
- Completeness
- Clarity
- Communication quality
- Understanding
- Practical reasoning
- Consistency with resume

RESUME-AWARE EVALUATION RULES:

- Use the resume only as additional context.
- Do not penalize the candidate simply because something is not
  mentioned in the resume.
- If the candidate claims experience with a technology, project,
  tool, or responsibility mentioned in the resume, evaluate whether
  the answer demonstrates reasonable understanding.
- Identify inconsistencies only when there is clear evidence.
- Do not invent candidate information.
- Do not assume professional experience beyond the resume.
- Consider the candidate's experience level.
- A beginner should not be judged at senior-level depth.

Return ONLY valid JSON using EXACTLY this structure:

{
  "overallScore": 0,
  "technicalScore": 0,
  "communicationScore": 0,
  "answerQualityScore": 0,
  "summary": "",
  "strengths": [],
  "areasToImprove": [],
  "recommendation": "",
  "questionFeedback": [
    {
      "question": "",
      "score": 0,
      "feedback": "",
      "resumeContext": ""
    }
  ]
}

SCORING:

overallScore:
Overall interview performance.

technicalScore:
Technical knowledge and correctness.

communicationScore:
Clarity and communication.

answerQualityScore:
Relevance, completeness and structure.

Scores MUST be between 0 and 100.

For questionFeedback:

- Score every answer from 0 to 100.
- Explain what was done well.
- Explain what could be improved.
- resumeContext should explain whether the resume provided useful
  context for evaluating that answer.
- If resume context was not relevant, use an empty string.

Do not include markdown.
Do not include code fences.
Return ONLY valid JSON.
`;

          // --------------------------------------
          // Gemini request
          // --------------------------------------

          const result =
            await generateWithRetry(
              prompt,
              3
            );

          const text =
            result.response.text();

          const cleanedText =
            cleanJsonResponse(text);

          const evaluation = normalizeEvaluation(
            JSON.parse(cleanedText),
            questions
          );

          await Interview.create({
              role,
              experience,
              interviewType: type,
              numberOfQuestions,
              resume: {
                text: resumeText || "",
                analysis: resumeAnalysis || null,
              },
              questions,
              answers,
              evaluation,
            });

          return res.json({
            success: true,
            evaluation,
          });
        } catch (error) {
          console.error(
            "Evaluation Error:",
            error
          );

          // --------------------------------------
          // Emergency evaluation fallback
          // --------------------------------------

          console.log(
            "Using emergency evaluation fallback..."
          );

          const fallbackEvaluation =
            generateFallbackEvaluation(
              questions || [],
              answers || [],
              role || ""
            );

            await Interview.create({
              role,
              experience,
              interviewType: type,
              numberOfQuestions,
              resume: {
                text: resumeText || "",
              },
              analysis: resumeAnalysis || null,
              questions,
              answers,
              evaluation: fallbackEvaluation,
            });


          return res.json({
            success: true,
            evaluation:
              fallbackEvaluation,
            aiFallback: true,
            message:
              "Gemini was temporarily unavailable. A basic fallback evaluation was generated.",
          });
        }
      }
    );

    // ==========================================
    // ANALYZE RESUME
    // ==========================================

    app.post(
      "/api/analyze-resume",
      upload.single("resume"),
      async (req, res) => {
        let parser = null;

        try {
          // --------------------------------------
          // Check file
          // --------------------------------------

          if (!req.file) {
            return res.status(400).json({
              success: false,
              error:
                "Please upload a PDF resume.",
            });
          }

          // --------------------------------------
          // Check PDF signature
          // --------------------------------------

          if (!hasPdfSignature(req.file.buffer)) {
            return res.status(400).json({
              success: false,
              error:
                "The uploaded file is not a valid PDF resume.",
            });
          }

          // --------------------------------------
          // Extract PDF text
          // --------------------------------------

          parser = new pdfParse({
            data: req.file.buffer,
          });

          const pdfData =
            await parser.getText();

          const resumeText =
            pdfData.text.trim();

          if (!resumeText) {
            return res.status(400).json({
              success: false,
              error:
                "Could not extract text from this PDF.",
            });
          }

          console.log(
            "Resume text extracted successfully."
          );

          console.log(
            `Resume characters: ${resumeText.length}`
          );

          // --------------------------------------
          // Resume analysis prompt
          // --------------------------------------

          const prompt = `
You are an expert HR recruiter and resume analyst.

Analyze the resume below carefully.

Extract information EXACTLY from the resume.

RESUME:
${resumeText}

Return ONLY valid JSON using EXACTLY this structure:

{
  "summary": "",
  "skills": [],
  "technologies": [],
  "education": [],
  "experience": [],
  "projects": [],
  "strengths": [],
  "areasToImprove": [],
  "recommendedRoles": []
}

IMPORTANT EXTRACTION RULES:

1. EXPERIENCE:

Carefully scan the COMPLETE resume for:

- Work experience
- Internships
- Jobs
- Freelance work
- Professional roles

Do NOT return an empty experience array if work experience exists.

For every experience entry return:

{
  "jobTitle": "",
  "company": "",
  "duration": "",
  "responsibilities": []
}

2. PROJECTS:

Look for:

- Final Year Projects
- Academic Projects
- Personal Projects
- Portfolio Projects

Do NOT return an empty projects array if a project exists.

For every project return:

{
  "name": "",
  "duration": "",
  "description": "",
  "technologies": []
}

3. EDUCATION:

Extract every educational qualification.

For every education entry return:

{
  "degree": "",
  "institution": "",
  "period": ""
}

4. SKILLS:

Extract actual skills mentioned in the resume.

Do not invent skills.

5. TECHNOLOGIES:

Extract programming languages, frameworks, libraries,
databases, platforms and development tools explicitly mentioned.

6. STRENGTHS:

Identify strengths supported by the candidate's actual:

- Skills
- Experience
- Projects

7. AREAS TO IMPROVE:

Suggest reasonable improvements based only on the resume.

Do not claim that the candidate lacks a technology when that
technology is explicitly present.

8. RECOMMENDED ROLES:

Recommend realistic roles based on actual:

- Skills
- Experience
- Projects

9. ACCURACY:

NEVER invent:

- Companies
- Projects
- Technologies
- Education
- Experience

Preserve resume information accurately.

Read the COMPLETE resume before generating the JSON.

Return ONLY valid JSON.

Do not use markdown.

Do not use code fences.
`;

          // --------------------------------------
          // Gemini request
          // --------------------------------------

          const result =
            await generateWithRetry(
              prompt,
              3
            );

          const text =
            result.response.text();

          const cleanedText =
            cleanJsonResponse(text);

          const analysis = normalizeResumeAnalysis(
            JSON.parse(cleanedText)
          );

          console.log(
            "Resume AI Analysis completed."
          );

          return res.json({
            success: true,
            message:
              "Resume analyzed successfully.",
            resumeText,
            analysis,
          });
        } catch (error) {
          console.error(
            "Resume Analysis Error:",
            error
          );

          // --------------------------------------
          // Emergency resume fallback
          // --------------------------------------

          console.log(
            "Using emergency resume analysis fallback..."
          );

          // Try to use extracted text if
          // available in the parser.
          let fallbackResumeText = "";

          try {
            if (parser) {
              const fallbackPdfData =
                await parser.getText();

              fallbackResumeText =
                fallbackPdfData.text.trim();
            }
          } catch (fallbackError) {
            console.error(
              "Fallback PDF extraction error:",
              fallbackError
            );
          }

          if (!fallbackResumeText) {
            return res.status(500).json({
              success: false,
              error:
                "Failed to analyze resume. Please try again.",
              code:
                "RESUME_ANALYSIS_ERROR",
            });
          }

          const fallbackAnalysis =
            generateFallbackResumeAnalysis(
              fallbackResumeText
            );

          return res.json({
            success: true,
            message:
              "Resume text extracted successfully. Detailed AI analysis was temporarily unavailable.",
            resumeText:
              fallbackResumeText,
            analysis:
              fallbackAnalysis,
            aiFallback: true,
          });
        } finally {
          // --------------------------------------
          // Destroy PDF parser safely
          // --------------------------------------

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
      }
    );

    // ==========================================
    // GLOBAL ERROR HANDLER
    // ==========================================

    app.use(
      (err, req, res, next) => {
        console.error(
          "Unhandled server error:",
          err
        );

        if (res.headersSent) {
          return next(err);
        }

        if (
          err instanceof multer.MulterError &&
          err.code === "LIMIT_FILE_SIZE"
        ) {
          return res.status(413).json({
            success: false,
            error:
              "Resume file must be smaller than 5 MB.",
            code: "FILE_TOO_LARGE",
          });
        }

        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            error:
              "Unable to process the uploaded resume.",
            code: "UPLOAD_ERROR",
          });
        }

        return res.status(500).json({
          success: false,
          error:
            "An unexpected server error occurred.",
          code: "SERVER_ERROR",
        });
      }
    );

    app.get("/api/interviews", async (req, res) => {
        try {
        const interviews = await Interview.find()
          .sort({ createdAt: -1 });

        return res.json({
              success: true,
              interviews,
              });
            } catch (error) {
              console.error("Fetch interview history error:", error);

              return res.status(500).json({
                success: false,
                error: "Failed to fetch interview history.",
              });
            }
          });

      app.delete("/api/interviews", async (req, res) => {
          try {
            await Interview.deleteMany({});

            return res.json({
              success: true,
              message: "Interview history cleared successfully.",
            });
          } catch (error) {
            console.error("Clear interview history error:", error);

            return res.status(500).json({
              success: false,
              error: "Failed to clear interview history.",
            });
          }
        });

    // ==========================================
    // START SERVER
    // ==========================================

    const PORT =
      process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(
        "=========================================="
      );
      console.log(
        "InterviewAI backend is running"
      );
      console.log(
        `Server: http://localhost:${PORT}`
      );
      console.log(
        "Gemini retry + fallback protection: ON"
      );
      console.log(
        "=========================================="
      );
    });
  } catch (err) {
    console.error(
      "Failed to initialize server:",
      err
    );

    process.exit(1);
  }
}

// ==========================================
// INITIALIZE SERVER
// ==========================================

initializeServer();
   
