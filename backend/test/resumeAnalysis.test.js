const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { resumeAnalysisSchema } = require("../schemas/resumeAnalysisSchema");
const {
  AiConfigurationError,
  AiProviderError,
  AiRateLimitError,
  AiTimeoutError,
  InvalidProviderOutputError,
} = require("../services/aiErrors");
const { createGroqProvider } = require("../services/groqProvider");
const {
  createResumeAnalyzer,
  normalizeResumeText,
  validateResumeAnalysis,
} = require("../services/resumeAnalysis");
const {
  MAX_RESUME_TEXT_CHARACTERS,
  createResumeAnalysisRouter,
  formatResumeAnalysisDiagnostic,
} = require("../routes/resumeAnalysis");

function createValidAnalysis() {
  return {
    name: "Jane Doe",
    contact: {
      email: "jane@example.com",
      phone: null,
      location: null,
      linkedin: null,
      website: null,
    },
    professionalSummary: "Software developer with web application experience.",
    education: [
      {
        institution: "Example University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        location: null,
        startDate: null,
        endDate: "2025",
        details: [],
      },
    ],
    experience: [],
    projects: [
      {
        name: "Portfolio",
        description: "A personal web portfolio.",
        technologies: ["React"],
        highlights: [],
        url: null,
      },
    ],
    skills: ["JavaScript", "React"],
    certifications: [],
    strengths: [
      {
        point: "Shows practical React experience.",
        evidence: "The Portfolio project explicitly lists React.",
      },
    ],
    weaknesses: [
      {
        point: "Project outcomes are not quantified.",
        evidence: "The project description contains no measurable result.",
      },
    ],
    improvementSuggestions: [
      {
        suggestion: "Add a measurable project outcome.",
        rationale: "It would make the impact easier to evaluate.",
        priority: "medium",
      },
    ],
    uncertainties: [],
  };
}

function createCompleteAnalysis(overrides = {}) {
  const analysis = createValidAnalysis();
  return {
    ...analysis,
    skillProfile: {
      technical: ["JavaScript", "React"],
      tools: [],
      domain: [],
      interpersonal: [],
    },
    strengths: analysis.strengths.map((item) => ({
      ...item,
      whyItMatters: "Shows applied project work.",
    })),
    weaknesses: analysis.weaknesses.map((item) => ({
      ...item,
      whyItMatters: "Clear outcomes help reviewers assess impact.",
    })),
    achievements: [],
    activities: [],
    additionalInformation: [],
    evidenceQuality: {
      level: "mixed",
      summary: "The resume includes education and project evidence.",
      evidence: ["The Portfolio project lists React."],
    },
    ...overrides,
  };
}

function createMockClient(implementation) {
  return {
    chat: {
      completions: {
        create: implementation,
      },
    },
  };
}

test("normalizes a separate text copy conservatively", () => {
  const original = "Jane\u00a0Doe\r\n\u200BJavaScript   Developer\n\n\nReact";
  const normalized = normalizeResumeText(original);

  assert.equal(normalized, "Jane Doe\nJavaScript Developer\n\nReact");
  assert.equal(
    original,
    "Jane\u00a0Doe\r\n\u200BJavaScript   Developer\n\n\nReact",
  );
});

test("allows an empty required improvementSuggestions array", () => {
  const result = validateResumeAnalysis(
    createCompleteAnalysis({ improvementSuggestions: [] }),
  );

  assert.deepEqual(result.improvementSuggestions, []);
});

test("accepts a valid improvement suggestion", () => {
  const suggestion = {
    observation: "The project has no stated outcome.",
    evidence: "The Portfolio project explicitly lists React.",
    suggestion: "Add a genuine outcome if available.",
    rationale: "Outcomes help reviewers assess project impact.",
    expectedResult: "The project evidence will be more specific.",
    priority: "medium",
  };
  const result = validateResumeAnalysis(
    createCompleteAnalysis({ improvementSuggestions: [suggestion] }),
  );

  assert.deepEqual(result.improvementSuggestions, [suggestion]);
});

test("still requires the improvementSuggestions field", () => {
  const analysis = createCompleteAnalysis({ improvementSuggestions: [] });
  delete analysis.improvementSuggestions;

  assert.throws(
    () => validateResumeAnalysis(analysis),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "schema_validation" &&
      error.schemaPath === "/improvementSuggestions",
  );
});

test("rejects malformed improvement suggestion objects", () => {
  const malformed = {
    observation: "The project has no stated outcome.",
    evidence: "The Portfolio project explicitly lists React.",
    suggestion: "Add a genuine outcome if available.",
    rationale: "   ",
    expectedResult: "The project evidence will be more specific.",
    priority: "medium",
  };

  assert.throws(
    () => validateResumeAnalysis(
      createCompleteAnalysis({ improvementSuggestions: [malformed] }),
    ),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "semantic_validation" &&
      error.reasonCodes.includes("blank_suggestion"),
  );
});

test("validates the complete analysis and rejects incomplete or invalid shapes", () => {
  const valid = createValidAnalysis();
  const validated = validateResumeAnalysis(valid);
  assert.deepEqual(validated, valid);
  assert.notEqual(validated, valid);

  const extraProperty = structuredClone(valid);
  extraProperty.unexpected = "not allowed";
  assert.throws(
    () => validateResumeAnalysis(extraProperty),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "schema_validation" &&
      error.schemaPath === "/unexpected",
  );

  const missingField = structuredClone(valid);
  delete missingField.contact.email;
  assert.throws(
    () => validateResumeAnalysis(missingField),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "schema_validation" &&
      error.schemaPath === "/contact/email",
  );

  const wrongType = structuredClone(valid);
  wrongType.education[0].details = "not an array";
  assert.throws(
    () => validateResumeAnalysis(wrongType),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "schema_validation" &&
      error.schemaPath === "/education/0/details",
  );
});

test("requires non-empty evidence for strengths and weaknesses", () => {
  const invalid = createValidAnalysis();
  invalid.weaknesses[0].evidence = "   ";

  assert.throws(
    () => validateResumeAnalysis(invalid),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "semantic_validation" &&
      error.reasonCodes.includes("blank_evidence"),
  );
});

test("reports blank suggestions with a fixed semantic reason code", () => {
  const invalid = createValidAnalysis();
  invalid.improvementSuggestions[0].rationale = "   ";

  assert.throws(
    () => validateResumeAnalysis(invalid),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "semantic_validation" &&
      error.reasonCodes.includes("blank_suggestion"),
  );
});

test("removes entirely empty section entries from a copy of mocked AI output", async () => {
  const raw = createValidAnalysis();
  raw.education = [
    {
      institution: null,
      degree: "BCA",
      fieldOfStudy: null,
      location: null,
      startDate: null,
      endDate: null,
      details: [],
    },
    {
      institution: null,
      degree: null,
      fieldOfStudy: null,
      location: null,
      startDate: null,
      endDate: null,
      details: [],
    },
  ];
  raw.experience = [
    {
      employer: null,
      title: null,
      location: null,
      startDate: null,
      endDate: null,
      highlights: ["   "],
    },
  ];
  raw.projects.push({
    name: null,
    description: null,
    technologies: [],
    highlights: [],
    url: null,
  });
  raw.certifications = [
    { name: null, issuer: null, date: null, credentialId: null },
  ];
  const snapshot = structuredClone(raw);
  const analyzeResume = createResumeAnalyzer({
    provider: {
      name: "mock",
      model: "mock-model",
      analyze: async () => raw,
    },
  });

  const result = await analyzeResume("Education: BCA");

  assert.equal(result.analysis.education.length, 1);
  assert.equal(result.analysis.education[0].degree, "BCA");
  assert.equal(result.analysis.experience.length, 0);
  assert.equal(result.analysis.projects.length, 1);
  assert.equal(result.analysis.certifications.length, 0);
  assert.deepEqual(raw, snapshot);
  assert.notEqual(result.analysis, raw);
});

test("rejects mocked evidence-rich output with empty assessments instead of fabricating them", async () => {
  const raw = createValidAnalysis();
  raw.education = [
    {
      institution: null,
      degree: "BCA",
      fieldOfStudy: null,
      location: null,
      startDate: null,
      endDate: null,
      details: [],
    },
  ];
  raw.skills = ["Python", "SQL", "React"];
  raw.projects = [
    {
      name: "Student performance dashboard",
      description: "Dashboard built using Python and Pandas.",
      technologies: ["Python", "Pandas"],
      highlights: [],
      url: null,
    },
  ];
  raw.strengths = [];
  raw.weaknesses = [];
  raw.improvementSuggestions = [];
  const snapshot = structuredClone(raw);
  const analyzeResume = createResumeAnalyzer({
    provider: {
      name: "mock",
      model: "mock-model",
      analyze: async () => raw,
    },
  });

  await assert.rejects(
    () => analyzeResume("Education: BCA\nSkills: Python, SQL, React"),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "semantic_validation" &&
      error.reasonCodes.includes("missing_strengths") &&
      !error.reasonCodes.includes("missing_improvement_suggestions"),
  );
  assert.deepEqual(raw, snapshot);
});

test("accepts mocked evidence-rich output with grounded strengths and suggestions", async () => {
  const raw = createValidAnalysis();
  raw.skills = ["Python", "SQL", "React"];
  raw.projects = [
    {
      name: "Student performance dashboard",
      description: "Dashboard built using Python and Pandas.",
      technologies: ["Python", "Pandas"],
      highlights: [],
      url: null,
    },
  ];
  raw.strengths = [
    {
      point: "Demonstrates practical data-dashboard development.",
      evidence:
        "The Student performance dashboard uses Python and Pandas.",
    },
  ];
  raw.improvementSuggestions = [
    {
      suggestion: "Add the dashboard's outcome or impact.",
      rationale:
        "The project lists its technology but does not describe a measurable result.",
      priority: "high",
    },
  ];
  const analyzeResume = createResumeAnalyzer({
    provider: {
      name: "mock",
      model: "mock-model",
      analyze: async () => raw,
    },
  });

  const result = await analyzeResume("Skills and project evidence");

  assert.equal(result.analysis.strengths.length, 1);
  assert.equal(result.analysis.improvementSuggestions.length, 1);
});

test("allows empty assessments for genuinely information-poor mocked output", async () => {
  const raw = createValidAnalysis();
  raw.name = null;
  raw.contact = {
    email: null,
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  };
  raw.professionalSummary = null;
  raw.education = [];
  raw.experience = [];
  raw.projects = [];
  raw.skills = [];
  raw.certifications = [];
  raw.strengths = [];
  raw.weaknesses = [];
  raw.improvementSuggestions = [];
  raw.uncertainties = ["The supplied text contains no readable resume details."];
  const analyzeResume = createResumeAnalyzer({
    provider: {
      name: "mock",
      model: "mock-model",
      analyze: async () => raw,
    },
  });

  const result = await analyzeResume("Unreadable resume fragment");

  assert.deepEqual(result.analysis.strengths, []);
  assert.deepEqual(result.analysis.improvementSuggestions, []);
  assert.equal(result.analysis.uncertainties.length, 1);
});

test("analyzer sends only the normalized copy to its provider", async () => {
  let receivedText;
  const original = "Jane\u00a0Doe\r\nReact   Developer";
  const provider = {
    name: "mock",
    model: "mock-model",
    async analyze(text) {
      receivedText = text;
      return createValidAnalysis();
    },
  };
  const analyzeResume = createResumeAnalyzer({ provider });

  const result = await analyzeResume(original);

  assert.equal(receivedText, "Jane Doe\nReact Developer");
  assert.equal(original, "Jane\u00a0Doe\r\nReact   Developer");
  assert.equal(result.metadata.provider, "mock");
  assert.equal(result.metadata.model, "mock-model");
});

test("Groq provider requests strict structured output", async () => {
  let request;
  const client = createMockClient(async (value) => {
    request = value;
    return {
      choices: [
        { message: { content: JSON.stringify(createValidAnalysis()) } },
      ],
    };
  });
  const provider = createGroqProvider({
    client,
    apiKey: "test-placeholder-only",
    model: "test-model",
  });

  const result = await provider.analyze("Jane Doe resume text");

  assert.equal(result.name, "Jane Doe");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.response_format.json_schema.schema, resumeAnalysisSchema);
  assert.equal(request.model, "test-model");
  assert.match(
    request.messages[0].content,
    /Do not emit placeholder education, experience, project, or certification objects/,
  );
  assert.match(
    request.messages[0].content,
    /provide at least one evidence-based strength and at least one actionable improvement suggestion/,
  );
  assert.doesNotMatch(JSON.stringify(result), /test-placeholder-only/);
});

test("Groq provider rejects missing configuration, empty content, and invalid JSON", async () => {
  const unconfigured = createGroqProvider({ apiKey: "" });
  await assert.rejects(
    () => unconfigured.analyze("resume"),
    AiConfigurationError,
  );

  const invalidOutput = createGroqProvider({
    client: createMockClient(async () => ({
      choices: [{ message: { content: "not JSON" } }],
    })),
  });
  await assert.rejects(
    () => invalidOutput.analyze("resume"),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "provider_output" &&
      error.reasonCodes.includes("invalid_json"),
  );

  const emptyOutput = createGroqProvider({
    client: createMockClient(async () => ({
      choices: [{ message: { content: "   " } }],
    })),
  });
  await assert.rejects(
    () => emptyOutput.analyze("resume"),
    (error) =>
      error instanceof InvalidProviderOutputError &&
      error.diagnosticCategory === "provider_output" &&
      error.reasonCodes.includes("empty_content"),
  );
});

test("Groq provider maps rate limits, timeouts, and upstream failures", async () => {
  const cases = [
    [{ status: 429, message: "sensitive raw body" }, AiRateLimitError],
    [
      { name: "APIConnectionTimeoutError", message: "sensitive raw body" },
      AiTimeoutError,
    ],
    [{ status: 500, message: "sensitive raw body" }, AiProviderError],
  ];

  for (const [providerError, expectedError] of cases) {
    const provider = createGroqProvider({
      client: createMockClient(async () => {
        throw providerError;
      }),
    });

    if (expectedError === AiProviderError) {
      await assert.rejects(
        () => provider.analyze("resume"),
        (error) =>
          error instanceof AiProviderError &&
          error.diagnosticCategory === "provider_error" &&
          error.httpStatus === 500,
      );
    } else {
      await assert.rejects(() => provider.analyze("resume"), expectedError);
    }
  }
});

test("formats diagnostics from allowlisted metadata only", () => {
  const providerError = new AiProviderError({ httpStatus: 400 });
  providerError.message = "sensitive raw provider body";
  providerError.apiKey = "secret-value";

  const schemaError = new InvalidProviderOutputError({
    category: "schema_validation",
    schemaPath: "/education/0/degree",
  });
  schemaError.rejectedValue = "personal information";

  const semanticError = new InvalidProviderOutputError({
    category: "semantic_validation",
    reasonCodes: ["missing_strengths", "missing_improvement_suggestions"],
  });
  semanticError.message = "contact@example.com";

  const emptyContentError = new InvalidProviderOutputError({
    category: "provider_output",
    reasonCodes: ["empty_content"],
  });
  const invalidJsonError = new InvalidProviderOutputError({
    category: "provider_output",
    reasonCodes: ["invalid_json"],
  });

  const unsafeSchemaError = new InvalidProviderOutputError({
    category: "schema_validation",
    schemaPath: "/education/0/contact@example.com",
  });

  const diagnostics = [
    formatResumeAnalysisDiagnostic(providerError),
    formatResumeAnalysisDiagnostic(schemaError),
    formatResumeAnalysisDiagnostic(semanticError),
    formatResumeAnalysisDiagnostic(emptyContentError),
    formatResumeAnalysisDiagnostic(invalidJsonError),
    formatResumeAnalysisDiagnostic(unsafeSchemaError),
  ];

  assert.deepEqual(diagnostics, [
    "[resume-analysis] category=provider_error status=400",
    "[resume-analysis] category=schema_validation path=/education/0/degree",
    "[resume-analysis] category=semantic_validation reason=missing_strengths,missing_improvement_suggestions",
    "[resume-analysis] category=provider_output reason=empty_content",
    "[resume-analysis] category=provider_output reason=invalid_json",
    "[resume-analysis] category=schema_validation path=/education/0/unknown",
  ]);
  assert.doesNotMatch(
    diagnostics.join("\n"),
    /sensitive|secret-value|personal information|contact@example\.com/,
  );
});

test("Groq provider captures only allowlisted upstream classification fields", async () => {
  const sensitive = {
    message: "sensitive raw provider body",
    failed_generation: "personal information contact@example.com",
    param: "secret-value",
  };
  const cases = [
    [
      { status: 400, error: { error: { type: "invalid_request_error", code: "json_schema_invalid", ...sensitive } } },
      "invalid_request_error",
      "json_schema_invalid",
    ],
    [
      { status: 400, error: { type: "invalid_request_error", code: "json_validate_failed", ...sensitive } },
      "invalid_request_error",
      "json_validate_failed",
    ],
    [
      { status: 400, error: { error: { type: "contact@example.com", code: "a b c", ...sensitive } } },
      "redacted",
      "redacted",
    ],
    [
      { status: 400, error: { error: { type: { nested: "secret-value" }, code: "x".repeat(65) } } },
      "redacted",
      "redacted",
    ],
    [{ status: 400, message: "sensitive raw provider body" }, undefined, undefined],
  ];

  for (const [providerError, expectedType, expectedCode] of cases) {
    const provider = createGroqProvider({
      client: createMockClient(async () => {
        throw providerError;
      }),
    });

    await assert.rejects(
      () => provider.analyze("resume"),
      (error) => {
        assert.ok(error instanceof AiProviderError);
        assert.equal(error.httpStatus, 400);
        assert.equal(error.upstreamType, expectedType);
        assert.equal(error.upstreamCode, expectedCode);
        assert.doesNotMatch(
          JSON.stringify(error) + String(error.message),
          /sensitive|secret-value|personal information|contact@example\.com/,
        );
        return true;
      },
    );
  }
});

test("formats provider diagnostics with safe upstream type and code", () => {
  const withCodes = new AiProviderError({
    httpStatus: 400,
    upstreamType: "invalid_request_error",
    upstreamCode: "json_schema_invalid",
  });
  withCodes.message = "sensitive raw provider body";

  const unsafe = new AiProviderError({
    httpStatus: 400,
    upstreamType: "contact@example.com",
    upstreamCode: "secret value with spaces",
  });

  const typeOnly = new AiProviderError({
    httpStatus: 400,
    upstreamType: "invalid_request_error",
  });

  const diagnostics = [
    formatResumeAnalysisDiagnostic(withCodes),
    formatResumeAnalysisDiagnostic(unsafe),
    formatResumeAnalysisDiagnostic(typeOnly),
  ];

  assert.deepEqual(diagnostics, [
    "[resume-analysis] category=provider_error status=400 type=invalid_request_error code=json_schema_invalid",
    "[resume-analysis] category=provider_error status=400 type=redacted code=redacted",
    "[resume-analysis] category=provider_error status=400 type=invalid_request_error",
  ]);
  assert.doesNotMatch(
    diagnostics.join("\n"),
    /sensitive|secret|contact@example\.com/,
  );
});

test("environment example contains placeholders and no Groq key", () => {
  const example = fs.readFileSync(
    path.join(__dirname, "..", ".env.example"),
    "utf8",
  );
  const gitignore = fs.readFileSync(
    path.join(__dirname, "..", ".gitignore"),
    "utf8",
  );

  assert.match(example, /GROQ_API_KEY=replace_with_your_local_groq_api_key/);
  assert.doesNotMatch(example, /gsk_[A-Za-z0-9_-]+/);
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});

let routeServer;
let routeBaseUrl;

before(async () => {
  const app = express();
  app.use(express.json({ limit: "128kb" }));
  app.use(
    "/api/resumes",
    createResumeAnalysisRouter({
      analyzeResume: async (text) => ({
        analysis: createValidAnalysis(),
        metadata: { provider: "mock", model: `mock-${text.length}` },
      }),
    }),
  );

  await new Promise((resolve) => {
    routeServer = app.listen(0, "127.0.0.1", resolve);
  });
  routeBaseUrl = `http://127.0.0.1:${routeServer.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    routeServer.close((error) => (error ? reject(error) : resolve()));
  });
});

async function postAnalysis(body) {
  return fetch(`${routeBaseUrl}/api/resumes/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("analysis route returns a structured mocked result", async () => {
  const response = await postAnalysis({ text: "Jane Doe resume" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.analysis.name, "Jane Doe");
  assert.equal(body.metadata.provider, "mock");
});

test("analysis route rejects missing, blank, and oversized text", async () => {
  for (const body of [{}, { text: "   " }, { text: 42 }]) {
    const response = await postAnalysis(body);
    assert.equal(response.status, 400);
  }

  const oversized = await postAnalysis({
    text: "x".repeat(MAX_RESUME_TEXT_CHARACTERS + 1),
  });
  assert.equal(oversized.status, 413);
});

test("analysis route maps provider errors without exposing their details", async () => {
  const cases = [
    [new AiConfigurationError("secret"), 503],
    [new AiRateLimitError("sensitive raw body"), 429],
    [new AiTimeoutError("sensitive raw body"), 504],
    [new InvalidProviderOutputError("contact@example.com"), 502],
    [new AiProviderError("sensitive raw body"), 502],
  ];

  for (const [error, status] of cases) {
    const diagnosticMessages = [];
    const app = express();
    app.use(express.json());
    app.use(
      "/api/resumes",
      createResumeAnalysisRouter({
        analyzeResume: async () => {
          throw error;
        },
        logger: {
          warn(message) {
            diagnosticMessages.push(message);
          },
        },
      }),
    );
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/resumes/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "resume" }),
        },
      );
      const responseText = await response.text();

      assert.equal(response.status, status);
      assert.doesNotMatch(responseText, /secret|sensitive|contact@example\.com/);
      assert.doesNotMatch(
        diagnosticMessages.join("\n"),
        /secret|sensitive|contact@example\.com/,
      );

      if (status === 502) {
        assert.equal(diagnosticMessages.length, 1);
      } else {
        assert.equal(diagnosticMessages.length, 0);
      }
    } finally {
      await new Promise((resolve, reject) => {
        server.close((closeError) =>
          closeError ? reject(closeError) : resolve(),
        );
      });
    }
  }
});
