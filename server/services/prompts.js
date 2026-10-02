const TEST_AI_PROMPT =
  "Say hello to InterviewAI in one short sentence.";

function buildQuestionsPrompt({
  requestedCount,
  role,
  experience,
  type,
  resumeSection,
}) {
  return `
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
}

function buildEvaluationPrompt({
  role,
  experience,
  resumeText,
  interview,
}) {
  return `
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
${JSON.stringify(interview, null, 2)}

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
}

function buildResumeAnalysisPrompt({ resumeText }) {
  return `
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
}

module.exports = {
  TEST_AI_PROMPT,
  buildQuestionsPrompt,
  buildEvaluationPrompt,
  buildResumeAnalysisPrompt,
};
