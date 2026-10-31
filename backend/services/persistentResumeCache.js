const crypto = require("node:crypto");
const mongoose = require("mongoose");

class PersistentCacheUnavailableError extends Error {}
class PersistentCacheIdentityError extends Error {}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function hashCanonicalAnalysis(analysis) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(analysis)), "utf8")
    .digest("hex");
}

const cacheSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, required: true },
    analysis: { type: mongoose.Schema.Types.Mixed },
    canonicalEvidence: { type: mongoose.Schema.Types.Mixed },
    cacheIdentity: { type: mongoose.Schema.Types.Mixed },
    actualModel: String,
    qualityResult: { type: mongoose.Schema.Types.Mixed },
    scoringRubricVersion: String,
    overallScore: Number,
    criteria: { type: mongoose.Schema.Types.Mixed },
    sectionBreakdown: { type: mongoose.Schema.Types.Mixed },
    createdAt: Date,
    lastUsedAt: Date,
    completedAt: Date,
    scoredAt: Date,
  },
  {
    collection: "resume_analysis_cache",
    strict: false,
    versionKey: false,
  },
);

let connectionPromise;
let cacheModel;

async function ensureModel() {
  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new PersistentCacheUnavailableError(
      "Persistent resume storage is not configured.",
    );
  }

  try {
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
      connectionPromise ??= mongoose.connect(uri, {
        dbName: String(process.env.MONGODB_DATABASE || "pathwise").trim(),
        serverSelectionTimeoutMS: 7_000,
        connectTimeoutMS: 5_000,
        socketTimeoutMS: 5_000,
      });
      await connectionPromise;
    } else if (connectionPromise) {
      await connectionPromise;
    }
    cacheModel ??=
      mongoose.models.ResumeAnalysisCache ||
      mongoose.model("ResumeAnalysisCache", cacheSchema);
    return cacheModel;
  } catch (error) {
    connectionPromise = undefined;
    throw new PersistentCacheUnavailableError(
      "Persistent resume storage is unavailable.",
      { cause: error },
    );
  }
}

function validateIdentity(identity, analysis) {
  const required = [
    "extractionKey",
    "contentFingerprint",
    "extractionContractVersion",
    "promptVersion",
    "modelConfiguration",
    "canonicalAnalysisHash",
  ];
  if (
    !identity ||
    typeof identity !== "object" ||
    Array.isArray(identity) ||
    required.some((key) => typeof identity[key] !== "string" || !identity[key])
  ) {
    throw new PersistentCacheIdentityError("Invalid cache identity.");
  }
  if (identity.canonicalAnalysisHash !== hashCanonicalAnalysis(analysis)) {
    throw new PersistentCacheIdentityError(
      "The cached analysis identity does not match the submitted analysis.",
    );
  }
  return { ...identity };
}

function identityQuery(identity) {
  return {
    _id: identity.extractionKey,
    "cacheIdentity.contentFingerprint": identity.contentFingerprint,
    "cacheIdentity.extractionContractVersion": identity.extractionContractVersion,
    "cacheIdentity.promptVersion": identity.promptVersion,
    "cacheIdentity.modelConfiguration": identity.modelConfiguration,
    "cacheIdentity.canonicalAnalysisHash": identity.canonicalAnalysisHash,
  };
}

function isCompleteQualityResult(result) {
  return Boolean(
    result &&
      Number.isInteger(result.score) &&
      result.maxScore === 100 &&
      result.rubricVersion &&
      Array.isArray(result.criteria) &&
      result.criteria.length === 5 &&
      Array.isArray(result.atsCompatibility?.sectionBreakdown) &&
      result.atsCompatibility.sectionBreakdown.length === 10,
  );
}

function createPersistentResumeCache(options = {}) {
  const modelProvider = options.modelProvider ?? ensureModel;

  return {
    validateIdentity,
    async getQuality(identity, analysis, rubricVersion) {
      const checked = validateIdentity(identity, analysis);
      let model;
      try {
        model = await modelProvider();
        const record = await model
          .findOneAndUpdate(
            {
              ...identityQuery(checked),
              status: "ready",
              scoringRubricVersion: rubricVersion,
              qualityResult: { $exists: true },
            },
            { $set: { lastUsedAt: new Date() } },
            { new: true },
          )
          .lean();
        if (!record) return null;
        if (!isCompleteQualityResult(record.qualityResult)) {
          throw new PersistentCacheIdentityError(
            "The saved ATS score record is incomplete.",
          );
        }
        return record.qualityResult;
      } catch (error) {
        if (
          error instanceof PersistentCacheIdentityError ||
          error instanceof PersistentCacheUnavailableError
        ) {
          throw error;
        }
        throw new PersistentCacheUnavailableError(
          "Persistent resume storage could not be read.",
          { cause: error },
        );
      }
    },
    async saveQuality(identity, analysis, qualityResult) {
      const checked = validateIdentity(identity, analysis);
      if (!isCompleteQualityResult(qualityResult)) {
        throw new PersistentCacheIdentityError(
          "Only complete ATS scores can be saved.",
        );
      }
      let model;
      try {
        model = await modelProvider();
        const now = new Date();
        const update = await model.updateOne(
          {
            ...identityQuery(checked),
            status: "ready",
          },
          {
            $set: {
              scoringRubricVersion: qualityResult.rubricVersion,
              qualityResult,
              overallScore: qualityResult.score,
              criteria: qualityResult.criteria,
              sectionBreakdown: qualityResult.atsCompatibility.sectionBreakdown,
              scoredAt: now,
              lastUsedAt: now,
            },
          },
        );
        if (update.matchedCount !== 1) {
          throw new PersistentCacheIdentityError(
            "The extraction cache record is incomplete or incompatible.",
          );
        }
      } catch (error) {
        if (
          error instanceof PersistentCacheIdentityError ||
          error instanceof PersistentCacheUnavailableError
        ) {
          throw error;
        }
        throw new PersistentCacheUnavailableError(
          "Persistent resume storage could not be updated.",
          { cause: error },
        );
      }
    },
  };
}

let defaultCache;

function getPersistentResumeCache() {
  defaultCache ??= createPersistentResumeCache();
  return defaultCache;
}

module.exports = {
  PersistentCacheIdentityError,
  PersistentCacheUnavailableError,
  createPersistentResumeCache,
  getPersistentResumeCache,
  hashCanonicalAnalysis,
};
