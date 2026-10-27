const express = require("express");
const {
  CareerMatchingInputError,
  scoreCareerMatches: defaultScoreCareerMatches,
} = require("../services/careerMatching");
const {
  CareerCatalogInputError,
  getCareerProfile: defaultGetCareerProfile,
  searchCareerProfiles: defaultSearchCareerProfiles,
} = require("../services/careerCatalog");

function createCareerMatchingRouter(options = {}) {
  const router = express.Router();
  const scoreCareerMatches =
    options.scoreCareerMatches ?? defaultScoreCareerMatches;
  const searchCareerProfiles =
    options.searchCareerProfiles ?? defaultSearchCareerProfiles;
  const getCareerProfile = options.getCareerProfile ?? defaultGetCareerProfile;

  router.get("/roles", (req, res) => {
    const query = req.query.query ?? "";
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    try {
      return res.status(200).json({
        success: true,
        ...searchCareerProfiles(query, limit),
      });
    } catch (error) {
      if (error instanceof CareerCatalogInputError) {
        return res.status(400).json({
          success: false,
          message: "The job-role search request is invalid.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "The job-role catalogue is temporarily unavailable.",
      });
    }
  });

  router.get("/roles/:roleId", (req, res) => {
    try {
      const profile = getCareerProfile(req.params.roleId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "This job profile is not available in the supported catalogue.",
        });
      }
      return res.status(200).json({ success: true, profile });
    } catch (error) {
      if (error instanceof CareerCatalogInputError) {
        return res.status(400).json({
          success: false,
          message: "The canonical role ID is invalid.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "The job-role catalogue is temporarily unavailable.",
      });
    }
  });

  router.post("/match", (req, res) => {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid JSON request body.",
      });
    }

    const allowedFields = new Set(["analysis", "targetRoleId", "studentEvidence"]);
    if (Object.keys(body).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({
        success: false,
        message: "The request contains unsupported fields.",
      });
    }

    if (
      !body.analysis ||
      typeof body.analysis !== "object" ||
      Array.isArray(body.analysis)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide the structured resume analysis in the 'analysis' field.",
      });
    }

    if (
      body.targetRoleId !== undefined &&
      (typeof body.targetRoleId !== "string" || !body.targetRoleId.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "The target role ID must be a non-empty string.",
      });
    }

    try {
      const result = scoreCareerMatches(
        body.analysis,
        body.targetRoleId,
        body.studentEvidence,
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof CareerMatchingInputError) {
        return res.status(400).json({
          success: false,
          message: "The career-matching request is invalid.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while matching career roles.",
      });
    }
  });

  return router;
}

module.exports = { createCareerMatchingRouter };
