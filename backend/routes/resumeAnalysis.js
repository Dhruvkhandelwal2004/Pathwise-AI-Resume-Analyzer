const express = require("express");
const { analyzeResume: defaultAnalyzeResume } = require("../services/resumeAnalysis");
const {
  AiConfigurationError,
  AiProviderError,
  AiRateLimitError,
  AiTimeoutError,
  DocumentNotResumeError,
  InvalidProviderOutputError,
  InvalidResumeTextError,
} = require("../services/aiErrors");

const MAX_RESUME_TEXT_CHARACTERS = 100_000;
const DIAGNOSTIC_CATEGORIES = new Set([
  "content_validation",
  "provider_output",
  "schema_validation",
  "semantic_validation",
]);
const DIAGNOSTIC_REASON_CODES = new Set([
  "empty_content",
  "invalid_json",
  "missing_strengths",
  "missing_improvement_suggestions",
  "blank_evidence",
  "blank_suggestion",
  "blank_evidence_quality",
  "unsupported_skill_profile",
  "not_a_resume",
  "certificate_only",
  "marksheet_only",
  "insufficient_content",
  "ambiguous",
]);
const SAFE_UPSTREAM_TYPES = new Set([
  "api_error",
  "invalid_request_error",
  "server_error",
]);
const SAFE_UPSTREAM_CODES = new Set([
  "invalid_json_schema",
  "invalid_request_error",
  "json_schema_invalid",
  "json_schema_validation_failed",
  "json_validate_failed",
  "model_not_found",
  "unsupported_response_format",
]);
const SAFE_SCHEMA_PATH_SEGMENTS = new Set([
  "name",
  "contact",
  "email",
  "phone",
  "location",
  "linkedin",
  "website",
  "professionalSummary",
  "education",
  "institution",
  "degree",
  "fieldOfStudy",
  "startDate",
  "endDate",
  "details",
  "experience",
  "employer",
  "title",
  "highlights",
  "projects",
  "description",
  "url",
  "technologies",
  "skills",
  "skillProfile",
  "technical",
  "tools",
  "domain",
  "interpersonal",
  "certifications",
  "issuer",
  "date",
  "credentialId",
  "strengths",
  "weaknesses",
  "point",
  "evidence",
  "whyItMatters",
  "improvementSuggestions",
  "observation",
  "suggestion",
  "rationale",
  "expectedResult",
  "achievements",
  "activities",
  "additionalInformation",
  "evidenceQuality",
  "level",
  "summary",
  "educationScore",
  "score",
  "label",
  "missingInformation",
  "uncertainties",
]);

function sanitizeSchemaPath(path) {
  if (typeof path !== "string" || !path.startsWith("/")) {
    return "/unknown";
  }

  const sanitized = path
    .split("/")
    .map((segment, index) => {
      if (index === 0) {
        return "";
      }

      if (/^\d+$/.test(segment)) {
        return segment.slice(0, 10);
      }

      return SAFE_SCHEMA_PATH_SEGMENTS.has(segment) ? segment : "unknown";
    })
    .join("/");

  return sanitized.slice(0, 200) || "/unknown";
}

function sanitizeUpstreamIdentifier(value, allowlist) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return typeof value === "string" && allowlist.has(value)
    ? value
    : "redacted";
}

function formatResumeAnalysisDiagnostic(error) {
  if (error instanceof AiProviderError) {
    const status = Number(error.httpStatus);
    const safeStatus =
      Number.isInteger(status) && status >= 400 && status <= 599
        ? status
        : "unknown";
    let message = `[resume-analysis] category=provider_error status=${safeStatus}`;
    const upstreamType = sanitizeUpstreamIdentifier(
      error.upstreamType,
      SAFE_UPSTREAM_TYPES,
    );
    const upstreamCode = sanitizeUpstreamIdentifier(
      error.upstreamCode,
      SAFE_UPSTREAM_CODES,
    );
    if (upstreamType) {
      message += ` type=${upstreamType}`;
    }
    if (upstreamCode) {
      message += ` code=${upstreamCode}`;
    }
    return message;
  }

  if (error instanceof DocumentNotResumeError) {
    const reason = DIAGNOSTIC_REASON_CODES.has(error.reason)
      ? error.reason
      : "not_a_resume";
    return `[resume-analysis] category=content_validation reason=${reason}`;
  }

  if (!(error instanceof InvalidProviderOutputError)) {
    return null;
  }

  const category = DIAGNOSTIC_CATEGORIES.has(error.diagnosticCategory)
    ? error.diagnosticCategory
    : "provider_output";

  if (category === "schema_validation") {
    return `[resume-analysis] category=schema_validation path=${sanitizeSchemaPath(error.schemaPath)}`;
  }

  const reasonCodes = Array.isArray(error.reasonCodes)
    ? error.reasonCodes.filter((reason) => DIAGNOSTIC_REASON_CODES.has(reason))
    : [];
  const reasons = reasonCodes.length > 0 ? reasonCodes.join(",") : "invalid_output";
  return `[resume-analysis] category=${category} reason=${reasons}`;
}

function logResumeAnalysisDiagnostic(error, logger) {
  const message = formatResumeAnalysisDiagnostic(error);
  if (message && logger && typeof logger.warn === "function") {
    logger.warn(message);
  }
}

function createResumeAnalysisRouter(options = {}) {
  const router = express.Router();
  const analyzeResume = options.analyzeResume ?? defaultAnalyzeResume;
  const logger = options.logger ?? console;

  router.post("/analyze", async (req, res) => {
    const text = req.body?.text;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Provide non-empty extracted resume text in the 'text' field.",
      });
    }

    if (text.length > MAX_RESUME_TEXT_CHARACTERS) {
      return res.status(413).json({
        success: false,
        message: "The extracted resume text is too large to analyze.",
      });
    }

    try {
      const result = await analyzeResume(text);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof DocumentNotResumeError) {
        logResumeAnalysisDiagnostic(error, logger);
        return res.status(422).json({
          success: false,
          code: error.code || "DOCUMENT_NOT_RESUME",
          message: error.message,
        });
      }

      if (error instanceof InvalidResumeTextError) {
        return res.status(400).json({
          success: false,
          message: "The extracted resume text is empty after normalization.",
        });
      }

      if (error instanceof AiConfigurationError) {
        return res.status(503).json({
          success: false,
          message: "AI analysis is not configured or is unavailable.",
        });
      }

      if (error instanceof AiRateLimitError) {
        return res.status(429).json({
          success: false,
          message: "AI analysis is temporarily rate-limited. Please try again later.",
        });
      }

      if (error instanceof AiTimeoutError) {
        return res.status(504).json({
          success: false,
          message: "AI analysis timed out. Please try again.",
        });
      }

      if (
        error instanceof InvalidProviderOutputError ||
        error instanceof AiProviderError
      ) {
        logResumeAnalysisDiagnostic(error, logger);
        return res.status(502).json({
          success: false,
          message: "AI analysis could not produce a valid result.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while analyzing the resume.",
      });
    }
  });

  return router;
}

module.exports = {
  MAX_RESUME_TEXT_CHARACTERS,
  createResumeAnalysisRouter,
  formatResumeAnalysisDiagnostic,
};
