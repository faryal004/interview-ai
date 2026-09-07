import { useCallback, useEffect, useState, useRef } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [page, setPage] = useState("home");

  const [interviewData, setInterviewData] = useState({
    role: "Frontend Developer",
    experience: "Entry Level",
    type: "Technical",
    questions: 5,
  });

  const [customRole, setCustomRole] = useState("");

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAnswerDirty, setIsAnswerDirty] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationError, setEvaluationError] = useState("");
  const [completedAnswers, setCompletedAnswers] = useState([]);
  const [interviewHistory, setInterviewHistory] = useState(() => {
      try {
        const savedHistory = localStorage.getItem("interviewHistory");
        return savedHistory ? JSON.parse(savedHistory) : [];
      } catch (error) {
        console.error("History load error:", error);
        return [];
      }
    });
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isEvaluatingRef = useRef(false);
  const [voiceLanguage, setVoiceLanguage] = useState("en-PK");

  const getEffectiveRole = () =>
    interviewData.role === "Other / Custom Role"
      ? customRole.trim()
      : interviewData.role;

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const stopVoiceInput = useCallback((abort = false) => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setIsListening(false);
      return;
    }

    try {
      if (abort) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognitionRef.current = null;
        recognition.abort();
        setIsListening(false);
      } else {
        recognition.stop();
      }
    } catch (error) {
      console.error("Speech recognition stop error:", error);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (page !== "interview") {
      stopVoiceInput(true);
    }

    return () => {
      if (page === "interview") {
        stopVoiceInput(true);
      }
    };
  }, [page, stopVoiceInput]);
  

const analyzeResume = async () => {
  if (!resume) {
    alert("Please select a PDF resume first.");
    return;
  }

  try {
    setAnalyzingResume(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", resume);

    const response = await fetch(
      `${API_BASE_URL}/api/analyze-resume`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to analyze resume");
    }

    console.log("Resume Analysis:", data.analysis);

    setResumeText(data.resumeText);
    setResumeAnalysis(data.analysis);

  } catch (error) {
    console.error("Resume Analysis Error:", error);
    setError(
      error.message || "Unable to analyze resume. Please try again."
    );
  } finally {
    setAnalyzingResume(false);
  }
};


  const startInterview = async () => {
    const selectedRole = getEffectiveRole();

    if (!selectedRole) {
      setError("Please enter a job role.");
      return;
    }
  try {
    setLoadingQuestions(true);
    setError("");

    const response = await fetch(
      `${API_BASE_URL}/api/generate-questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            role: selectedRole,
            experience: interviewData.experience,
            type: interviewData.type,
            numberOfQuestions: interviewData.questions,
            resumeText: resumeText,
          }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to generate questions");
    }

    setQuestions(data.questions);
    setCurrentQuestion(0);
    setPage("interview");
  } catch (error) {
    console.error(error);
    setError("Unable to generate interview questions. Please try again.");
  } finally {
    setLoadingQuestions(false);
  }
};

const toggleVoiceInput = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Voice input is not supported in this browser. Please use Google Chrome."
    );
    return;
  }

  if (isListening) {
    stopVoiceInput();
    return;
  }

  if (recognitionRef.current) {
    stopVoiceInput();
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = voiceLanguage;
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    if (recognitionRef.current === recognition) {
      setIsListening(true);
    }
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      setAnswer((previous) => {
        return previous
          ? `${previous} ${finalTranscript}`
          : finalTranscript;
      });
      setIsAnswerDirty(true);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (recognitionRef.current === recognition) {
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  recognition.onend = () => {
    if (recognitionRef.current === recognition) {
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  recognitionRef.current = recognition;
  try {
    recognition.start();
  } catch (error) {
    console.error("Speech recognition start error:", error);
    recognitionRef.current = null;
    setIsListening(false);
  }
};
  const saveInterviewToHistory = (evaluationResult, finalAnswers) => {
  const historyItem = {
    id: Date.now(),
    date: new Date().toLocaleString(),

    role: getEffectiveRole(),
    experience: interviewData.experience,
    type: interviewData.type,

    overallScore: evaluationResult?.overallScore ?? 0,
    technicalScore: evaluationResult?.technicalScore ?? 0,
    communicationScore: evaluationResult?.communicationScore ?? 0,
    answerQualityScore: evaluationResult?.answerQualityScore ?? 0,

    summary: evaluationResult?.summary || "",
    recommendation: evaluationResult?.recommendation || "",

    strengths: evaluationResult?.strengths || [],
    areasToImprove: evaluationResult?.areasToImprove || [],
    questionFeedback: evaluationResult?.questionFeedback || [],

    questions: questions,
    answers: finalAnswers,
  };

  setInterviewHistory((previousHistory) => {
    const updatedHistory = [historyItem, ...previousHistory];

    localStorage.setItem(
      "interviewHistory",
      JSON.stringify(updatedHistory)
    );

    return updatedHistory;
  });
};

const evaluateInterview = async (finalAnswers) => {
  if (isEvaluatingRef.current) {
    return;
  }

  const submittedAnswers = [...finalAnswers];

  try {
    isEvaluatingRef.current = true;
    setLoadingEvaluation(true);
    setError("");
    setEvaluationError("");
    setCompletedAnswers(submittedAnswers);

    const response = await fetch(
       `${API_BASE_URL}/api/evaluate-interview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: getEffectiveRole(),
          experience: interviewData.experience,
          questions,
          answers: submittedAnswers,
          resumeText: resumeText,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Evaluation failed");
    }

   setEvaluation(data.evaluation);

    saveInterviewToHistory(data.evaluation, submittedAnswers);

    stopVoiceInput(true);
    setPage("evaluation");
  } catch (error) {
    console.error(error);
    setEvaluationError(
      error.message ||
        "Unable to evaluate your interview. Your answers are saved—please try again."
    );
  } finally {
    setLoadingEvaluation(false);
    isEvaluatingRef.current = false;
  }
};

const previousQuestion = () => {
  if (currentQuestion > 0) {
    stopVoiceInput(true);
    const updatedAnswers = [...answers];

    if (isAnswerDirty || updatedAnswers[currentQuestion] === undefined) {
      updatedAnswers[currentQuestion] = answer;
    }

    setAnswers(updatedAnswers);

    const previousIndex = currentQuestion - 1;

    setCurrentQuestion(previousIndex);
    
    setAnswer(updatedAnswers[previousIndex] || "");
    setIsAnswerDirty(false);
  }
};

 const nextQuestion = () => {
  stopVoiceInput(true);
  const updatedAnswers = [...answers];

  if (isAnswerDirty || updatedAnswers[currentQuestion] === undefined) {
    updatedAnswers[currentQuestion] = answer;
  }

  setAnswers(updatedAnswers);

  if (currentQuestion < questions.length - 1) {
    const nextIndex = currentQuestion + 1;

    setCurrentQuestion(nextIndex);
    setAnswer(updatedAnswers[nextIndex] || "");
    setIsAnswerDirty(false);
  } else {
    evaluateInterview(updatedAnswers);
  }
};

// ---------------- HISTORY PAGE ----------------

if (page === "history") {
  const totalInterviews = interviewHistory.length;

  const averageScore =
    totalInterviews > 0
      ? Math.round(
          interviewHistory.reduce(
            (sum, item) => sum + Number(item.overallScore || 0),
            0
          ) / totalInterviews
        )
      : 0;

  const bestScore =
    totalInterviews > 0
      ? Math.max(
          ...interviewHistory.map((item) =>
            Number(item.overallScore || 0)
          )
        )
      : 0;

  return (
    <div className="history-page">
      <div className="history-container">

        <div className="history-header">
          <button
            className="back-button"
            onClick={() => setPage("home")}
          >
            ← Back
          </button>

          <span>YOUR PROGRESS</span>

          <h1>Interview History</h1>

          <p>
            Review your previous interviews and track your progress.
          </p>
        </div>

        {totalInterviews > 0 ? (
          <>
            {/* SUMMARY STATS */}

            <div className="history-stats">

              <div className="history-stat-card">
                <span>🎯</span>
                <div>
                  <strong>{totalInterviews}</strong>
                  <p>Total Interviews</p>
                </div>
              </div>

              <div className="history-stat-card">
                <span>📊</span>
                <div>
                  <strong>{averageScore}</strong>
                  <p>Average Score</p>
                </div>
              </div>

              <div className="history-stat-card">
                <span>🏆</span>
                <div>
                  <strong>{bestScore}</strong>
                  <p>Best Score</p>
                </div>
              </div>

            </div>

            {/* HISTORY LIST */}

            <div className="history-section">

              <div className="section-title">
                <span>PREVIOUS SESSIONS</span>
                <h2>Your Interviews</h2>
              </div>

              <div className="history-list">

                {interviewHistory.map((item) => (
                  <div className="history-card" key={item.id}>

                    <div className="history-card-main">

                      <div>
                        <span className="history-date">
                          {item.date}
                        </span>

                        <h3>{item.role}</h3>

                        <p>
                          {item.experience} • {item.type} Interview
                        </p>
                      </div>

                      <div className="history-score">
                        <strong>
                          {item.overallScore}
                        </strong>
                        <span>/100</span>
                      </div>

                    </div>

                    <div className="history-score-row">

                      <span>
                        💻 Technical:{" "}
                        <strong>{item.technicalScore}</strong>
                      </span>

                      <span>
                        🗣️ Communication:{" "}
                        <strong>{item.communicationScore}</strong>
                      </span>

                      <span>
                        📝 Answer Quality:{" "}
                        <strong>{item.answerQualityScore}</strong>
                      </span>

                    </div>

                    <button
                      className="primary-button history-view-button"
                      onClick={() => {
                        setInterviewData({
                          role: item.role,
                          experience: item.experience,
                          type: item.type,
                          questions: item.questions?.length || 5,
                        });

                        setQuestions(item.questions || []);
                        setAnswers(item.answers || []);

                        setEvaluation({
                          overallScore: item.overallScore,
                          technicalScore: item.technicalScore,
                          communicationScore: item.communicationScore,
                          answerQualityScore: item.answerQualityScore,
                          summary: item.summary,
                          recommendation: item.recommendation,
                          strengths: item.strengths,
                          areasToImprove: item.areasToImprove,
                          questionFeedback: item.questionFeedback,
                        });

                        setPage("evaluation");
                      }}
                    >
                      View Report →
                    </button>

                  </div>
                ))}

              </div>
            </div>

            <div className="history-actions">
              <button
                className="secondary-button"
                onClick={() => setPage("setup")}
              >
                + Start New Interview
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to clear all interview history?"
                    )
                  ) {
                    localStorage.removeItem("interviewHistory");
                    setInterviewHistory([]);
                  }
                }}
              >
                🗑️ Clear History
              </button>
            </div>
          </>
        ) : (
          <div className="history-empty">

            <div className="history-empty-icon">📊</div>

            <h2>No Interview History Yet</h2>

            <p>
              Complete your first AI interview and your report
              will automatically appear here.
            </p>

            <button
              className="primary-button"
              onClick={() => setPage("setup")}
            >
              Start Your First Interview →
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

  // ---------------- INTERVIEW PAGE ----------------

// ---------------- EVALUATION PAGE ----------------

if (page === "evaluation") {
  const score = Number(evaluation?.overallScore || 0);
  const questionFeedback = asArray(evaluation?.questionFeedback);

  const getScoreMessage = () => {
    if (score >= 90) return "Outstanding Performance! 🏆";
    if (score >= 80) return "Excellent Performance! 🎉";
    if (score >= 70) return "Good Performance! 👍";
    if (score >= 60) return "Decent Performance! 💪";
    return "Keep Practicing! 🚀";
  };

  const getScoreClass = () => {
    if (score >= 80) return "score-excellent";
    if (score >= 60) return "score-good";
    return "score-needs-improvement";
  };

  return (
    <div className="evaluation-page">
      <div className="evaluation-container">

        {/* Header */}
        <div className="evaluation-header">
          <span>INTERVIEW COMPLETE</span>

          <h1>Your AI Interview Report</h1>

          <p>
            Here's how you performed in your{" "}
            <strong>{getEffectiveRole()}</strong> interview.
          </p>
        </div>

        {loadingEvaluation ? (
          <div className="loading-card">
            <div className="loading-icon">🤖</div>

            <h2>AI is evaluating your interview...</h2>

            <p>
              We're analyzing your answers for technical accuracy,
              communication, clarity, and overall quality.
            </p>

            <div className="evaluation-loading-bar">
              <span></span>
            </div>
          </div>
        ) : evaluation ? (
          <>

            {/* ================= OVERALL SCORE ================= */}

            <div className="overall-score-card">

              <div className={`large-score-circle ${getScoreClass()}`}>
                <strong>{score}</strong>
                <span>/100</span>
              </div>

              <div className="overall-score-content">

                <span className="score-label">
                  OVERALL SCORE
                </span>

                <h2>{getScoreMessage()}</h2>

                <p>
                  {evaluation.summary ||
                    "Your interview has been evaluated by AI based on your answers."}
                </p>

              </div>

            </div>


            {/* ================= SCORE BREAKDOWN ================= */}

            <div className="section-title">
              <span>PERFORMANCE</span>
              <h2>Score Breakdown</h2>
            </div>

            <div className="score-grid">

              <div className="score-item">
                <div className="score-item-top">
                  <span>💻 Technical Knowledge</span>

                  <strong>
                    {evaluation.technicalScore ?? 0}/100
                  </strong>
                </div>

                <div className="score-progress">
                  <span
                    style={{
                      width: `${evaluation.technicalScore ?? 0}%`,
                    }}
                  ></span>
                </div>
              </div>


              <div className="score-item">
                <div className="score-item-top">
                  <span>🗣️ Communication</span>

                  <strong>
                    {evaluation.communicationScore ?? 0}/100
                  </strong>
                </div>

                <div className="score-progress">
                  <span
                    style={{
                      width: `${evaluation.communicationScore ?? 0}%`,
                    }}
                  ></span>
                </div>
              </div>


              <div className="score-item">
                <div className="score-item-top">
                  <span>📝 Answer Quality</span>

                  <strong>
                    {evaluation.answerQualityScore ?? 0}/100
                  </strong>
                </div>

                <div className="score-progress">
                  <span
                    style={{
                      width: `${evaluation.answerQualityScore ?? 0}%`,
                    }}
                  ></span>
                </div>
              </div>

            </div>


            {/* ================= SUMMARY ================= */}

            <div className="summary-card">

              <div className="summary-icon">🤖</div>

              <div>
                <span>AI SUMMARY</span>

                <h3>Interview Performance Overview</h3>

                <p>
                  {evaluation.summary ||
                    "No summary was provided by the AI."}
                </p>
              </div>

            </div>


            {/* ================= STRENGTHS + IMPROVEMENTS ================= */}

            <div className="feedback-grid">

              <div className="feedback-card strengths-card">

                <div className="feedback-heading">
                  <div className="feedback-icon">💪</div>

                  <div>
                    <span>WHAT YOU DID WELL</span>
                    <h3>Strengths</h3>
                  </div>
                </div>

                {evaluation.strengths?.length > 0 ? (
                  <ul>
                    {evaluation.strengths.map((item, index) => (
                      <li key={index}>
                        <span className="list-check">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No strengths provided.</p>
                )}

              </div>


              <div className="feedback-card improvement-card">

                <div className="feedback-heading">
                  <div className="feedback-icon">🎯</div>

                  <div>
                    <span>FOCUS AREAS</span>
                    <h3>Areas to Improve</h3>
                  </div>
                </div>

                {evaluation.areasToImprove?.length > 0 ? (
                  <ul>
                    {evaluation.areasToImprove.map((item, index) => (
                      <li key={index}>
                        <span className="list-number">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No improvement areas provided.</p>
                )}

              </div>

            </div>


            {/* ================= QUESTION FEEDBACK ================= */}

            <div className="question-feedback-section">

              <div className="section-title">
                <span>DETAILED ANALYSIS</span>
                <h2>Question-by-Question Feedback</h2>

                <p>
                  See how the AI evaluated each of your answers.
                </p>
              </div>


              <div className="question-feedback-list">

                {questionFeedback.length > 0 ? (

                  questionFeedback.map(
                    (feedback, index) => {

                      const question =
                        questions[index];

                      const questionScore =
                        Number(
                          feedback.score ??
                          feedback.answerScore ??
                          feedback.qualityScore ??
                          0
                        );

                      return (
                        <div
                          className="question-feedback-card"
                          key={index}
                        >

                          <div className="question-feedback-header">

                            <div>
                              <span className="question-number">
                                QUESTION {index + 1}
                              </span>

                              <h3>
                                {question?.question ||
                                  feedback.question ||
                                  `Question ${index + 1}`}
                              </h3>
                            </div>

                            <div className="question-score">
                              <strong>
                                {questionScore}
                              </strong>

                              <span>/100</span>
                            </div>

                          </div>


                          <div className="question-feedback-body">

                            <div className="answer-preview">

                              <span>YOUR ANSWER</span>

                              <p>
                                {answers[index] ||
                                  "No answer provided."}
                              </p>

                            </div>


                            <div className="ai-feedback">

                              <span>🤖 AI FEEDBACK</span>

                              <p>
                                {feedback.feedback ||
                                  feedback.comment ||
                                  feedback.evaluation ||
                                  feedback.explanation ||
                                  "No detailed feedback provided."}
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )

                ) : (

                  <div className="empty-feedback">
                    <div>📊</div>

                    <h3>Detailed feedback unavailable</h3>

                    <p>
                      The AI did not return question-level
                      feedback for this interview.
                    </p>
                  </div>

                )}

              </div>

            </div>


            {/* ================= AI RECOMMENDATION ================= */}

            <div className="recommendation-card">

              <div className="recommendation-icon">
                🚀
              </div>

              <div>

                <span>PERSONALIZED AI RECOMMENDATION</span>

                <h3>What's Next?</h3>

                <p>
                  {evaluation.recommendation ||
                    "Keep practicing and focus on improving your weaker areas."}
                </p>

              </div>

            </div>


            {/* ================= ACTIONS ================= */}

            <div className="evaluation-actions">

              <button
                className="secondary-button"
                onClick={() => {
                  setAnswers([]);
                  setEvaluation(null);
                  setCompletedAnswers([]);
                  setEvaluationError("");
                  setAnswer("");
                  setCurrentQuestion(0);
                  setPage("setup");
                }}
              >
                ← Practice Again
              </button>

              <button
                className="primary-button"
                onClick={() => window.print()}
              >
                🖨️ Print Report
              </button>

            </div>

          </>
        ) : (
          <div className="empty-feedback">

            <div>📊</div>

            <h3>No evaluation available</h3>

            <p>
              Complete an interview to receive your AI evaluation.
            </p>

            <button
              className="primary-button"
              onClick={() => setPage("setup")}
            >
              Start Interview →
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
  if (page === "interview") {
   const progress =
  questions.length > 0
    ? ((currentQuestion + 1) / questions.length) * 100
    : 0;
    return (
      <div className="interview-page">
        <div className="interview-container">

          <div className="interview-top">
            <button
              className="back-button"
              onClick={() => {
                stopVoiceInput(true);
                setPage("setup");
              }}
            >
              ← Exit Interview
            </button>

            <div className="interview-title">
              <span>AI INTERVIEW</span>
              <h2>{getEffectiveRole()}</h2>
            </div>

            <div className="question-counter">
              {currentQuestion + 1} / {questions.length}
            </div>
          </div>

          <div className="progress">
            <span style={{ width: `${progress}%` }}></span>
          </div>

          <div className="interview-card">

            <div className="question-label">
              QUESTION {currentQuestion + 1}
            </div>

           <h1>{questions[currentQuestion]?.question}</h1>
           <div className="question-meta">
               <span>{questions[currentQuestion]?.category}</span>
              <span>{questions[currentQuestion]?.difficulty}</span>
           </div>

            <p className="answer-instruction">
              Take a moment to think about your answer, then respond
              using voice or text.
            </p>

           <div className="answer-area">
              <textarea
                 placeholder="Type your answer here..."
                 rows="7"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setIsAnswerDirty(true);
                }}
              ></textarea>

              <div className="voice-area">
                <div className="voice-language">
                  <label>Voice Language:</label>

                  <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    disabled={isListening}
                  >
                    <option value="en-PK">English</option>
                    <option value="ur-PK">Urdu</option>
                  </select>
                </div>

                <button
                  className={`mic-button ${isListening ? "listening" : ""}`}
                  onClick={toggleVoiceInput}
                >
                  {isListening ? "⏹️" : "🎙️"}
                </button>

                <span>
                  {isListening ? "Listening... Speak your answer" : "Click to answer by voice"}
                </span>
             </div>
            </div>

           {loadingEvaluation && (
             <div className="loading-card" role="status">
               <h3>Evaluating your interview...</h3>
               <p>Please wait while we analyze your answers.</p>
             </div>
           )}

           {evaluationError && (
             <div className="error-message" role="alert">
               <p>
                 Unable to evaluate your interview. Your answers have been saved.
               </p>
               <button
                 className="secondary-button"
                 onClick={() => evaluateInterview(completedAnswers)}
                 disabled={loadingEvaluation}
               >
                 Retry Evaluation
               </button>
             </div>
           )}

           <div className="interview-actions">

            <button
              className="secondary-button"
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </button>

            <button
              className="primary-button"
              onClick={nextQuestion}
              disabled={loadingEvaluation}
            >
              {currentQuestion === questions.length - 1
                ? loadingEvaluation
                  ? "Evaluating..."
                  : "Finish Interview"
                : "Next Question →"}
            </button>

          </div>

          </div>

          <div className="interview-tip">
            💡 <strong>Tip:</strong> Give specific examples from your
            experience when answering.
          </div>

        </div>
      </div>
    );
  }

  // ---------------- SETUP PAGE ----------------

  if (page === "setup") {
    return (
      <div className="setup-page">
        <div className="setup-card">

          <button
            className="back-button"
            onClick={() => setPage("home")}
          >
            ← Back
          </button>

          <div className="setup-heading">
            <span>INTERVIEW SETUP</span>

            <h1>Let's prepare your interview</h1>

            <p>
              Tell us a little about the interview you want to practice.
            </p>
          </div>

         <div className="form-group">
          <label>Job Role</label>

          <select
            value={interviewData.role}
            onChange={(e) => {
              const selectedRole = e.target.value;

              setInterviewData({
                ...interviewData,
                role: selectedRole,
              });

              if (selectedRole !== "Other / Custom Role") {
                setCustomRole("");
              }
            }}
          >
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Full Stack Developer">Full Stack Developer</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="QA Engineer">QA Engineer</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="AI Engineer">AI Engineer</option>
            <option value="Data Scientist">Data Scientist</option>
            <option value="DevOps Engineer">DevOps Engineer</option>
            <option value="UI/UX Designer">UI/UX Designer</option>
            <option value="Other / Custom Role">Other / Custom Role</option>
          </select>

          {interviewData.role === "Other / Custom Role" && (
            <div className="custom-role-input">
              <label>Enter your job role</label>

              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. Machine Learning Engineer"
              />
            </div>
          )}
        </div>

          <div className="form-group">
            <label>Experience Level</label>

            <select
              value={interviewData.experience}
              onChange={(e) =>
                setInterviewData({
                  ...interviewData,
                  experience: e.target.value,
                })
              }
            >
              <option>Entry Level</option>
              <option>Junior</option>
              <option>Mid Level</option>
              <option>Senior</option>
            </select>
          </div>

          <div className="form-group">
            <label>Interview Type</label>

            <div className="type-options">

              {["Technical", "Behavioral", "Mixed"].map((type) => (
                <button
                  key={type}
                  className={`type-option ${
                    interviewData.type === type ? "selected" : ""
                  }`}
                  onClick={() =>
                    setInterviewData({
                      ...interviewData,
                      type: type,
                    })
                  }
                >
                  <strong>{type}</strong>

                  <span>
                    {type === "Technical"
                      ? "Technical questions related to your role"
                      : type === "Behavioral"
                      ? "Communication and workplace questions"
                      : "Technical + behavioral questions"}
                  </span>
                </button>
              ))}

            </div>
          </div>

          <div className="form-group">
            <label>Number of Questions</label>

            <select
              value={interviewData.questions}
              onChange={(e) =>
                setInterviewData({
                  ...interviewData,
                  questions: Number(e.target.value),
                })
              }
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>
          </div>

          <div className="form-group">
            <label>Upload Resume</label>

            <div className="resume-upload">
              <input
                type="file"
                accept=".pdf"
               onChange={(e) => {
                const file = e.target.files[0];

                if (file) {
                  setResumeText("");
                  setResumeAnalysis(null);

                  if (file.type !== "application/pdf") {
                    setError("Please upload a PDF resume.");
                    setResume(null);
                    return;
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    setError("Resume must be smaller than 5 MB.");
                    setResume(null);
                    return;
                  }

                  setError("");
                  setResume(file);

                  console.log("Selected resume:", file.name);
                }
              }}
              />
              
              {resume && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={analyzeResume}
                  disabled={analyzingResume}
                >
                  {analyzingResume
                    ? "Analyzing Resume..."
                    : "Analyze Resume"}
                </button>
              )}

              {analyzingResume && (
                  <div className="loading-card">
                    <div className="loading-icon">🤖</div>
                    <h3>AI is analyzing your resume...</h3>
                    <p>
                      We're reviewing your skills, education, experience and
                      technologies.
                    </p>
                  </div>
                )}

                {resumeAnalysis && (
                  <div className="resume-analysis">

                    <div className="analysis-card">
                      <h2>📄 Resume Analysis</h2>
                      <p>{resumeAnalysis.summary}</p>
                    </div>

                    <div className="analysis-card">
                      <h3>💻 Skills</h3>

                      <div className="tag-list">
                        {asArray(resumeAnalysis.skills).map((skill, index) => (
                          <span key={index} className="tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="analysis-card">
                      <h3>🛠️ Technologies</h3>

                      <div className="tag-list">
                        {asArray(resumeAnalysis.technologies).map((technology, index) => (
                          <span key={index} className="tag">
                            {technology}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="analysis-card">
                      <h3>🎓 Education</h3>

                      {asArray(resumeAnalysis.education).map((item, index) => (
                        <div key={index} className="education-item">
                          <strong>{item.degree}</strong>
                          <p>{item.institution}</p>
                          <small>{item.period}</small>
                        </div>
                      ))}
                    </div>

                    {asArray(resumeAnalysis.experience).length > 0 && (
                      <div className="analysis-section">
                        <h3>💼 Experience</h3>

                        {asArray(resumeAnalysis.experience).map((item, index) => (
                          <div className="experience-card" key={index}>
                            <h4>{item.jobTitle}</h4>
                            <p><strong>{item.company}</strong></p>
                            <p>{item.duration}</p>

                            <ul>
                              {asArray(item.responsibilities).map((responsibility, i) => (
                                <li key={i}>{responsibility}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      )}

                        {asArray(resumeAnalysis.projects).length > 0 && (
                          <div className="analysis-section">
                            <h3>🚀 Projects</h3>

                            {asArray(resumeAnalysis.projects).map((project, index) => (
                              <div className="project-card" key={index}>
                                <h4>{project.name}</h4>
                                <p>{project.duration}</p>
                                <p>{project.description}</p>

                                <div>
                                  <strong>Technologies:</strong>{" "}
                                   {asArray(project.technologies).join(", ")}
                                </div>
                              </div>
                            ))}
                          </div>
                          )}

                    <div className="analysis-card">
                      <h3>💪 Strengths</h3>

                      <ul>
                        {asArray(resumeAnalysis.strengths).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="analysis-card">
                      <h3>🎯 Areas to Improve</h3>

                      <ul>
                        {asArray(resumeAnalysis.areasToImprove).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="analysis-card">
                      <h3>🚀 Recommended Roles</h3>

                      <div className="tag-list">
                        {asArray(resumeAnalysis.recommendedRoles).map((role, index) => (
                          <span key={index} className="tag">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              

              <span>📄 Upload your PDF resume</span>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}
          <button
            className="start-button"
            onClick={startInterview}
            disabled={loadingQuestions}
          >
            {loadingQuestions
               ? "Generating AI Questions..."
                : "Start Interview →"}
          </button>

        </div>
      </div>
    );
  }

  // ---------------- HOME PAGE ----------------

  return (
    <div className="app">

      <nav className="navbar">
        <div className="logo">InterviewAI</div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>

          <button
            className="nav-button"
            onClick={() => setPage("history")}
          >
            📊 History
          </button>

          <button
            className="nav-button"
            onClick={() => setPage("setup")}
          >
            Get Started
          </button>
        </div>
      </nav>

      <main>

        <section className="hero">

          <div className="hero-content">

            <span className="badge">
              AI-Powered Interview Coach
            </span>

            <h1>
              Practice Interviews.
              <br />
              <span>Build Confidence.</span>
            </h1>

            <p>
              Prepare for your next interview with an AI coach that asks
              realistic questions, evaluates your answers, and gives you
              personalized feedback.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-button"
                onClick={() => setPage("setup")}
              >
                Start Interview
              </button>

              <button
                className="secondary-button"
                onClick={() =>
                  document.getElementById("features")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                Learn More
              </button>

            </div>

          </div>

          <div className="hero-card">

            <div className="card-header">

              <div>
                <small>INTERVIEW SESSION</small>
                <h3>Frontend Developer</h3>
              </div>

              <span className="status">● Live</span>

            </div>

            <div className="question-box">

              <span>Question 01</span>

              <p>
                “Can you explain the difference between state and props
                in React?”
              </p>

            </div>

            <div className="voice-language">
              
              <label>Voice Language:</label>

              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                disabled={isListening}
              >
                <option value="en-PK">English</option>
                <option value="ur-PK">Urdu</option>
              </select>
            </div>

            <div className="answer-box">

              <button
                className={`mic-button ${isListening ? "listening" : ""}`}
                onClick={toggleVoiceInput}
              >
                 {isListening ? "⏹️" : "🎙️"}
              </button>

              <span>
                {isListening
                  ? "Listening... Speak your answer"
                  : "Click to answer by voice"}
              </span>

              <div>
                <strong>Listening...</strong>
                <p>Speak your answer</p>
              </div>

            </div>

            <div className="progress">
              <span></span>
            </div>

            <div className="session-info">
              <span>Question 1 of 5</span>
              <span>20%</span>
            </div>

          </div>

        </section>

        <section className="features" id="features">

          <div className="section-heading">

            <span>FEATURES</span>

            <h2>Everything you need to prepare</h2>

            <p>
              InterviewAI combines AI-powered practice with personalized
              feedback to help you become a better interview candidate.
            </p>

          </div>

          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI Interviewer</h3>
              <p>
                Practice realistic interviews with AI-generated questions
                tailored to your target role.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Resume-Based Questions</h3>
              <p>
                Upload your resume and receive questions based on your
                actual experience and skills.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Feedback</h3>
              <p>
                Get detailed feedback and scores on your answers.
              </p>
            </div>

          </div>

        </section>

      </main>

      <footer>
        <strong>InterviewAI</strong>
        <span>AI-Powered Interview Coach</span>
      </footer>

    </div>
  );
}

export default App;
