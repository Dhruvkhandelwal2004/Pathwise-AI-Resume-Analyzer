const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateResumeContent } = require("../services/resumeValidation");
const { createResumeAnalyzer } = require("../services/resumeAnalysis");
const { scoreCareerMatches } = require("../services/careerMatching");
const { DocumentNotResumeError } = require("../services/aiErrors");

// Fixtures
const VALID_EXPERIENCED_RESUME = `
Sarah Jenkins
Email: sarah.jenkins@example.com | Phone: +1-555-019-2834 | San Francisco, CA
LinkedIn: linkedin.com/in/sarahjenkins | GitHub: github.com/sjenkins

PROFESSIONAL SUMMARY
Senior Software Engineer with 6+ years of experience designing, building, and scaling distributed backend systems and REST APIs.

WORK EXPERIENCE
Senior Backend Engineer | CloudScale Tech | 2021 - Present
- Architected and deployed microservices handling 25,000 requests/sec using Go, PostgreSQL, and Redis.
- Reduced database query latency by 42% through query optimization and connection pooling.
- Led migration of on-premise infrastructure to AWS utilizing Docker and Kubernetes.

Software Engineer | Apex Data Systems | 2018 - 2021
- Developed RESTful web services in Python and Django with MySQL database backends.
- Automated CI/CD deployment pipelines using GitHub Actions and Docker.

EDUCATION
B.S. in Computer Science | University of California, Berkeley | 2014 - 2018
GPA: 3.8 / 4.0

TECHNICAL SKILLS
Languages: Python, Go, JavaScript, TypeScript, SQL, HTML, CSS
Frameworks & Databases: Django, Express, PostgreSQL, MySQL, Redis, MongoDB
Tools & Cloud: AWS, Docker, Kubernetes, Git, Linux, CI/CD, Agile
`;

const VALID_FRESHER_STUDENT_RESUME = `
Aarav Sharma
Email: aarav.sharma@example.edu | Phone: +91-9876543210 | Bengaluru, India
GitHub: github.com/aaravsharma | Portfolio: aaravsharma.dev

CAREER OBJECTIVE
Final-year B.Tech Computer Science student eager to contribute foundational programming, data structures, and database skills to an entry-level software engineering team.

EDUCATION
State Engineering College, Bengaluru
Bachelor of Technology in Computer Science and Engineering | 2022 - 2026
CGPA: 8.9 / 10.0 | Relevant Coursework: Database Management Systems, Data Structures & Algorithms, Object-Oriented Programming, Operating Systems

TECHNICAL SKILLS
Languages: Java, Python, C++, SQL, JavaScript
Web & Frameworks: React, HTML5, CSS3, Node.js, Express
Tools & Databases: MySQL, Git, GitHub, Linux, VS Code, Postman

ACADEMIC & PERSONAL PROJECTS
Student Attendance & Analytics Tracker | Python, MySQL, Streamlit
- Built a web application allowing faculty to track daily attendance for 120+ students and export CSV summaries.
- Implemented automated absentee email notifications and SQL report generation.

Algorithmic Trading Simulator | Java, JavaFX
- Created an interactive desktop simulation modeling moving-average stock strategies with real historical data.
- Handled multi-threaded order book updates and data visualization charts.

ACHIEVEMENTS & CERTIFICATIONS
- First place in College Hackathon 2024 (Team of 4).
- HackerRank 5-Star Silver Badge in Problem Solving & SQL.
`;

const UNCONVENTIONAL_FORMAT_RESUME = `
Priya Nair - Software Developer
priya.nair@email.com | +91 9123456789 | Mumbai, India | github.com/priyanair

About Me:
Self-taught developer and B.Sc Information Technology graduate passionate about building clean web applications and backend APIs.

What I Know:
Python, JavaScript, React, Node.js, PostgreSQL, Docker, Git, REST APIs, HTML, CSS, Linux.

What I Have Done:
Worked as an intern at DevSpark Labs from June 2024 to December 2024 where I developed REST APIs using Python and FastAPI, connected them to a PostgreSQL database, and wrote unit test suites.
Built an open-source inventory management portal (github.com/priyanair/inventory-hub) using React and Node.js that is used by a local bookstore.

Academic Background:
B.Sc in Information Technology from Mumbai University, graduated in 2024 with distinction.
`;

const CERTIFICATE_ONLY_TEXT = `
CERTIFICATE OF COMPLETION
This is to certify that
Alex Morgan
has successfully completed the 40-hour intensive training program in
Python for Beginners and Advanced Scripting
Conducted by Global Tech Academy on October 15, 2024
Authorized Signatory: Dr. Robert Vance, Director of Training
Certificate ID: GTA-2024-998812
Verification URL: https://verify.globaltechacademy.org/GTA-2024-998812
`;

const MARKSHEET_ONLY_TEXT = `
STATE TECHNICAL UNIVERSITY
EXAMINATION DIVISION
STATEMENT OF MARKS - SEMESTER IV EXAMINATION
Student Name: Rohan Verma
Roll No: 2022CS0841 | Registration: 10293847
Sub Code | Subject Name | Credits | Grade | Grade Points
CS401    | Discrete Mathematics        | 4 | A  | 9
CS402    | Computer Organization       | 4 | B+ | 8
CS403    | Operating Systems           | 4 | A  | 9
CS404    | Design and Analysis of Algo | 4 | A+ | 10
CS405    | Theory of Computation       | 3 | B  | 7
Semester Credits Earned: 19 | SGPA: 8.68 | Cumulative CGPA: 8.42
Result: PASS
Date of Declaration: 12-July-2024
Controller of Examinations
`;

const GENERIC_ESSAY_TEXT = `
The Impact of Renewable Energy on Global Economic Sustainability
Over the past two decades, renewable energy technologies including solar photovoltaic and wind energy have transitioned from heavily subsidized niche markets to cost-competitive global industries. Governments worldwide are investing billions of dollars into energy grid modernization and storage research.
However, grid stability remains an ongoing challenge due to the intermittent nature of renewable energy generation. Developing flexible smart grids and pumped hydro storage will be critical to overcoming these structural hurdles over the next thirty years.
`;

const AMBIGUOUS_SHORT_BIO_TEXT = `
Hello, my name is David. I am very interested in technology and computers.
I like Python programming and reading books about science.
You can contact me at david.temp@example.com.
`;

test("validates genuine experienced professional resume", () => {
  const result = validateResumeContent(VALID_EXPERIENCED_RESUME);
  assert.equal(result.isValid, true);
  assert.equal(result.code, "VALID_RESUME");
  assert.ok(result.score >= 60);
  assert.equal(result.matchedSignals.contact, true);
  assert.equal(result.matchedSignals.experience, true);
  assert.equal(result.matchedSignals.skills, true);
  assert.equal(result.matchedSignals.education, true);
});

test("validates genuine fresher/student resume with zero professional experience", () => {
  const result = validateResumeContent(VALID_FRESHER_STUDENT_RESUME);
  assert.equal(result.isValid, true);
  assert.equal(result.code, "VALID_RESUME");
  assert.ok(result.score >= 55);
  assert.equal(result.matchedSignals.education, true);
  assert.equal(result.matchedSignals.skills, true);
  assert.equal(result.matchedSignals.projects, true);
  assert.equal(result.matchedSignals.experience, false); // Fresher has 0 formal employment
});

test("validates genuine resume with unconventional formatting or sparse section headings", () => {
  const result = validateResumeContent(UNCONVENTIONAL_FORMAT_RESUME);
  assert.equal(result.isValid, true);
  assert.equal(result.code, "VALID_RESUME");
  assert.ok(result.score >= 45);
});

test("rejects certificate-only documents with actionable message", () => {
  const result = validateResumeContent(CERTIFICATE_ONLY_TEXT);
  assert.equal(result.isValid, false);
  assert.equal(result.code, "DOCUMENT_NOT_RESUME");
  assert.equal(result.reason, "certificate_only");
  assert.match(result.message, /certificate rather than a full resume/i);
});

test("rejects marksheet/transcript-only documents with actionable message", () => {
  const result = validateResumeContent(MARKSHEET_ONLY_TEXT);
  assert.equal(result.isValid, false);
  assert.equal(result.code, "DOCUMENT_NOT_RESUME");
  assert.equal(result.reason, "marksheet_only");
  assert.match(result.message, /marksheet or transcript/i);
});

test("rejects generic non-resume documents and essays", () => {
  const result = validateResumeContent(GENERIC_ESSAY_TEXT);
  assert.equal(result.isValid, false);
  assert.equal(result.code, "DOCUMENT_NOT_RESUME");
  assert.equal(result.reason, "not_a_resume");
  assert.match(result.message, /doesn't appear to be a resume/i);
});

test("rejects documents with insufficient length or empty content", () => {
  const shortResult = validateResumeContent("Name: John Doe\nEmail: john@example.com");
  assert.equal(shortResult.isValid, false);
  assert.equal(shortResult.code, "INSUFFICIENT_RESUME_DATA");
  assert.equal(shortResult.reason, "insufficient_content");

  const emptyResult = validateResumeContent("   \n\n  ");
  assert.equal(emptyResult.isValid, false);
  assert.equal(emptyResult.code, "INSUFFICIENT_RESUME_DATA");

  const nonStringResult = validateResumeContent(null);
  assert.equal(nonStringResult.isValid, false);
  assert.equal(nonStringResult.code, "INVALID_RESUME_TEXT");
});

test("rejects ambiguous content safely without passing to AI", () => {
  const result = validateResumeContent(AMBIGUOUS_SHORT_BIO_TEXT);
  assert.equal(result.isValid, false);
  assert.ok(
    result.code === "DOCUMENT_NOT_RESUME" ||
      result.code === "INSUFFICIENT_RESUME_DATA"
  );
  assert.ok(
    result.reason === "ambiguous" || result.reason === "insufficient_content"
  );
});

test("stops the pipeline before calling AI provider when document is rejected", async () => {
  let aiProviderCalled = false;
  const mockProvider = {
    name: "mock-groq",
    model: "mock-model",
    analyze: async () => {
      aiProviderCalled = true;
      return {};
    },
  };

  const analyzer = createResumeAnalyzer({ provider: mockProvider });

  // 1. Rejected document (certificate): should throw DocumentNotResumeError and NEVER call AI
  await assert.rejects(
    async () => {
      await analyzer(CERTIFICATE_ONLY_TEXT);
    },
    (err) => {
      assert.ok(err instanceof DocumentNotResumeError);
      assert.equal(err.reason, "certificate_only");
      return true;
    }
  );
  assert.equal(aiProviderCalled, false, "AI provider must NOT be invoked for certificate");

  // 2. Rejected document (marksheet): should throw DocumentNotResumeError and NEVER call AI
  await assert.rejects(
    async () => {
      await analyzer(MARKSHEET_ONLY_TEXT);
    },
    (err) => {
      assert.ok(err instanceof DocumentNotResumeError);
      assert.equal(err.reason, "marksheet_only");
      return true;
    }
  );
  assert.equal(aiProviderCalled, false, "AI provider must NOT be invoked for marksheet");

  // 3. Rejected document (generic essay): should throw DocumentNotResumeError and NEVER call AI
  await assert.rejects(
    async () => {
      await analyzer(GENERIC_ESSAY_TEXT);
    },
    (err) => {
      assert.ok(err instanceof DocumentNotResumeError);
      assert.equal(err.reason, "not_a_resume");
      return true;
    }
  );
  assert.equal(aiProviderCalled, false, "AI provider must NOT be invoked for essay");
});

test("regression: career matching still executes properly for valid resume analysis", () => {
  const validAnalysis = {
    name: "Aarav Sharma",
    contact: { email: "aarav@example.com", phone: "+91-9876543210", location: "India", linkedin: null, website: null },
    professionalSummary: "B.Tech student with Python and SQL coursework.",
    skills: ["Python", "MySQL", "Git"],
    skillProfile: { technical: ["Python", "MySQL"], tools: ["Git"], domain: [], interpersonal: [] },
    experience: [],
    projects: [{ name: "Student Tracker", description: "Attendance system in Python.", technologies: ["Python"], highlights: [], url: null }],
    education: [{ institution: "College", degree: "B.Tech", fieldOfStudy: "CS", location: "India", startDate: "2022", endDate: "2026", details: [] }],
    certifications: [],
    strengths: [{ point: "Python skills", evidence: "Listed in skills", whyItMatters: "Software role" }],
    weaknesses: [],
    improvementSuggestions: [{ observation: "Projects", evidence: "Attendance", suggestion: "Add links", rationale: "Verification", expectedResult: "Stronger profile", priority: "medium" }],
    achievements: [],
    activities: [],
    additionalInformation: [],
    evidenceQuality: { level: "mixed", summary: "Documented", evidence: ["Python"] },
    uncertainties: [],
    educationScore: { score: 100, label: "complete", rationale: "Completeness", missingInformation: [] },
  };

  const match = scoreCareerMatches(validAnalysis, "data-analyst");
  assert.ok(match.selectedRoleMatch.score >= 0);
  assert.equal(match.selectedProfile.roleId, "data-analyst");
});

