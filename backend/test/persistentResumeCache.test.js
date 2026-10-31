const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PersistentCacheIdentityError,
  createPersistentResumeCache,
  hashCanonicalAnalysis,
} = require("../services/persistentResumeCache");

const sectionIds = [
  "contact-info", "summary", "experience", "skills", "education",
  "keywords", "formatting", "achievements", "readability", "action-verbs",
];

function createAnalysis() {
  return {
    name: "Student Example",
    skills: ["Python", "SQL"],
    contact: { email: "student@example.com", phone: null },
  };
}

function identityFor(analysis) {
  return {
    extractionKey: "stable-resume-key",
    contentFingerprint: "content-fingerprint",
    extractionContractVersion: "resume-extraction-v4",
    promptVersion: "resume-prompt-v5",
    modelConfiguration: "model-a + model-b",
    canonicalAnalysisHash: hashCanonicalAnalysis(analysis),
  };
}

function qualityResult() {
  return {
    rubricVersion: "1.0.0",
    score: 82,
    maxScore: 100,
    criteria: [
      { id: "skills", earned: 17, weight: 20 },
      { id: "projects", earned: 20, weight: 25 },
      { id: "practical", earned: 15, weight: 20 },
      { id: "education", earned: 13, weight: 15 },
      { id: "structure", earned: 17, weight: 20 },
    ],
    atsCompatibility: {
      sectionBreakdown: sectionIds.map((id, index) => ({ id, score: index * 10 })),
    },
  };
}

function createModel(record) {
  return {
    findOneAndUpdate(query, update) {
      const matches = record &&
        record._id === query._id &&
        record.status === query.status &&
        record.scoringRubricVersion === query.scoringRubricVersion &&
        record.cacheIdentity.canonicalAnalysisHash ===
          query["cacheIdentity.canonicalAnalysisHash"];
      if (matches) Object.assign(record, update.$set);
      return { lean: async () => matches ? structuredClone(record) : null };
    },
    async updateOne(query, update) {
      const matches = record && record._id === query._id && record.status === query.status;
      if (matches) Object.assign(record, update.$set);
      return { matchedCount: matches ? 1 : 0 };
    },
  };
}

test("analysis hashes are stable across object key order", () => {
  assert.equal(
    hashCanonicalAnalysis({ name: "Jane", skills: ["Python"], contact: { email: "a@b.com" } }),
    hashCanonicalAnalysis({ contact: { email: "a@b.com" }, skills: ["Python"], name: "Jane" }),
  );
  assert.equal(
    hashCanonicalAnalysis({
      name: "Jane",
      skills: ["Python"],
      contact: { email: "a@b.com", phone: null },
    }),
    "f49e3c5b3b7df553d85763f40606e625fc72cc6f09b606512c335920348e0145",
  );
});

test("saves and retrieves the complete overall, five-criterion, and ten-section score", async () => {
  const analysis = createAnalysis();
  const identity = identityFor(analysis);
  const record = {
    _id: identity.extractionKey,
    status: "ready",
    cacheIdentity: identity,
  };
  const model = createModel(record);
  const cache = createPersistentResumeCache({ modelProvider: async () => model });
  const result = qualityResult();

  await cache.saveQuality(identity, analysis, result);

  assert.equal(record.overallScore, 82);
  assert.equal(record.criteria.length, 5);
  assert.equal(record.sectionBreakdown.length, 10);
  assert.deepEqual(await cache.getQuality(identity, analysis, "1.0.0"), result);
});

test("retrieves the saved ATS result after creating a new cache service instance", async () => {
  const analysis = createAnalysis();
  const identity = identityFor(analysis);
  const record = {
    _id: identity.extractionKey,
    status: "ready",
    cacheIdentity: identity,
    scoringRubricVersion: "1.0.0",
    qualityResult: qualityResult(),
  };
  const restartedCache = createPersistentResumeCache({
    modelProvider: async () => createModel(record),
  });

  assert.deepEqual(
    await restartedCache.getQuality(identity, analysis, "1.0.0"),
    record.qualityResult,
  );
});

test("rejects an analysis whose saved fingerprint hash does not match", async () => {
  const analysis = createAnalysis();
  const identity = identityFor(analysis);
  identity.canonicalAnalysisHash = "different-analysis-hash";
  const cache = createPersistentResumeCache({ modelProvider: async () => createModel(null) });

  await assert.rejects(
    cache.getQuality(identity, analysis, "1.0.0"),
    PersistentCacheIdentityError,
  );
});
