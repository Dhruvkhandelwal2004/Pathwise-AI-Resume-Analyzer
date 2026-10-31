const express = require("express");
const {
  ResumeQualityInputError,
  scoreResumeQuality: defaultScoreResumeQuality,
} = require("../services/resumeQualityScoring");

function createResumeQualityRouter(options = {}) {
  const router = express.Router();
  const scoreResumeQuality = options.scoreResumeQuality ?? defaultScoreResumeQuality;

  router.post("/quality-score", (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid JSON request body.",
      });
    }

    if (
      Object.keys(body).some((field) => field !== "analysis") ||
      !body.analysis ||
      typeof body.analysis !== "object" ||
      Array.isArray(body.analysis)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide the structured resume analysis in the 'analysis' field.",
      });
    }

    try {
      return res.status(200).json({
        success: true,
        ...scoreResumeQuality(body.analysis),
      });
    } catch (error) {
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
