class InvalidResumeTextError extends Error {}
class AiConfigurationError extends Error {}
class AiRateLimitError extends Error {}
class AiTimeoutError extends Error {}

class AiProviderError extends Error {
  constructor(options = {}) {
    super();
    this.name = "AiProviderError";
    this.diagnosticCategory = "provider_error";
    const safeOptions =
      options && typeof options === "object" ? options : {};
    this.httpStatus = safeOptions.httpStatus;
    this.upstreamType = safeOptions.upstreamType;
    this.upstreamCode = safeOptions.upstreamCode;
  }
}

class InvalidProviderOutputError extends Error {
  constructor(options = {}) {
    super();
    this.name = "InvalidProviderOutputError";

    const safeOptions =
      options && typeof options === "object" ? options : {};
    this.diagnosticCategory = safeOptions.category ?? "provider_output";
    this.reasonCodes = Array.isArray(safeOptions.reasonCodes)
      ? [...safeOptions.reasonCodes]
      : [];
    this.schemaPath = safeOptions.schemaPath;
  }
}

class DocumentNotResumeError extends Error {
  constructor(options = {}) {
    super(options.message || "This PDF doesn't appear to be a resume. Please upload your resume or CV.");
    this.name = "DocumentNotResumeError";
    this.diagnosticCategory = "content_validation";
    this.code = options.code || "DOCUMENT_NOT_RESUME";
    this.reason = options.reason || "not_a_resume";
    this.score = typeof options.score === "number" ? options.score : 0;
  }
}

module.exports = {
  InvalidResumeTextError,
  DocumentNotResumeError,
  AiConfigurationError,
  AiRateLimitError,
  AiTimeoutError,
  AiProviderError,
  InvalidProviderOutputError,
};
