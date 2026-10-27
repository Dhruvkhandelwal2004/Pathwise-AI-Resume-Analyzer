const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  CAREER_ROLES,
  LEGACY_ROLE_IDS,
  ROLE_IDS,
  validateCareerRoleConfig,
} = require("../config/careerRoles");
const {
  MISSING_SKILL_NOTE,
  SCORE_DISCLAIMER,
  extractCareerEvidence,
  scoreCareerMatches,
} = require("../services/careerMatching");
const { createCareerMatchingRouter } = require("../routes/careerMatching");

function createAnalysis(overrides = {}) {
  return {
    name: null,
    contact: {
      email: null,
      phone: null,
      location: null,
      linkedin: null,
      website: null,
    },
    professionalSummary: null,
    education: [],
    experience: [],
    projects: [],
    skills: [],
    skillProfile: {
      technical: [],
      tools: [],
      domain: [],
      interpersonal: [],
    },
    certifications: [],
    strengths: [
      {
        point: "The resume contains relevant evidence.",
        evidence: "The structured resume fields contain explicit evidence.",
        whyItMatters: "Resume evidence supports transparent matching.",
      },
    ],
    weaknesses: [],
    improvementSuggestions: [
      {
        observation: "The resume has limited measurable outcomes.",
        evidence: "No quantified outcome appears in the structured evidence.",
        suggestion: "Add more measurable outcomes.",
        rationale: "The current evidence does not include measurable outcomes.",
        expectedResult: "Impact will be easier for a reviewer to understand.",
        priority: "medium",
      },
    ],
    achievements: [],
    activities: [],
    additionalInformation: [],
    evidenceQuality: {
      level: "limited",
      summary: "The fixture contains limited resume evidence.",
      evidence: [],
    },
    uncertainties: [],
    educationScore: {
      score: 0,
      label: "not-found",
      rationale:
        "Measures completeness of education evidence in this resume only; it does not rate institutions, academic ability, or candidate quality.",
      missingInformation: [
        "institution",
        "degree or qualification",
        "field of study",
        "location",
        "start date",
        "end date",
        "coursework, result, or relevant detail",
      ],
    },
    ...overrides,
  };
}

function createInformationPoorAnalysis() {
  return createAnalysis({
    strengths: [],
    improvementSuggestions: [],
    uncertainties: ["No scorable career evidence was readable."],
  });
}

function getRole(result, roleId) {
  return result.roleMatches.find((role) => role.roleId === roleId);
}

test("all role configurations are valid and total exactly 100 points", () => {
  assert.equal(validateCareerRoleConfig(), true);
  assert.equal(LEGACY_ROLE_IDS.length, 5);
  assert.equal(CAREER_ROLES.length, 21);
  assert.deepEqual(ROLE_IDS.slice(0, 5), LEGACY_ROLE_IDS);

  for (const role of CAREER_ROLES) {
    assert.equal(
      role.criteria.reduce((sum, item) => sum + item.weight, 0),
      100,
    );
  }
});

test("configuration validation rejects incorrect totals and duplicate skill aliases", () => {
  const wrongTotal = structuredClone(CAREER_ROLES);
  wrongTotal[0].criteria[0].weight -= 1;
  assert.throws(() => validateCareerRoleConfig(wrongTotal), /exactly 100/);

  const duplicateAlias = structuredClone(CAREER_ROLES);
  duplicateAlias[0].criteria[1].aliases.push("sql");
  assert.throws(
    () => validateCareerRoleConfig(duplicateAlias),
    /multiple criteria/,
  );

  const cyclicPrerequisites = structuredClone(CAREER_ROLES);
  const java = cyclicPrerequisites.find((role) => role.id === "java-developer");
  java.criteria.find((item) => item.id === "java").prerequisiteCriterionIds = ["spring"];
  assert.throws(() => validateCareerRoleConfig(cyclicPrerequisites), /must not contain cycles/);
});

test("equivalent aliases and repeated mentions earn each criterion only once", () => {
  const analysis = createAnalysis({
    skills: ["JavaScript", "JS", "javascript", "React.js", "React"],
  });
  const result = scoreCareerMatches(analysis);
  const web = getRole(result, "web-full-stack-developer");

  assert.equal(web.score, 22);
  assert.deepEqual(
    web.matchedCriteria.map((item) => item.criterionId),
    ["javascript-typescript", "web-framework"],
  );
  assert.equal(new Set(web.matchedCriteria.map((item) => item.criterionId)).size, 2);
});

test("token boundaries prevent substring false positives", () => {
  const analysis = createAnalysis({
    skills: ["Springfield", "Reactive programming", "Comparison"],
  });
  const result = scoreCareerMatches(analysis);

  assert.equal(getRole(result, "java-developer").score, 0);
  assert.equal(getRole(result, "web-full-stack-developer").score, 0);
  assert.equal(getRole(result, "data-analyst").score, 0);
});

test("scores skills, project evidence, and education deterministically", () => {
  const analysis = createAnalysis({
    skills: ["Python", "SQL", "React"],
    projects: [
      {
        name: "Student performance dashboard",
        description: "Dashboard built using Python and Pandas.",
        technologies: ["Python", "Pandas"],
        highlights: [],
        url: null,
      },
    ],
    education: [
      {
        institution: null,
        degree: "BCA",
        fieldOfStudy: null,
        location: null,
        startDate: null,
        endDate: null,
        details: [],
      },
    ],
  });
  const result = scoreCareerMatches(analysis, "data-analyst");
  const data = getRole(result, "data-analyst");

  assert.equal(data.score, 48);
  assert.deepEqual(
    data.categoryBreakdown.map(({ earned }) => earned),
    [22, 5, 15, 0, 6],
  );
  assert.ok(data.foundSkills.some((item) => item.skill === "SQL"));
  assert.ok(data.foundSkills.some((item) => item.skill === "Python or R"));
  assert.ok(data.foundSkills.some((item) => item.skill === "Pandas or NumPy"));
  assert.ok(
    data.matchedCriteria.some((item) =>
      item.evidence.some(
        (evidence) => evidence.source === "projects.technologies",
      ),
    ),
  );
  assert.ok(
    data.skillsNotFoundInResume.some(
      (item) =>
        item.skill === "Power BI or Tableau" &&
        item.note === MISSING_SKILL_NOTE,
    ),
  );
});

test("a complete configured Data Analyst profile scores 100 and all scores stay bounded", () => {
  const analysis = createAnalysis({
    skills: [
      "SQL",
      "Python",
      "Excel",
      "Power BI",
      "Statistics",
      "Pandas",
      "Data cleaning",
      "Data modeling",
    ],
    projects: [
      {
        name: "Analytics dashboard",
        description: "An ETL and data analysis dashboard.",
        technologies: ["Python", "SQL", "Pandas", "Power BI"],
        highlights: [],
        url: null,
      },
    ],
    experience: [
      {
        employer: null,
        title: "Data Analyst",
        location: null,
        startDate: null,
        endDate: null,
        highlights: ["Built dashboards and reporting workflows with SQL."],
      },
    ],
    education: [
      {
        institution: null,
        degree: "BCA",
        fieldOfStudy: "Data Science",
        location: null,
        startDate: null,
        endDate: null,
        details: [],
      },
    ],
    certifications: [
      {
        name: "Google Data Analytics Certificate",
        issuer: "Google",
        date: null,
        credentialId: null,
      },
    ],
  });
  const result = scoreCareerMatches(analysis);

  assert.equal(getRole(result, "data-analyst").score, 100);
  for (const role of result.roleMatches) {
    assert.ok(role.score >= 0 && role.score <= 100);
  }
});

test("empty evidence returns zero scores and stable configuration-order ties", () => {
  const result = scoreCareerMatches(createInformationPoorAnalysis());

  assert.equal(result.evidenceLevel, "insufficient");
  assert.deepEqual(
    result.roleMatches.map((role) => role.roleId),
    LEGACY_ROLE_IDS,
  );
  assert.ok(result.roleMatches.every((role) => role.score === 0));
  assert.equal(result.targetRoleGap.selection, "top-match");
  assert.equal(result.targetRoleGap.roleId, ROLE_IDS[0]);
  assert.equal(result.warnings.length, 1);
});

test("target-role gaps prioritize higher-weight skills without claiming absence", () => {
  const result = scoreCareerMatches(
    createInformationPoorAnalysis(),
    "java-developer",
  );

  assert.equal(result.targetRoleGap.selection, "requested");
  assert.equal(result.targetRoleGap.roleId, "java-developer");
  assert.equal(result.targetRoleGap.priorityGaps[0].skill, "Java");
  assert.equal(result.targetRoleGap.priorityGaps[0].pointsAvailable, 18);
  assert.ok(
    result.targetRoleGap.skillsNotFoundInResume.every(
      (item) => item.note === MISSING_SKILL_NOTE,
    ),
  );
  assert.equal(result.disclaimer, SCORE_DISCLAIMER);
});

test("detailed gaps map to configured criteria and provide deterministic actionable fields", () => {
  const first = scoreCareerMatches(createInformationPoorAnalysis(), "java-developer");
  const second = scoreCareerMatches(createInformationPoorAnalysis(), "java-developer");
  const configuredIds = new Set(
    CAREER_ROLES.find((role) => role.id === "java-developer").criteria.map((item) => item.id),
  );

  assert.deepEqual(first.targetRoleGap.gaps, second.targetRoleGap.gaps);
  assert.equal(first.targetRoleGap.reportVersion, "1.0.0");
  assert.ok(first.targetRoleGap.priorityMethod.rules.length >= 4);
  assert.ok(first.targetRoleGap.gaps.length > first.targetRoleGap.priorityGaps.length);
  assert.ok(first.targetRoleGap.gaps.every((gap) => configuredIds.has(gap.criterionId)));
  assert.ok(first.targetRoleGap.gaps.every((gap) => gap.currentResumeEvidence.length === 0));
  assert.ok(first.targetRoleGap.gaps.every((gap) =>
    gap.learningObjective &&
    gap.recommendedPracticeTask &&
    gap.suggestedDeliverable &&
    gap.completionCriteria.length >= 4 &&
    gap.resumeEvidenceAfterCompletion.guidance &&
    gap.roadmapTaskId,
  ));
});

test("listed keywords are not presented as proof of proficiency", () => {
  const result = scoreCareerMatches(
    createAnalysis({ skills: ["Java"] }),
    "java-developer",
  );
  const java = result.targetRoleGap.demonstratedCriteria.find(
    (item) => item.criterionId === "java",
  );

  assert.equal(java.evidenceDepth, "listed");
  assert.match(java.explanation, /does not prove proficiency/);
  assert.match(java.resumeEvidence[0].reference, /Skills section/);
});

test("student-provided gap context is labelled and cannot affect scoring", () => {
  const analysis = createInformationPoorAnalysis();
  const baseline = scoreCareerMatches(analysis, "java-developer");
  const withStudentContext = scoreCareerMatches(analysis, "java-developer", [
    {
      criterionId: "java",
      selfAssessment: "learning",
      additionalEvidence: "I am completing a small console application.",
    },
  ]);
  const gap = withStudentContext.targetRoleGap.gaps.find(
    (item) => item.criterionId === "java",
  );

  assert.equal(withStudentContext.selectedRoleMatch.score, baseline.selectedRoleMatch.score);
  assert.deepEqual(
    withStudentContext.targetRoleGap.gaps.map(({ studentProvided, ...item }) => item),
    baseline.targetRoleGap.gaps.map(({ studentProvided, ...item }) => item),
  );
  assert.equal(gap.studentProvided.selfAssessment, "learning");
  assert.match(gap.studentProvided.label, /not used in scoring/);
  assert.throws(
    () => scoreCareerMatches(analysis, "java-developer", [{ criterionId: "unknown", selfAssessment: "learning" }]),
    /Invalid student-provided criterion/,
  );
});

test("career matching does not mutate the input analysis", () => {
  const analysis = createAnalysis({ skills: ["Java", "Spring Boot"] });
  const snapshot = structuredClone(analysis);

  scoreCareerMatches(analysis, "java-developer");

  assert.deepEqual(analysis, snapshot);
});

test("contact and AI assessment prose do not affect scores or evidence", () => {
  const first = createAnalysis({
    contact: {
      email: "python-sql@example.com",
      phone: "Java Spring React",
      location: "Power BI",
      linkedin: null,
      website: null,
    },
    strengths: [
      {
        point: "Java expert",
        evidence: "Claims Java and Spring expertise.",
        whyItMatters: "This prose must not affect deterministic scoring.",
      },
    ],
    improvementSuggestions: [
      {
        observation: "SQL was not found.",
        evidence: "Assessment prose only.",
        suggestion: "Learn SQL",
        rationale: "SQL was not found.",
        expectedResult: "Different assessment prose.",
        priority: "high",
      },
    ],
  });
  const second = structuredClone(first);
  second.contact.email = null;
  second.contact.phone = null;
  second.contact.location = null;
  second.strengths = [
    {
      point: "Different prose",
      evidence: "Different assessment evidence.",
      whyItMatters: "Different explanation.",
    },
  ];
  second.improvementSuggestions = [
    {
      observation: "Different observation",
      evidence: "Different evidence",
      suggestion: "Different suggestion",
      rationale: "Different rationale.",
      expectedResult: "Different expected result.",
      priority: "low",
    },
  ];

  const firstResult = scoreCareerMatches(first);
  const secondResult = scoreCareerMatches(second);

  assert.deepEqual(firstResult, secondResult);
  const evidence = extractCareerEvidence(first);
  assert.ok(
    evidence.every(
      (item) =>
        !item.source.startsWith("contact") &&
        !item.source.startsWith("strengths") &&
        !item.source.startsWith("weaknesses") &&
        !item.source.startsWith("improvementSuggestions"),
    ),
  );
});

test("invalid target roles and malformed analyses are rejected", () => {
  assert.throws(
    () => scoreCareerMatches(createInformationPoorAnalysis(), "unknown-role"),
    /Unknown target role/,
  );
  assert.throws(() => scoreCareerMatches({}), /Invalid resume analysis/);
});

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/careers", createCareerMatchingRouter());
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

async function postMatch(body) {
  return fetch(`${baseUrl}/api/careers/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("career matching route returns deterministic results", async () => {
  const response = await postMatch({
    analysis: createAnalysis({ skills: ["Java", "Spring Boot"] }),
    targetRoleId: "java-developer",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.targetRoleGap.roleId, "java-developer");
  assert.equal(
    body.roleMatches.find((role) => role.roleId === "java-developer").score,
    28,
  );
});

test("career matching route accepts validated student context without changing the score", async () => {
  const response = await postMatch({
    analysis: createInformationPoorAnalysis(),
    targetRoleId: "java-developer",
    studentEvidence: [
      {
        criterionId: "java",
        selfAssessment: "practiced",
        additionalEvidence: "Completed local exercises that are not documented in the resume.",
      },
    ],
  });
  const body = await response.json();
  const gap = body.targetRoleGap.gaps.find((item) => item.criterionId === "java");

  assert.equal(response.status, 200);
  assert.equal(body.selectedRoleMatch.score, 0);
  assert.equal(gap.studentProvided.selfAssessment, "practiced");
  assert.match(gap.studentProvided.label, /not verified from the resume/);
});

test("career matching route rejects invalid roles and request shapes", async () => {
  const invalidRole = await postMatch({
    analysis: createInformationPoorAnalysis(),
    targetRoleId: "unknown-role",
  });
  assert.equal(invalidRole.status, 400);

  const invalidAnalysis = await postMatch({ analysis: {} });
  assert.equal(invalidAnalysis.status, 400);

  const unsupportedField = await postMatch({
    analysis: createInformationPoorAnalysis(),
    extra: true,
  });
  assert.equal(unsupportedField.status, 400);
});
