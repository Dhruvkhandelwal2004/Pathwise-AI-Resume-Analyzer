const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  RESUME_QUALITY_RUBRIC,
  validateResumeQualityRubric,
} = require("../config/resumeQualityRubric");
const {
  ResumeQualityInputError,
  scoreResumeQuality,
} = require("../services/resumeQualityScoring");
const { createResumeQualityRouter } = require("../routes/resumeQuality");
const {
  PersistentCacheUnavailableError,
  hashCanonicalAnalysis,
} = require("../services/persistentResumeCache");

function createAnalysis(overrides = {}) {
  return {
    name: "Student Example",
    contact: {
      email: "student@example.com",
      phone: null,
      location: "Delhi",
      linkedin: null,
      website: "https://example.com",
    },
    professionalSummary: "Computer science student building evidence-backed web applications.",
    education: [
      {
        institution: "Example University",
        degree: "Bachelor of Computer Applications",
        fieldOfStudy: "Computer Applications",
        location: "Delhi",
        startDate: "2022",
        endDate: "2025",
        details: ["Coursework included databases and web development."],
      },
    ],
    experience: [],
    projects: [
      {
        name: "Student Dashboard",
        description: "Built a dashboard that helps students track coursework.",
        technologies: ["React", "Node.js"],
        highlights: [
          "Implemented the dashboard interface and REST API.",
          "Deployed a working demonstration for course review.",
        ],
        url: "https://example.com/dashboard",
      },
    ],
    skills: ["React", "Node.js"],
    skillProfile: {
      technical: ["React", "Node.js"],
      tools: [],
      domain: [],
      interpersonal: [],
    },
    certifications: [],
    strengths: [
      {
        point: "The resume documents applied development work.",
        evidence: "Student Dashboard lists React and Node.js.",
        whyItMatters: "Applied evidence supports the listed skills.",
      },
    ],
    weaknesses: [],
    improvementSuggestions: [
      {
        observation: "The project does not include a measurable result.",
        evidence: "The project describes a demonstration but no measured result.",
        suggestion: "Add a genuine result when evidence is available.",
        rationale: "Supported results make impact easier to evaluate.",
        expectedResult: "The project evidence will become more specific.",
        priority: "medium",
      },
    ],
    achievements: [],
    activities: [],
    additionalInformation: [],
    evidenceQuality: {
      level: "mixed",
      summary: "The resume contains education and project evidence.",
      evidence: ["A project includes technologies and contribution bullets."],
    },
    uncertainties: [],
    educationScore: {
      score: 100,
      label: "complete",
      rationale: "This value is recalculated during validation.",
      missingInformation: [],
    },
    ...overrides,
  };
}

function createEmptyAnalysis() {
  return createAnalysis({
    name: null,
    contact: { email: null, phone: null, location: null, linkedin: null, website: null },
    professionalSummary: null,
    education: [],
    projects: [],
    skills: [],
    skillProfile: { technical: [], tools: [], domain: [], interpersonal: [] },
    strengths: [],
    improvementSuggestions: [],
    evidenceQuality: {
      level: "insufficient",
      summary: "No readable resume evidence was available.",
      evidence: [],
    },
    uncertainties: [],
    educationScore: {
      score: 0,
      label: "not-found",
      rationale: "This value is recalculated during validation.",
      missingInformation: [],
    },
  });
}

test("resume-quality rubric and every rule group total exactly 100 points", () => {
  assert.equal(validateResumeQualityRubric(), true);
  assert.equal(
    RESUME_QUALITY_RUBRIC.criteria.reduce((sum, item) => sum + item.weight, 0),
    100,
  );
  for (const criterion of RESUME_QUALITY_RUBRIC.criteria) {
    assert.equal(
      criterion.rules.reduce((sum, rule) => sum + rule.points, 0),
      criterion.weight,
    );
  }
});

test("rubric validation rejects invalid totals", () => {
  const invalid = structuredClone(RESUME_QUALITY_RUBRIC);
  invalid.criteria[0].rules[0].points -= 1;
  assert.throws(() => validateResumeQualityRubric(invalid), /rules must total/);
});

test("identical validated input produces an identical quality result", () => {
  const analysis = createAnalysis();
  assert.deepEqual(scoreResumeQuality(analysis), scoreResumeQuality(analysis));
});

test("projects can satisfy practical evidence without formal employment", () => {
  const result = scoreResumeQuality(createAnalysis({ experience: [] }));
  const practical = result.criteria.find((item) => item.id === "practical");

  assert.equal(practical.earned, 20);
  assert.equal(practical.weight, 20);
  assert.match(practical.explanation, /20\/20/);
});

test("incomplete projects produce specific deterministic actions", () => {
  const analysis = createAnalysis();
  analysis.projects[0] = {
    name: "Student Dashboard",
    description: null,
    technologies: ["React"],
    highlights: [],
    url: null,
  };
  const result = scoreResumeQuality(analysis);
  const projects = result.criteria.find((item) => item.id === "projects");
  const objectiveAction = result.improvements.find(
    (item) => item.ruleId === "project-objectives",
  );

  assert.ok(projects.earned < projects.weight);
  assert.equal(objectiveAction.section, "Projects");
  assert.ok(objectiveAction.checklist.includes("State the problem"));
  assert.match(objectiveAction.verification[0], /purpose/);
});

test("AI assessment prose and career selection cannot change the quality score", () => {
  const first = createAnalysis();
  const second = createAnalysis({
    strengths: [
      {
        point: "Different AI strength.",
        evidence: "Different AI evidence.",
        whyItMatters: "Different AI rationale.",
      },
    ],
    weaknesses: [
      {
        point: "Different AI weakness.",
        evidence: "Different AI evidence.",
        whyItMatters: "Different AI rationale.",
      },
    ],
  });

  assert.equal(scoreResumeQuality(first).score, scoreResumeQuality(second).score);
  assert.equal(scoreResumeQuality(first).rubricVersion, "1.0.0");
});

test("empty validated analysis returns a safe zero with explanations", () => {
  const result = scoreResumeQuality(createEmptyAnalysis());

  assert.equal(result.score, 0);
  assert.equal(result.criteria.length, 5);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.improvements.length > 0);
  assert.equal(result.atsCompatibility.ratingLabel, "NEEDS WORK");
  assert.equal(result.atsCompatibility.distortionRisk.level, "high");
  assert.equal(result.atsCompatibility.sectionBreakdown.length, 10);
});

test("atsCompatibility computes deterministic 10-section breakdown and marks visual layout unavailable", () => {
  const result = scoreResumeQuality(createAnalysis());
  const ats = result.atsCompatibility;

  assert.equal(ats.version, "1.0.0");
  assert.equal(ats.sectionBreakdown.length, 10);
  assert.deepEqual(
    ats.sectionBreakdown.map((s) => s.label),
    [
      "CONTACT INFO",
      "SUMMARY",
      "EXPERIENCE",
      "SKILLS",
      "EDUCATION",
      "KEYWORDS",
      "FORMATTING",
      "ACHIEVEMENTS",
      "READABILITY",
      "ACTION VERBS",
    ],
  );
  assert.equal(ats.distortionRisk.level, "none");
  assert.equal(ats.distortionRisk.title, "No Distortion");
  const visualCheck = ats.globalStandards.find((c) => c.id === "visual-layout");
  assert.equal(visualCheck.status, "unavailable");
  assert.equal(visualCheck.passed, null);
});

test("malformed analysis is rejected without partial scoring", () => {
  const malformed = createAnalysis();
  delete malformed.contact.email;
  assert.throws(
    () => scoreResumeQuality(malformed),
    ResumeQualityInputError,
  );
});

let server;
let baseUrl;
let savedQuality;
let scoreCalls;
const persistentCache = {
  async getQuality() {
    return savedQuality;
  },
  async saveQuality(_identity, _analysis, result) {
    savedQuality = result;
  },
};

function cacheIdentityFor(analysis) {
  return {
    extractionKey: "resume-key",
    contentFingerprint: "content-hash",
    extractionContractVersion: "resume-extraction-v4",
    promptVersion: "resume-prompt-v5",
    modelConfiguration: "test-model",
    canonicalAnalysisHash: hashCanonicalAnalysis(analysis),
  };
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/resumes", createResumeQualityRouter({
    persistentCache,
    scoreResumeQuality(analysis) {
      scoreCalls += 1;
      return scoreResumeQuality(analysis);
    },
  }));
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("quality-score route returns the transparent deterministic breakdown", async () => {
  savedQuality = null;
  scoreCalls = 0;
  const analysis = createAnalysis();
  const bodyData = {
    analysis,
    cacheIdentity: cacheIdentityFor(analysis),
  };
  const response = await fetch(`${baseUrl}/api/resumes/quality-score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(bodyData),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.maxScore, 100);
  assert.equal(body.cacheStatus, "fresh");
  assert.equal(body.criteria.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.equal(body.score, body.criteria.reduce((sum, item) => sum + item.earned, 0));

  const repeatedResponse = await fetch(`${baseUrl}/api/resumes/quality-score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(bodyData),
  });
  const repeated = await repeatedResponse.json();
  assert.equal(repeated.cacheStatus, "persistent");
  assert.equal(scoreCalls, 1);
  assert.equal(repeated.score, body.score);
  assert.deepEqual(repeated.criteria, body.criteria);
  assert.deepEqual(
    repeated.atsCompatibility.sectionBreakdown,
    body.atsCompatibility.sectionBreakdown,
  );
});

test("quality-score route rejects unsupported or malformed requests", async () => {
  const extraField = await fetch(`${baseUrl}/api/resumes/quality-score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysis: createAnalysis(), targetRoleId: "data-analyst" }),
  });
  const malformed = await fetch(`${baseUrl}/api/resumes/quality-score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysis: { name: "Incomplete" } }),
  });

  assert.equal(extraField.status, 400);
  assert.equal(malformed.status, 400);
});

test("quality-score route fails closed when Atlas is unavailable", async () => {
  let scoreCallsWhenUnavailable = 0;
  const app = express();
  app.use(express.json());
  app.use("/api/resumes", createResumeQualityRouter({
    persistentCache: {
      async getQuality() {
        throw new PersistentCacheUnavailableError("database unavailable");
      },
      async saveQuality() {
        throw new Error("save must not run");
      },
    },
    scoreResumeQuality(analysis) {
      scoreCallsWhenUnavailable += 1;
      return scoreResumeQuality(analysis);
    },
  }));
  const localServer = await new Promise((resolve) => {
    const running = app.listen(0, "127.0.0.1", () => resolve(running));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${localServer.address().port}/api/resumes/quality-score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        analysis: createAnalysis(),
        cacheIdentity: cacheIdentityFor(createAnalysis()),
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.code, "persistent_cache_unavailable");
    assert.equal(body.score, undefined);
    assert.equal(scoreCallsWhenUnavailable, 0);
  } finally {
    await new Promise((resolve) => localServer.close(resolve));
  }
});
