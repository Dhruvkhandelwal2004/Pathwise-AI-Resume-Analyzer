const {
  CAREER_ROLES,
  CATALOGUE_VERSION,
  LEGACY_ROLE_IDS,
  ROLE_IDS,
  validateCareerRoleConfig,
} = require("../config/careerRoles");
const { getCareerProfile } = require("./careerCatalog");
const { validateResumeAnalysis } = require("./resumeAnalysis");

const CATEGORY_ORDER = [
  "coreSkills",
  "supportingSkills",
  "projectEvidence",
  "experienceEvidence",
  "educationCertifications",
];

const CATEGORY_LABELS = {
  coreSkills: "Core skills",
  supportingSkills: "Supporting skills",
  projectEvidence: "Project evidence",
  experienceEvidence: "Experience evidence",
  educationCertifications: "Education and certifications",
};

const SCORE_DISCLAIMER =
  "Scores measure evidence found in this resume against configured role criteria. They do not measure objective ability, predict hiring decisions, or guarantee career suitability.";
const MISSING_SKILL_NOTE =
  "Not found in this resume; this does not mean the candidate does not possess this skill.";

class CareerMatchingInputError extends Error {}

function normalizeForMatch(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEvidenceText(value) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= 180 ? compact : `${compact.slice(0, 177)}...`;
}

function extractCareerEvidence(analysis) {
  const evidence = [];
  const seen = new Set();

  function add(source, value, reference) {
    if (typeof value !== "string" || !value.trim()) {
      return;
    }

    const normalized = normalizeForMatch(value);
    if (!normalized) {
      return;
    }

    const key = `${source}\u0000${normalized}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    evidence.push({ source, reference, text: toEvidenceText(value), normalized });
  }

  analysis.skills.forEach((value, index) => add("skills", value, `Skills section · item ${index + 1}`));

  analysis.projects.forEach((project, projectIndex) => {
    const projectLabel = project.name?.trim() || `Project ${projectIndex + 1}`;
    add("projects.name", project.name, `Projects · ${projectLabel} · name`);
    add("projects.description", project.description, `Projects · ${projectLabel} · description`);
    project.technologies.forEach((value, index) => add("projects.technologies", value, `Projects · ${projectLabel} · technology ${index + 1}`));
    project.highlights.forEach((value, index) => add("projects.highlights", value, `Projects · ${projectLabel} · highlight ${index + 1}`));
  });

  analysis.experience.forEach((experience, experienceIndex) => {
    const experienceLabel = experience.title?.trim() || `Experience ${experienceIndex + 1}`;
    add("experience.title", experience.title, `Experience · ${experienceLabel} · title`);
    experience.highlights.forEach((value, index) => add("experience.highlights", value, `Experience · ${experienceLabel} · highlight ${index + 1}`));
  });

  analysis.education.forEach((education, educationIndex) => {
    const educationLabel = education.degree?.trim() || `Education ${educationIndex + 1}`;
    add("education.degree", education.degree, `Education · ${educationLabel} · degree`);
    add("education.fieldOfStudy", education.fieldOfStudy, `Education · ${educationLabel} · field of study`);
    education.details.forEach((value, index) => add("education.details", value, `Education · ${educationLabel} · detail ${index + 1}`));
  });

  analysis.certifications.forEach((certification, certificationIndex) => {
    const certificationLabel = certification.name?.trim() || `Certification ${certificationIndex + 1}`;
    add("certifications.name", certification.name, `Certifications · ${certificationLabel} · name`);
    add("certifications.issuer", certification.issuer, `Certifications · ${certificationLabel} · issuer`);
  });

  return evidence;
}

function containsAlias(normalizedText, alias) {
  const normalizedAlias = normalizeForMatch(alias);
  if (!normalizedAlias) {
    return false;
  }

  return ` ${normalizedText} `.includes(` ${normalizedAlias} `);
}

function matchCriterion(item, evidence) {
  const allowedSources = new Set(item.sources);
  const matches = [];

  for (const record of evidence) {
    if (
      allowedSources.has(record.source) &&
      item.aliases.some((alias) => containsAlias(record.normalized, alias))
    ) {
      matches.push({ source: record.source, reference: record.reference, text: record.text });
    }
  }

  return matches.slice(0, 3);
}

function matchPartialCriterion(item, evidence) {
  const fullSources = new Set(item.sources);
  return evidence
    .filter(
      (record) =>
        !fullSources.has(record.source) &&
        item.aliases.some((alias) => containsAlias(record.normalized, alias)),
    )
    .slice(0, 3)
    .map(({ source, reference, text }) => ({ source, reference, text }));
}

function createCategoryBreakdown(role, matchedIds) {
  return CATEGORY_ORDER.map((category) => {
    const criteria = role.criteria.filter((item) => item.category === category);
    const possible = criteria.reduce((sum, item) => sum + item.weight, 0);
    const earned = criteria
      .filter((item) => matchedIds.has(item.id))
      .reduce((sum, item) => sum + item.weight, 0);

    return {
      category,
      label: CATEGORY_LABELS[category],
      earned,
      possible,
    };
  });
}

function scoreRole(role, evidence, configOrder) {
  const matchedCriteria = [];
  const unmatchedCriteria = [];
  const partiallyDemonstratedCriteria = [];
  const matchedIds = new Set();

  for (const item of role.criteria) {
    const matches = matchCriterion(item, evidence);

    if (matches.length > 0) {
      matchedIds.add(item.id);
      matchedCriteria.push({
        criterionId: item.id,
        label: item.label,
        category: item.category,
        points: item.weight,
        evidence: matches,
      });
    } else {
      const partialEvidence = matchPartialCriterion(item, evidence);
      if (partialEvidence.length > 0) {
        partiallyDemonstratedCriteria.push({
          criterionId: item.id,
          label: item.label,
          category: item.category,
          pointsAvailable: item.weight,
          evidence: partialEvidence,
          note: "Related evidence was found, but not in the resume section required for this criterion.",
        });
      }
      unmatchedCriteria.push({
        criterionId: item.id,
        label: item.label,
        category: item.category,
        pointsAvailable: item.weight,
        note: "Not found in this resume.",
      });
    }
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      matchedCriteria.reduce((sum, item) => sum + item.points, 0),
    ),
  );
  const categoryBreakdown = createCategoryBreakdown(role, matchedIds);
  const skillCriteria = role.criteria.filter((item) => item.kind === "skill");
  const foundSkills = skillCriteria
    .filter((item) => matchedIds.has(item.id))
    .map((item) => {
      const matched = matchedCriteria.find(
        (criterionResult) => criterionResult.criterionId === item.id,
      );
      return {
        criterionId: item.id,
        skill: item.label,
        points: item.weight,
        evidence: matched.evidence,
      };
    });
  const skillsNotFoundInResume = skillCriteria
    .filter((item) => !matchedIds.has(item.id))
    .map((item) => ({
      criterionId: item.id,
      skill: item.label,
      pointsAvailable: item.weight,
      note: MISSING_SKILL_NOTE,
    }));
  const explanation = categoryBreakdown.map((category) => {
    const labels = matchedCriteria
      .filter((item) => item.category === category.category)
      .map((item) => item.label);
    return labels.length > 0
      ? `${category.label}: ${category.earned}/${category.possible} points from ${labels.join(", ")}.`
      : `${category.label}: 0/${category.possible} points because no configured evidence was found in this resume.`;
  });

  return {
    roleId: role.id,
    role: role.name,
    profileVersion: role.profileVersion,
    score,
    categoryBreakdown,
    foundSkills,
    skillsNotFoundInResume,
    matchedCriteria,
    partiallyDemonstratedCriteria,
    unmatchedCriteria,
    explanation,
    configOrder,
  };
}

function createImprovementOpportunities(roleMatch) {
  const partialIds = new Set(
    roleMatch.partiallyDemonstratedCriteria.map((item) => item.criterionId),
  );
  return roleMatch.unmatchedCriteria
    .map((item, index) => ({
      criterionId: item.criterionId,
      requirement: item.label,
      category: item.category,
      status: partialIds.has(item.criterionId) ? "partially-demonstrated" : "not-found",
      pointsAvailable: item.pointsAvailable,
      priority:
        item.pointsAvailable >= 10
          ? "high"
          : item.pointsAvailable >= 5
            ? "medium"
            : "low",
      action: partialIds.has(item.criterionId)
        ? `Add direct ${CATEGORY_LABELS[item.category].toLowerCase()} evidence for ${item.label}.`
        : `Add genuine resume evidence for ${item.label} if it reflects your actual background.`,
      note: MISSING_SKILL_NOTE,
      configOrder: index,
    }))
    .sort(
      (left, right) =>
        right.pointsAvailable - left.pointsAvailable ||
        left.configOrder - right.configOrder,
    )
    .map(({ configOrder, ...item }) => item);
}

const STUDENT_ASSESSMENTS = new Set([
  "not-started",
  "learning",
  "practiced",
  "can-demonstrate",
]);

function getEvidenceDepth(evidence) {
  if (evidence.some((item) => ["projects.description", "projects.highlights", "experience.highlights"].includes(item.source))) {
    return "applied";
  }
  if (evidence.some((item) => item.source !== "skills")) {
    return "contextual";
  }
  return "listed";
}

function getVerifiableResources(criterion, role) {
  const aliasesText = [criterion.label, ...(criterion.aliases ?? [])].join(" ").toLowerCase();
  const resources = [];

  if (/\bsql\b|\bpostgres|\bmysql|\bdatabase/.test(aliasesText)) {
    resources.push(
      { title: "PostgreSQL Official Tutorial & SQL Syntax", provider: "PostgreSQL Global Development Group", url: "https://www.postgresql.org/docs/current/tutorial.html" },
      { title: "SQLBolt Interactive SQL Exercises", provider: "SQLBolt", url: "https://sqlbolt.com/" },
    );
  }
  if (/\bpython\b|\bpandas\b|\bnumpy\b/.test(aliasesText)) {
    resources.push(
      { title: "The Python Official Tutorial", provider: "Python Software Foundation", url: "https://docs.python.org/3/tutorial/" },
      { title: "Pandas User Guide — 10 Minutes to pandas", provider: "PyData / NumFOCUS", url: "https://pandas.pydata.org/docs/user_guide/10min.html" },
    );
  }
  if (/\bjavascript\b|\btypescript\b|\bhtml\b|\bcss\b|\brest\b/.test(aliasesText)) {
    resources.push(
      { title: "MDN Web Docs — JavaScript & Web APIs", provider: "Mozilla Developer Network", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
    );
  }
  if (/\breact\b|\bfrontend\b|\bweb framework/.test(aliasesText)) {
    resources.push(
      { title: "React Official Reference & Learn React", provider: "React / Meta Open Source", url: "https://react.dev/learn" },
    );
  }
  if (/\bjava\b|\bspring\b|\bhibernate\b|\bjpa\b|\bmaven\b/.test(aliasesText)) {
    resources.push(
      { title: "Dev.Java Official Learning Tutorials", provider: "Oracle Java Platform", url: "https://dev.java/learn/" },
      { title: "Spring Boot Official Guides", provider: "VMware / Spring", url: "https://spring.io/guides" },
    );
  }
  if (/\bllm\b|\bprompt\b|\brag\b|\blangchain\b|\bai\b|\bmachine learning\b/.test(aliasesText)) {
    resources.push(
      { title: "OpenAI Prompt Engineering & Structured Outputs Guide", provider: "OpenAI Platform Docs", url: "https://platform.openai.com/docs/guides/prompt-engineering" },
      { title: "Scikit-learn Official User Guide", provider: "scikit-learn developers", url: "https://scikit-learn.org/stable/user_guide.html" },
    );
  }
  if (/\bgit\b|\bdocker\b|\bkubernetes\b|\bci\b|\blinux\b/.test(aliasesText)) {
    resources.push(
      { title: "Pro Git Book (Official Git Documentation)", provider: "Git SCM", url: "https://git-scm.com/book/en/v2" },
      { title: "Docker Get Started Guide", provider: "Docker Docs", url: "https://docs.docker.com/get-started/" },
    );
  }
  if (/\bsecurity\b|\bowasp\b|\bnetwork\b/.test(aliasesText)) {
    resources.push(
      { title: "OWASP Top 10 & Cheat Sheet Series", provider: "OWASP Foundation", url: "https://cheatsheetseries.owasp.org/" },
    );
  }

  if (resources.length === 0) {
    resources.push({
      title: `Official ${criterion.label} Documentation & Reference`,
      provider: `${role.title} Core Curriculum`,
      url: null,
    });
  }

  return resources.slice(0, 3);
}

function createLearningGuidance(role, criterion) {
  const subject = criterion.label;
  const examples = (criterion.aliases ?? []).slice(0, 3).join(", ");
  const commonCompletion = [
    `Complete the task using ${subject} rather than only naming it.`,
    "Keep a reviewable artifact such as code, analysis, documentation, or a verified result.",
    "Explain the objective, your own contribution, the approach used, and what you verified.",
    "Do not add metrics or outcomes unless you have genuine supporting evidence.",
  ];
  const resumeGuidance = `After genuine completion, add a concise evidence statement naming the objective, ${subject}, your contribution, and a verifiable result without inventing metrics.`;

  const guidanceByKind = {
    skill: {
      learningObjective: `Apply ${subject} in a small, reviewable task relevant to ${role.title}.`,
      recommendedPracticeTask: `Complete one scoped exercise that requires you to use ${subject}, document your decisions, and check the output.`,
      suggestedDeliverable: `A version-controlled ${role.title} mini-project or case study demonstrating ${subject}.`,
      suggestedSection: "Projects, experience, or relevant coursework",
      actionPoints: [
        `Review core concepts and syntax for ${subject} (${examples || subject}).`,
        `Set up a clean local workspace and implement a focused ${role.title} workflow using ${subject}.`,
        `Write verification checks or test cases to confirm your ${subject} implementation handles edge cases.`,
        `Document the problem statement, your implementation choices, and verified output in a concise README.`,
      ],
      practiceExercises: [
        `Build a standalone script or module exercising ${subject} fundamentals on sample data.`,
        `Refactor an existing ${role.title} task to incorporate ${subject} with clear error handling and validation.`,
      ],
    },
    project: {
      learningObjective: `Produce direct project evidence for ${subject} in the context of ${role.title}.`,
      recommendedPracticeTask: "Improve a genuine existing project or create a small scoped project with a clear objective, implementation, and review step.",
      suggestedDeliverable: `A documented ${role.title} project with an artifact, README, and clearly stated personal contribution.`,
      suggestedSection: "Projects",
      actionPoints: [
        `Define a concrete ${role.title} problem statement and target user workflow for ${subject}.`,
        `Implement the core functionality using approved ${role.title} tools (${examples || subject}).`,
        `Record your specific individual contributions, architecture decisions, and verification results.`,
        `Publish the repository or artifact with reproducible setup instructions.`,
      ],
      practiceExercises: [
        `Create a scoped end-to-end prototype demonstrating ${subject} with real sample inputs.`,
        `Add automated validation or an evaluation report to verify the project's output quality.`,
      ],
    },
    experience: {
      learningObjective: `Demonstrate the responsibilities represented by ${subject} through genuine practical work.`,
      recommendedPracticeTask: "Complete a realistic simulation, coursework task, volunteer contribution, open-source contribution, or employment task and document exactly what you did.",
      suggestedDeliverable: `A short case study or work sample showing ${subject}; professional employment is not required for the practice task.`,
      suggestedSection: "Experience, projects, activities, or relevant coursework",
      actionPoints: [
        `Identify an internship, lab, open-source issue, or applied project where you can perform ${subject}.`,
        `Execute the workflow end-to-end (${examples || subject}) and keep records of what you built or analyzed.`,
        `Summarize the scope, tools used, and verified outcome in 2–3 evidence-backed bullet points.`,
      ],
      practiceExercises: [
        `Complete a realistic ${role.title} work simulation covering ${subject} responsibilities.`,
        `Conduct a peer or self-review checklist verifying the completed work artifact.`,
      ],
    },
    education: {
      learningObjective: `Identify and document genuinely completed learning relevant to ${subject}.`,
      recommendedPracticeTask: "Review completed coursework or structured learning and prepare a concise description of the relevant topics and assessed work.",
      suggestedDeliverable: "A verified coursework summary, assessed assignment, or learning portfolio entry.",
      suggestedSection: "Education or relevant coursework",
      actionPoints: [
        `Audit your completed academic modules or structured coursework related to ${subject}.`,
        `List the exact degree, field of study, dates, and relevant assessed modules in your Education section.`,
        `Link a capstone assignment or lab exercise that applied ${subject}.`,
      ],
      practiceExercises: [
        `Compile a concise syllabus and lab summary for your coursework in ${subject}.`,
      ],
    },
    certification: {
      learningObjective: `Understand the knowledge areas represented by ${subject} and verify any credential before listing it.`,
      recommendedPracticeTask: "Review the official objectives and complete an appropriate practice assessment; list a credential only after genuine completion.",
      suggestedDeliverable: "Study notes and, only if earned, a verifiable credential record with issuer and completion date.",
      suggestedSection: "Certifications",
      actionPoints: [
        `Review the official exam syllabus or competency rubric for ${subject}.`,
        `Complete hands-on labs covering each assessed domain before attempting the credential.`,
        `If already earned, add the exact credential title, issuing organization, and date to your resume.`,
      ],
      practiceExercises: [
        `Complete a timed practice assessment covering the core objectives of ${subject}.`,
      ],
    },
  };

  const guidance = guidanceByKind[criterion.kind] ?? guidanceByKind.skill;
  return {
    ...guidance,
    verifiableResources: getVerifiableResources(criterion, role),
    completionCriteria: commonCompletion,
    resumeEvidenceAfterCompletion: {
      suggestedSection: guidance.suggestedSection,
      guidance: resumeGuidance,
    },
  };
}

function normalizeStudentEvidence(studentEvidence, role, gapIds) {
  if (studentEvidence === undefined) return new Map();
  if (!Array.isArray(studentEvidence) || studentEvidence.length > 25) {
    throw new CareerMatchingInputError("Invalid student-provided evidence.");
  }

  const roleCriterionIds = new Set(role.criteria.map((item) => item.id));
  const normalized = new Map();
  const allowedFields = new Set(["criterionId", "selfAssessment", "additionalEvidence"]);

  for (const entry of studentEvidence) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new CareerMatchingInputError("Invalid student-provided evidence.");
    }
    if (Object.keys(entry).some((field) => !allowedFields.has(field))) {
      throw new CareerMatchingInputError("Unsupported student-provided evidence field.");
    }
    if (
      typeof entry.criterionId !== "string" ||
      !roleCriterionIds.has(entry.criterionId) ||
      !gapIds.has(entry.criterionId) ||
      normalized.has(entry.criterionId)
    ) {
      throw new CareerMatchingInputError("Invalid student-provided criterion.");
    }
    if (entry.selfAssessment !== undefined && !STUDENT_ASSESSMENTS.has(entry.selfAssessment)) {
      throw new CareerMatchingInputError("Invalid self-assessment value.");
    }
    if (
      entry.additionalEvidence !== undefined &&
      (typeof entry.additionalEvidence !== "string" || entry.additionalEvidence.trim().length > 500)
    ) {
      throw new CareerMatchingInputError("Invalid additional evidence.");
    }
    const additionalEvidence = entry.additionalEvidence?.trim() ?? "";
    if (entry.selfAssessment === undefined && !additionalEvidence) {
      throw new CareerMatchingInputError("Student-provided evidence must not be empty.");
    }
    normalized.set(entry.criterionId, {
      selfAssessment: entry.selfAssessment ?? null,
      additionalEvidence: additionalEvidence || null,
      label: "Student-provided; not verified from the resume and not used in scoring.",
    });
  }

  return normalized;
}

function orderGapCriteria(gaps) {
  const remaining = new Map(gaps.map((gap) => [gap.criterionId, gap]));
  const ordered = [];
  const compare = (left, right) =>
    right.weight - left.weight ||
    (left.status === "partially-demonstrated" ? -1 : 1) -
      (right.status === "partially-demonstrated" ? -1 : 1) ||
    left.configOrder - right.configOrder ||
    left.criterionId.localeCompare(right.criterionId);

  while (remaining.size > 0) {
    const available = [...remaining.values()]
      .filter((gap) => !gap.unmetPrerequisiteCriterionIds.some((id) => remaining.has(id)))
      .sort(compare);
    if (available.length === 0) {
      throw new Error("Validated role prerequisites could not be ordered.");
    }
    const next = available[0];
    ordered.push(next);
    remaining.delete(next.criterionId);
  }

  return ordered;
}

function createDetailedGapReport(role, roleMatch, studentEvidence) {
  const partialById = new Map(
    roleMatch.partiallyDemonstratedCriteria.map((item) => [item.criterionId, item]),
  );
  const matchedIds = new Set(roleMatch.matchedCriteria.map((item) => item.criterionId));
  const gapIds = new Set(roleMatch.unmatchedCriteria.map((item) => item.criterionId));
  const studentEvidenceById = normalizeStudentEvidence(studentEvidence, role, gapIds);

  const demonstratedCriteria = roleMatch.matchedCriteria.map((match) => ({
    criterionId: match.criterionId,
    requirement: match.label,
    category: match.category,
    kind: role.criteria.find((item) => item.id === match.criterionId).kind,
    weight: match.points,
    evidenceDepth: getEvidenceDepth(match.evidence),
    resumeEvidence: match.evidence,
    explanation: getEvidenceDepth(match.evidence) === "listed"
      ? "This requirement is listed in the resume, but a keyword alone does not prove proficiency."
      : "The resume contains direct evidence in a configured source; this describes documentation depth, not verified proficiency.",
  }));

  const unorderedGaps = roleMatch.unmatchedCriteria.map((unmatched, configOrder) => {
    const criterion = role.criteria.find((item) => item.id === unmatched.criterionId);
    const partial = partialById.get(unmatched.criterionId);
    const status = partial ? "partially-demonstrated" : "not-found-in-resume";
    const unmetPrerequisiteCriterionIds = criterion.prerequisiteCriterionIds.filter(
      (criterionId) => !matchedIds.has(criterionId),
    );
    return {
      criterionId: criterion.id,
      requirement: criterion.label,
      category: criterion.category,
      kind: criterion.kind,
      status,
      weight: criterion.weight,
      currentResumeEvidence: partial?.evidence ?? [],
      gapDescription: partial
        ? "Related evidence appears elsewhere in the resume, but direct evidence was not found in the configured section for this criterion."
        : MISSING_SKILL_NOTE,
      prerequisiteCriterionIds: [...criterion.prerequisiteCriterionIds],
      unmetPrerequisiteCriterionIds,
      whyItMatters: `${criterion.label} contributes ${criterion.weight}/100 points to the configured ${role.title} evidence rubric. It is a resume-evidence requirement, not proof of ability.`,
      ...createLearningGuidance(role, criterion),
      roadmapTaskId: `role-gap-${role.id}-${criterion.id}`,
      studentProvided: studentEvidenceById.get(criterion.id) ?? null,
      configOrder,
    };
  });

  const orderedGaps = orderGapCriteria(unorderedGaps).map((gap, index) => {
    const prerequisiteExplanation = gap.unmetPrerequisiteCriterionIds.length > 0
      ? ` Unmet configured prerequisites are scheduled first: ${gap.unmetPrerequisiteCriterionIds.join(", ")}.`
      : " No unmet configured prerequisite changes its position.";
    const startWeek = index * 2 + 1;
    const endWeek = startWeek + 1;
    const level = gap.weight >= 10 ? "high" : gap.weight >= 5 ? "medium" : "low";
    return {
      ...gap,
      estimatedEffort: {
        phaseWindow: `Week ${startWeek}-${endWeek}`,
        hoursRange: gap.weight >= 10 ? "10–14 hrs" : gap.weight >= 5 ? "6–10 hrs" : "4–6 hrs",
        justification: `Estimated from the ${gap.weight}-point role weight and ${gap.kind} deliverable scope.`,
      },
      priority: {
        rank: index + 1,
        level,
        explanation: `${gap.weight}-point role weight; ${gap.status === "partially-demonstrated" ? "related evidence makes this an evidence-strengthening opportunity" : "no configured resume evidence was found"}.${prerequisiteExplanation}`,
        prerequisiteCriterionIds: gap.prerequisiteCriterionIds,
        unmetPrerequisiteCriterionIds: gap.unmetPrerequisiteCriterionIds,
      },
    };
  }).map(({ configOrder, prerequisiteCriterionIds, unmetPrerequisiteCriterionIds, suggestedSection, ...gap }) => gap);

  return {
    reportVersion: "1.0.0",
    priorityMethod: {
      description: "Configured prerequisites are ordered before dependent gaps, followed by criterion weight, partial-evidence quick wins, configuration order, and criterion ID.",
      rules: [
        "Unmet configured prerequisites appear before dependent criteria.",
        "Higher-weight criteria appear first when prerequisite ordering allows it.",
        "Equal-weight partial evidence appears before not-found evidence.",
        "Configuration order and criterion ID provide stable tie-breaking.",
      ],
    },
    demonstratedCriteria,
    gaps: orderedGaps,
    note: MISSING_SKILL_NOTE,
  };
}

function getEvidenceLevel(evidenceCount) {
  if (evidenceCount === 0) {
    return "insufficient";
  }
  if (evidenceCount < 3) {
    return "limited";
  }
  return "sufficient";
}

function createTargetRoleGap(role, roleMatch, selection, studentEvidence) {
  const priorityGaps = roleMatch.skillsNotFoundInResume
    .map((item, index) => ({ ...item, configOrder: index }))
    .sort(
      (left, right) =>
        right.pointsAvailable - left.pointsAvailable ||
        left.configOrder - right.configOrder,
    )
    .map(({ configOrder, ...item }) => item);

  return {
    roleId: roleMatch.roleId,
    role: roleMatch.role,
    score: roleMatch.score,
    profileVersion: roleMatch.profileVersion,
    selection,
    foundSkills: roleMatch.foundSkills,
    skillsNotFoundInResume: roleMatch.skillsNotFoundInResume,
    priorityGaps,
    partiallyDemonstratedCriteria: roleMatch.partiallyDemonstratedCriteria,
    improvementOpportunities: createImprovementOpportunities(roleMatch),
    ...createDetailedGapReport(role, roleMatch, studentEvidence),
    note: MISSING_SKILL_NOTE,
  };
}

function scoreCareerMatches(analysis, targetRoleId, studentEvidence) {
  if (targetRoleId !== undefined && !ROLE_IDS.includes(targetRoleId)) {
    throw new CareerMatchingInputError("Unknown target role.");
  }

  let validatedAnalysis;
  try {
    validatedAnalysis = validateResumeAnalysis(analysis);
  } catch {
    throw new CareerMatchingInputError("Invalid resume analysis.");
  }

  const evidence = extractCareerEvidence(validatedAnalysis);
  const legacyRoles = LEGACY_ROLE_IDS.map((roleId) =>
    CAREER_ROLES.find((role) => role.id === roleId),
  );
  const roleMatches = legacyRoles.map((role, index) =>
    scoreRole(role, evidence, index),
  )
    .sort(
      (left, right) =>
        right.score - left.score || left.configOrder - right.configOrder,
    )
    .map(({ configOrder, ...match }) => match);
  const selectedProfile = targetRoleId
    ? CAREER_ROLES.find((role) => role.id === targetRoleId)
    : CAREER_ROLES.find((role) => role.id === roleMatches[0].roleId);
  const selectedTarget =
    roleMatches.find((match) => match.roleId === selectedProfile.id) ??
    (() => {
      const { configOrder, ...match } = scoreRole(
        selectedProfile,
        evidence,
        CAREER_ROLES.indexOf(selectedProfile),
      );
      return match;
    })();
  const evidenceLevel = getEvidenceLevel(evidence.length);
  const warnings = [];

  if (evidenceLevel === "insufficient") {
    warnings.push(
      "No scorable career evidence was found in this resume; all scores are 0.",
    );
  } else if (evidenceLevel === "limited") {
    warnings.push(
      "Only limited career evidence was found; interpret these scores cautiously.",
    );
  }

  return {
    catalogueVersion: CATALOGUE_VERSION,
    evidenceLevel,
    disclaimer: SCORE_DISCLAIMER,
    warnings,
    strongestMatches: roleMatches.slice(0, 3).map((match) => ({
      roleId: match.roleId,
      role: match.role,
      score: match.score,
    })),
    roleMatches,
    selectedProfile: getCareerProfile(selectedProfile.id),
    selectedRoleMatch: selectedTarget,
    partiallyDemonstratedCriteria:
      selectedTarget.partiallyDemonstratedCriteria,
    improvementOpportunities:
      createImprovementOpportunities(selectedTarget),
    targetRoleGap: createTargetRoleGap(
      selectedProfile,
      selectedTarget,
      targetRoleId ? "requested" : "top-match",
      studentEvidence,
    ),
  };
}

module.exports = {
  CareerMatchingInputError,
  MISSING_SKILL_NOTE,
  SCORE_DISCLAIMER,
  extractCareerEvidence,
  normalizeForMatch,
  createImprovementOpportunities,
  createTargetRoleGap,
  scoreCareerMatches,
  validateCareerRoleConfig,
};
