const Ajv = require("ajv");
const {
  resumeAnalysisSchema,
  resumeProviderSchema,
} = require("../schemas/resumeAnalysisSchema");
const { createGroqProvider } = require("./groqProvider");
const {
  AiConfigurationError,
  DocumentNotResumeError,
  InvalidProviderOutputError,
  InvalidResumeTextError,
} = require("./aiErrors");
const { validateResumeContent } = require("./resumeValidation");

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
const validateSchema = ajv.compile(resumeAnalysisSchema);
const validateProviderSchema = ajv.compile(resumeProviderSchema);

function escapeJsonPointerSegment(value) {
  return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
}

function getSchemaFailurePath(errors) {
  const firstError = Array.isArray(errors) ? errors[0] : undefined;
  if (!firstError) {
    return "/";
  }

  let path = firstError.instancePath || "";
  const property =
    firstError.keyword === "required"
      ? firstError.params?.missingProperty
      : firstError.keyword === "additionalProperties"
        ? firstError.params?.additionalProperty
        : undefined;

  if (property) {
    path = `${path}/${escapeJsonPointerSegment(property)}`;
  }

  return path || "/";
}

function createSchemaValidationError(errors) {
  return new InvalidProviderOutputError({
    category: "schema_validation",
    schemaPath: getSchemaFailurePath(errors),
  });
}

function normalizeResumeText(text) {
  if (typeof text !== "string") {
    throw new InvalidResumeTextError();
  }

  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertNonEmptyEvidence(items) {
  return items.every(
    (item) =>
      item.point.trim().length > 0 &&
      item.evidence.trim().length > 0 &&
      item.whyItMatters.trim().length > 0,
  );
}

function hasMeaningfulText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulArray(items) {
  return items.some(hasMeaningfulText);
}

function hasMeaningfulRecord(record, scalarFields, arrayFields = []) {
  return (
    scalarFields.some((field) => hasMeaningfulText(record[field])) ||
    arrayFields.some((field) => hasMeaningfulArray(record[field]))
  );
}

function cleanResumeAnalysis(analysis) {
  const cleaned = structuredClone(analysis);

  cleaned.education = cleaned.education.filter((entry) =>
    hasMeaningfulRecord(
      entry,
      [
        "institution",
        "degree",
        "fieldOfStudy",
        "location",
        "startDate",
        "endDate",
      ],
      ["details"],
    ),
  );

  cleaned.experience = cleaned.experience.filter((entry) =>
    hasMeaningfulRecord(
      entry,
      ["employer", "title", "location", "startDate", "endDate"],
      ["highlights"],
    ),
  );

  cleaned.projects = cleaned.projects.filter((entry) =>
    hasMeaningfulRecord(entry, ["name", "description", "url"], [
      "technologies",
      "highlights",
    ]),
  );

  cleaned.certifications = cleaned.certifications.filter((entry) =>
    hasMeaningfulRecord(entry, ["name", "issuer", "date", "credentialId"]),
  );

  for (const key of ["technical", "tools", "domain", "interpersonal"]) {
    cleaned.skillProfile[key] = cleaned.skillProfile[key].filter(hasMeaningfulText);
  }

  cleaned.skills = cleaned.skills.filter(hasMeaningfulText);
  cleaned.uncertainties = cleaned.uncertainties.filter(hasMeaningfulText);

  return cleaned;
}

const EDUCATION_FIELDS = [
  ["institution", 20, "institution"],
  ["degree", 20, "degree or qualification"],
  ["fieldOfStudy", 15, "field of study"],
  ["location", 5, "location"],
  ["startDate", 10, "start date"],
  ["endDate", 10, "end date"],
  ["details", 20, "coursework, result, or relevant detail"],
];

function calculateEducationScore(education) {
  const rationale =
    "Measures completeness of education evidence in this resume only; it does not rate institutions, academic ability, or candidate quality.";

  if (education.length === 0) {
    return {
      score: 0,
      label: "not-found",
      rationale,
      missingInformation: EDUCATION_FIELDS.map(([, , label]) => label),
    };
  }

  let earned = 0;
  const missing = new Set();
  for (const entry of education) {
    for (const [field, weight, label] of EDUCATION_FIELDS) {
      const value = entry[field];
      const present = Array.isArray(value)
        ? hasMeaningfulArray(value)
        : hasMeaningfulText(value);
      if (present) earned += weight;
      else missing.add(label);
    }
  }

  const score = Math.round(earned / education.length);
  const label =
    score >= 85
      ? "complete"
      : score >= 65
        ? "mostly-complete"
        : score >= 35
          ? "partial"
          : score > 0
            ? "limited"
            : "not-found";

  return {
    score,
    label,
    rationale,
    missingInformation: [...missing].sort(),
  };
}

function hasConcreteEvidence(analysis) {
  return (
    analysis.education.length > 0 ||
    analysis.experience.length > 0 ||
    analysis.projects.length > 0 ||
    analysis.certifications.length > 0 ||
    analysis.achievements.length > 0 ||
    analysis.activities.length > 0 ||
    analysis.additionalInformation.length > 0 ||
    hasMeaningfulArray(analysis.skills)
  );
}

function assertNonEmptySuggestions(items) {
  return items.every(
    (item) =>
      item.observation.trim().length > 0 &&
      item.evidence.trim().length > 0 &&
      item.suggestion.trim().length > 0 &&
      item.rationale.trim().length > 0 &&
      item.expectedResult.trim().length > 0,
  );
}

function validateResumeAnalysis(analysis) {
  const hasEducationScore = Object.prototype.hasOwnProperty.call(
    analysis,
    "educationScore",
  );
  const inputValidator = hasEducationScore ? validateSchema : validateProviderSchema;
  if (!inputValidator(analysis)) {
    throw createSchemaValidationError(inputValidator.errors);
  }

  const cleaned = cleanResumeAnalysis(analysis);
  cleaned.educationScore = calculateEducationScore(cleaned.education);

  if (!validateSchema(cleaned)) {
    throw createSchemaValidationError(validateSchema.errors);
  }

  const semanticReasons = [];

  if (
    !assertNonEmptyEvidence(cleaned.strengths) ||
    !assertNonEmptyEvidence(cleaned.weaknesses) ||
    !assertNonEmptyEvidence(cleaned.achievements) ||
    !assertNonEmptyEvidence(cleaned.activities) ||
    !assertNonEmptyEvidence(cleaned.additionalInformation)
  ) {
    semanticReasons.push("blank_evidence");
  }

  if (!assertNonEmptySuggestions(cleaned.improvementSuggestions)) {
    semanticReasons.push("blank_suggestion");
  }

  if (
    !hasMeaningfulText(cleaned.evidenceQuality.summary) ||
    !cleaned.evidenceQuality.evidence.every(hasMeaningfulText)
  ) {
    semanticReasons.push("blank_evidence_quality");
  }

  const explicitSkills = new Set(
    cleaned.skills.map((skill) => skill.normalize("NFKC").toLocaleLowerCase("en-US")),
  );
  const groupedSkills = Object.values(cleaned.skillProfile).flat();
  if (
    groupedSkills.some(
      (skill) =>
        !explicitSkills.has(skill.normalize("NFKC").toLocaleLowerCase("en-US")),
    )
  ) {
    semanticReasons.push("unsupported_skill_profile");
  }

  if (hasConcreteEvidence(cleaned)) {
    if (cleaned.strengths.length === 0) {
      semanticReasons.push("missing_strengths");
    }
    if (cleaned.improvementSuggestions.length === 0) {
      semanticReasons.push("missing_improvement_suggestions");
    }
  }

  if (semanticReasons.length > 0) {
    throw new InvalidProviderOutputError({
      category: "semantic_validation",
      reasonCodes: semanticReasons,
    });
  }

  return cleaned;
}

function createProvider(providerName) {
  if (providerName === "groq") {
    return createGroqProvider();
  }

  throw new AiConfigurationError();
}

function createResumeAnalyzer(options = {}) {
  let provider = options.provider;
  const providerName = options.providerName ?? process.env.AI_PROVIDER ?? "groq";

  return async function analyzeResumeText(originalText) {
    const normalizedText = normalizeResumeText(originalText);

    if (!normalizedText) {
      throw new InvalidResumeTextError();
    }

    const validation = validateResumeContent(normalizedText);
    if (!validation.isValid) {
      throw new DocumentNotResumeError(validation);
    }

    provider ??= createProvider(providerName);
    const analysis = await provider.analyze(normalizedText);

    return {
      analysis: validateResumeAnalysis(analysis),
      metadata: {
        provider: provider.name,
        model: provider.model,
      },
    };
  };
}

let defaultAnalyzer;

async function analyzeResume(text) {
  defaultAnalyzer ??= createResumeAnalyzer();
  return defaultAnalyzer(text);
}

module.exports = {
  analyzeResume,
  cleanResumeAnalysis,
  createResumeAnalyzer,
  normalizeResumeText,
  calculateEducationScore,
  validateResumeAnalysis,
};
