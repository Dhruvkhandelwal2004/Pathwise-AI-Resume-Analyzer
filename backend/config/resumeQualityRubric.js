const RESUME_QUALITY_RUBRIC = {
  version: "1.0.0",
  criteria: [
    {
      id: "skills",
      label: "Skills clarity and evidence",
      weight: 20,
      rules: [
        { id: "explicit-skills", label: "Explicit skills", points: 4 },
        { id: "organized-skills", label: "Organized skill profile", points: 4 },
        { id: "supported-skills", label: "Skills supported by application evidence", points: 8 },
        { id: "clear-skill-labels", label: "Clear, non-duplicated skill labels", points: 4 },
      ],
    },
    {
      id: "projects",
      label: "Projects and portfolio evidence",
      weight: 25,
      rules: [
        { id: "project-names", label: "Named projects", points: 3 },
        { id: "project-objectives", label: "Objectives or problem descriptions", points: 6 },
        { id: "project-technologies", label: "Technologies used", points: 4 },
        { id: "project-contributions", label: "Personal contributions", points: 6 },
        { id: "project-outcomes", label: "Documented outcomes", points: 4 },
        { id: "project-support", label: "Supporting implementation evidence", points: 2 },
      ],
    },
    {
      id: "practical",
      label: "Experience or practical application",
      weight: 20,
      rules: [
        { id: "practical-source", label: "Practical evidence source", points: 4 },
        { id: "practical-context", label: "Role or project context", points: 4 },
        { id: "practical-contributions", label: "Contributions or responsibilities", points: 6 },
        { id: "practical-outcomes", label: "Completed work or outcomes", points: 4 },
        { id: "practical-scope", label: "Dates, scope, or technologies", points: 2 },
      ],
    },
    {
      id: "education",
      label: "Education and learning evidence",
      weight: 15,
      rules: [
        { id: "education-identity", label: "Institution and qualification context", points: 6 },
        { id: "education-details", label: "Dates and useful education details", points: 5 },
        { id: "learning-evidence", label: "Supporting learning or credentials", points: 4 },
      ],
    },
    {
      id: "structure",
      label: "Structure, text clarity, and completeness",
      weight: 20,
      rules: [
        { id: "identity-contact", label: "Identity and contact details", points: 4 },
        { id: "opening-context", label: "Professional summary or objective", points: 3 },
        { id: "record-context", label: "Complete section context", points: 5 },
        { id: "readable-evidence", label: "Readable, substantive descriptions", points: 4 },
        { id: "resolved-information", label: "Clear, unambiguous information", points: 4 },
      ],
    },
  ],
};

function validateResumeQualityRubric(rubric = RESUME_QUALITY_RUBRIC) {
  if (!rubric || typeof rubric !== "object" || !Array.isArray(rubric.criteria)) {
    throw new Error("Resume-quality rubric must contain criteria.");
  }

  const criterionIds = new Set();
  let total = 0;
  for (const criterion of rubric.criteria) {
    if (criterionIds.has(criterion.id)) {
      throw new Error(`Duplicate resume-quality criterion: ${criterion.id}`);
    }
    criterionIds.add(criterion.id);

    const ruleIds = new Set();
    const ruleTotal = criterion.rules.reduce((sum, rule) => {
      if (ruleIds.has(rule.id)) {
        throw new Error(`Duplicate resume-quality rule: ${rule.id}`);
      }
      if (!Number.isInteger(rule.points) || rule.points <= 0) {
        throw new Error(`Resume-quality rule ${rule.id} must have positive integer points.`);
      }
      ruleIds.add(rule.id);
      return sum + rule.points;
    }, 0);

    if (ruleTotal !== criterion.weight) {
      throw new Error(`${criterion.id} rules must total ${criterion.weight} points.`);
    }
    total += criterion.weight;
  }

  if (total !== 100) {
    throw new Error("Resume-quality criterion weights must total exactly 100.");
  }
  return true;
}

validateResumeQualityRubric();

module.exports = { RESUME_QUALITY_RUBRIC, validateResumeQualityRubric };
