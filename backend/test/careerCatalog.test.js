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
  CareerCatalogInputError,
  getCareerProfile,
  normalizeRoleSearch,
  searchCareerProfiles,
} = require("../services/careerCatalog");
const { scoreCareerMatches } = require("../services/careerMatching");
const { createCareerMatchingRouter } = require("../routes/careerMatching");

function createAnalysis(overrides = {}) {
  return {
    name: null,
    contact: { email: null, phone: null, location: null, linkedin: null, website: null },
    professionalSummary: null,
    education: [],
    experience: [],
    projects: [],
    skills: [],
    skillProfile: { technical: [], tools: [], domain: [], interpersonal: [] },
    certifications: [],
    strengths: [
      {
        point: "The resume contains relevant evidence.",
        evidence: "The structured fields contain explicit evidence.",
        whyItMatters: "Evidence supports transparent matching.",
      },
    ],
    weaknesses: [],
    improvementSuggestions: [
      {
        observation: "Some role evidence is not documented.",
        evidence: "The structured fields contain limited role evidence.",
        suggestion: "Add genuine supporting evidence.",
        rationale: "Direct evidence improves matching transparency.",
        expectedResult: "The resume will communicate relevant evidence more clearly.",
        priority: "medium",
      },
    ],
    achievements: [],
    activities: [],
    additionalInformation: [],
    evidenceQuality: {
      level: "limited",
      summary: "The fixture contains limited evidence.",
      evidence: [],
    },
    uncertainties: [],
    educationScore: {
      score: 0,
      label: "not-found",
      rationale: "Measures education evidence completeness only.",
      missingInformation: [],
    },
    ...overrides,
  };
}

test("catalogue preserves the five legacy roles and has unique stable IDs", () => {
  assert.deepEqual(ROLE_IDS.slice(0, 5), LEGACY_ROLE_IDS);
  assert.equal(new Set(ROLE_IDS).size, ROLE_IDS.length);
  for (const roleId of [
    "data-analyst",
    "java-developer",
    "web-full-stack-developer",
    "ai-automation-developer",
    "prompt-engineer",
  ]) {
    assert.ok(ROLE_IDS.includes(roleId));
  }
});

test("profiles missing scoring metadata or using duplicate title aliases are rejected", () => {
  const missingMetadata = structuredClone(CAREER_ROLES);
  delete missingMetadata[0].description;
  assert.throws(
    () => validateCareerRoleConfig(missingMetadata),
    /missing required catalogue metadata/,
  );

  const duplicateAlias = structuredClone(CAREER_ROLES);
  duplicateAlias[1].titleAliases.push(duplicateAlias[0].title);
  assert.throws(
    () => validateCareerRoleConfig(duplicateAlias),
    /must resolve uniquely/,
  );
});

test("search is case-insensitive and normalizes harmless punctuation and spacing", () => {
  assert.equal(searchCareerProfiles("DATA ANALYST", 10).results[0].roleId, "data-analyst");
  assert.equal(searchCareerProfiles("  front-end   developer ", 10).results[0].roleId, "frontend-developer");
  assert.equal(normalizeRoleSearch("Cloud  & Infrastructure"), "cloud and infrastructure");
});

test("exact canonical titles rank before aliases and partial matches", () => {
  const exact = searchCareerProfiles("Backend Developer", 10).results;
  assert.equal(exact[0].roleId, "backend-developer");

  const alias = searchCareerProfiles("Backend Engineer", 10).results;
  assert.equal(alias[0].roleId, "backend-developer");

  const partial = searchCareerProfiles("data", 25).results;
  assert.equal(partial[0].roleId, "data-analyst");
  assert.ok(partial.some((item) => item.roleId === "data-engineer"));
  assert.ok(partial.some((item) => item.roleId === "data-scientist"));
});

test("search ordering is stable and never duplicates a canonical profile", () => {
  const first = searchCareerProfiles("developer", 25).results;
  const second = searchCareerProfiles("developer", 25).results;
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((item) => item.roleId)).size, first.length);
});

test("empty search returns featured profiles and no-result search returns safe suggestions", () => {
  const empty = searchCareerProfiles("", 10);
  assert.deepEqual(empty.results.slice(0, 5).map((item) => item.roleId), LEGACY_ROLE_IDS);

  const noResults = searchCareerProfiles("intergalactic wizard", 10);
  assert.deepEqual(noResults.results, []);
  assert.equal(noResults.suggestions.length, 5);
});

test("invalid search input and unknown canonical IDs are handled safely", () => {
  assert.throws(() => searchCareerProfiles("x".repeat(81), 10), CareerCatalogInputError);
  assert.throws(() => searchCareerProfiles("data", 0), CareerCatalogInputError);
  assert.equal(getCareerProfile("unknown-role"), null);
});

test("profile details contain requirements, provenance, versions, and related valid roles", () => {
  const profile = getCareerProfile("machine-learning-engineer");
  assert.equal(profile.roleId, "machine-learning-engineer");
  assert.equal(profile.requirements.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.ok(profile.source.name);
  assert.ok(profile.profileVersion);
  assert.ok(profile.relatedRoles.every((item) => ROLE_IDS.includes(item.roleId)));
});

test("an additional profile produces deterministic matching without changing legacy comparison scope", () => {
  const analysis = createAnalysis({
    skills: ["Python", "TensorFlow", "Model deployment"],
    skillProfile: {
      technical: ["Python", "TensorFlow", "Model deployment"],
      tools: [],
      domain: [],
      interpersonal: [],
    },
    projects: [
      {
        name: "ML prediction model",
        description: "A machine learning prediction model.",
        technologies: ["Python", "TensorFlow"],
        highlights: ["Deployed model inference through an API."],
        url: null,
      },
    ],
  });
  const first = scoreCareerMatches(analysis, "machine-learning-engineer");
  const second = scoreCareerMatches(analysis, "machine-learning-engineer");

  assert.deepEqual(first, second);
  assert.equal(first.selectedRoleMatch.roleId, "machine-learning-engineer");
  assert.ok(first.selectedRoleMatch.score > 0);
  assert.equal(first.selectedProfile.roleId, "machine-learning-engineer");
  assert.ok(first.selectedProfile.relatedRoles.length > 0);
  assert.equal(first.roleMatches.length, LEGACY_ROLE_IDS.length);
  assert.deepEqual(
    new Set(first.roleMatches.map((item) => item.roleId)),
    new Set(LEGACY_ROLE_IDS),
  );
  assert.equal(first.targetRoleGap.roleId, "machine-learning-engineer");
});

test("related evidence is distinguished from direct criterion evidence", () => {
  const analysis = createAnalysis({
    skills: ["Kubernetes"],
    skillProfile: { technical: ["Kubernetes"], tools: [], domain: [], interpersonal: [] },
  });
  const result = scoreCareerMatches(analysis, "devops-engineer");
  const partial = result.partiallyDemonstratedCriteria.find(
    (item) => item.criterionId === "devops-engineer-project-tools",
  );

  assert.ok(partial);
  assert.equal(partial.pointsAvailable, 5);
  assert.equal(result.selectedRoleMatch.score, 9);
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

test("catalogue routes expose real search results and canonical details", async () => {
  const searchResponse = await fetch(`${baseUrl}/api/careers/roles?query=python&limit=5`);
  const searchBody = await searchResponse.json();
  const detailResponse = await fetch(`${baseUrl}/api/careers/roles/python-developer`);
  const detailBody = await detailResponse.json();

  assert.equal(searchResponse.status, 200);
  assert.equal(searchBody.results[0].roleId, "python-developer");
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.profile.roleId, "python-developer");
  assert.equal(detailBody.profile.requirements.reduce((sum, item) => sum + item.weight, 0), 100);
});

test("catalogue routes return stable empty, invalid, and unknown states", async () => {
  const emptyResponse = await fetch(`${baseUrl}/api/careers/roles?query=unknownoccupation`);
  const emptyBody = await emptyResponse.json();
  const invalidResponse = await fetch(`${baseUrl}/api/careers/roles?limit=0`);
  const unknownResponse = await fetch(`${baseUrl}/api/careers/roles/not-supported`);

  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyBody.results, []);
  assert.ok(emptyBody.suggestions.length > 0);
  assert.equal(invalidResponse.status, 400);
  assert.equal(unknownResponse.status, 404);
});

test("matching endpoint rejects arbitrary titles and client-supplied profiles", async () => {
  const arbitraryTitle = await fetch(`${baseUrl}/api/careers/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysis: createAnalysis(), targetRoleId: "wizard" }),
  });
  const suppliedProfile = await fetch(`${baseUrl}/api/careers/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      analysis: createAnalysis(),
      targetRoleId: "data-analyst",
      profile: { criteria: [{ weight: 100 }] },
    }),
  });

  assert.equal(arbitraryTitle.status, 400);
  assert.equal(suppliedProfile.status, 400);
});
