const nullableString = { type: ["string", "null"] };

const evidenceItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    point: { type: "string" },
    evidence: { type: "string" },
    whyItMatters: { type: "string" },
  },
  required: ["point", "evidence", "whyItMatters"],
};

const skillProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    technical: { type: "array", items: { type: "string" } },
    tools: { type: "array", items: { type: "string" } },
    domain: { type: "array", items: { type: "string" } },
    interpersonal: { type: "array", items: { type: "string" } },
  },
  required: ["technical", "tools", "domain", "interpersonal"],
};

const evidenceQualitySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    level: {
      type: "string",
      enum: ["strong", "mixed", "limited", "insufficient"],
    },
    summary: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
  required: ["level", "summary", "evidence"],
};

const educationScoreSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    label: {
      type: "string",
      enum: [
        "complete",
        "mostly-complete",
        "partial",
        "limited",
        "not-found",
      ],
    },
    rationale: { type: "string" },
    missingInformation: { type: "array", items: { type: "string" } },
  },
  required: ["score", "label", "rationale", "missingInformation"],
};

const providerProperties = {
  name: nullableString,
  contact: {
    type: "object",
    additionalProperties: false,
    properties: {
      email: nullableString,
      phone: nullableString,
      location: nullableString,
      linkedin: nullableString,
      website: nullableString,
    },
    required: ["email", "phone", "location", "linkedin", "website"],
  },
  professionalSummary: nullableString,
  education: {
    type: "array",
    description:
      "Education supported by the resume. Omit entries whose fields are all unavailable.",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        institution: nullableString,
        degree: nullableString,
        fieldOfStudy: nullableString,
        location: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        details: { type: "array", items: { type: "string" } },
      },
      required: [
        "institution",
        "degree",
        "fieldOfStudy",
        "location",
        "startDate",
        "endDate",
        "details",
      ],
    },
  },
  experience: {
    type: "array",
    description:
      "Employment and internships explicitly supported by the resume.",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        employer: nullableString,
        title: nullableString,
        location: nullableString,
        startDate: nullableString,
        endDate: nullableString,
        highlights: { type: "array", items: { type: "string" } },
      },
      required: [
        "employer",
        "title",
        "location",
        "startDate",
        "endDate",
        "highlights",
      ],
    },
  },
  projects: {
    type: "array",
    description:
      "Projects explicitly supported by the resume; never invent outcomes.",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: nullableString,
        description: nullableString,
        technologies: { type: "array", items: { type: "string" } },
        highlights: { type: "array", items: { type: "string" } },
        url: nullableString,
      },
      required: ["name", "description", "technologies", "highlights", "url"],
    },
  },
  skills: { type: "array", items: { type: "string" } },
  skillProfile: skillProfileSchema,
  certifications: {
    type: "array",
    description: "Certificates and certifications supported by the resume.",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: nullableString,
        issuer: nullableString,
        date: nullableString,
        credentialId: nullableString,
      },
      required: ["name", "issuer", "date", "credentialId"],
    },
  },
  strengths: { type: "array", items: evidenceItemSchema },
  weaknesses: { type: "array", items: evidenceItemSchema },
  improvementSuggestions: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        observation: { type: "string" },
        evidence: { type: "string" },
        suggestion: { type: "string" },
        rationale: { type: "string" },
        expectedResult: { type: "string" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: [
        "observation",
        "evidence",
        "suggestion",
        "rationale",
        "expectedResult",
        "priority",
      ],
    },
  },
  achievements: { type: "array", items: evidenceItemSchema },
  activities: { type: "array", items: evidenceItemSchema },
  additionalInformation: { type: "array", items: evidenceItemSchema },
  evidenceQuality: evidenceQualitySchema,
  uncertainties: { type: "array", items: { type: "string" } },
};

const providerRequired = [
  "name",
  "contact",
  "professionalSummary",
  "education",
  "experience",
  "projects",
  "skills",
  "skillProfile",
  "certifications",
  "strengths",
  "weaknesses",
  "improvementSuggestions",
  "achievements",
  "activities",
  "additionalInformation",
  "evidenceQuality",
  "uncertainties",
];

const resumeProviderSchema = {
  type: "object",
  additionalProperties: false,
  properties: providerProperties,
  required: providerRequired,
};

const resumeAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...providerProperties,
    educationScore: educationScoreSchema,
  },
  required: [...providerRequired, "educationScore"],
};

module.exports = {
  educationScoreSchema,
  resumeAnalysisSchema,
  resumeProviderSchema,
};
