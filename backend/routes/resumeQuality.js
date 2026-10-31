const express = require("express");
const {
  ResumeQualityInputError,
  scoreResumeQuality: defaultScoreResumeQuality,
} = require("../services/resumeQualityScoring");
const {
  PersistentCacheIdentityError,
  PersistentCacheUnavailableError,
  getPersistentResumeCache,
} = require("../services/persistentResumeCache");
const { RESUME_QUALITY_RUBRIC } = require("../config/resumeQualityRubric");

function createResumeQualityRouter(options = {}) {
  const router = express.Router();
  const scoreResumeQuality = options.scoreResumeQuality ?? defaultScoreResumeQuality;
  const persistentCache = options.persistentCache ?? getPersistentResumeCache();

  router.post("/quality-score", async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid JSON request body.",
      });
    }

    if (
      Object.keys(body).some(
        (field) => field !== "analysis" && field !== "cacheIdentity",
      ) ||
      !body.analysis ||
      typeof body.analysis !== "object" ||
      Array.isArray(body.analysis) ||
      !body.cacheIdentity
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a structured resume analysis and its cache identity.",
      });
    }

    try {
      const cached = await persistentCache.getQuality(
        body.cacheIdentity,
        body.analysis,
        RESUME_QUALITY_RUBRIC.version,
      );
      if (cached) {
        return res.status(200).json({
          success: true,
          ...cached,
          cacheStatus: "persistent",
        });
      }

      const qualityResult = scoreResumeQuality(body.analysis);
      await persistentCache.saveQuality(
        body.cacheIdentity,
        body.analysis,
        qualityResult,
      );
      return res.status(200).json({
        success: true,
        ...qualityResult,
        cacheStatus: "fresh",
      });
    } catch (error) {
      if (error instanceof PersistentCacheIdentityError) {
        return res.status(409).json({
          success: false,
          code: "persistent_cache_identity_mismatch",
          message: "The saved resume analysis or ATS score is incomplete or incompatible.",
        });
      }
      if (error instanceof PersistentCacheUnavailableError) {
        return res.status(503).json({
          success: false,
          code: "persistent_cache_unavailable",
          message: "Persistent ATS storage is temporarily unavailable. No report was saved.",
        });
      }
      if (error instanceof ResumeQualityInputError) {
        return res.status(400).json({
          success: false,
          message: "The resume-quality request is invalid.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while scoring resume quality.",
      });
    }
  });

  return router;
}

module.exports = { createResumeQualityRouter };
