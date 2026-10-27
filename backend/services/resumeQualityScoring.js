const {
  RESUME_QUALITY_RUBRIC,
  validateResumeQualityRubric,
} = require("../config/resumeQualityRubric");
const { validateResumeAnalysis } = require("./resumeAnalysis");

const QUALITY_DISCLAIMER =
  "This score measures evidence and clarity in this resume. It does not measure candidate ability, predict hiring decisions, or replace role-match scoring.";
const QUALITY_LIMITATIONS = [
  "The score uses validated extracted text and cannot assess fonts, spacing, colors, visual alignment, or rendered ATS behavior.",
  "A missing item means it was not found in this resume; it is not proof that the candidate lacks the ability or experience.",
  "Documented outcomes are scored as resume evidence, but the system cannot independently verify whether a claim is true.",
];
const OUTCOME_PATTERN = /(?:\b\d+(?:\.\d+)?%?\b|\b(?:achieved|automated|built|completed|created|delivered|deployed|designed|developed|implemented|improved|increased|launched|reduced|saved|streamlined)\b)/iu;

class ResumeQualityInputError extends Error {}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const normalizedText = normalize(text);
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase) && ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function coveragePoints(points, matched, total) {
  if (total <= 0 || matched <= 0) return 0;
  return Math.min(points, Math.round((points * matched) / total));
}

function createRuleResult(rule, earned, evidence, explanation) {
  return {
    ruleId: rule.id,
    label: rule.label,
    earned,
    possible: rule.points,
    passed: earned === rule.points,
    evidence,
    explanation,
  };
}

const ACTIONS = {
  "explicit-skills": {
    section: "Skills",
    whyItMatters: "A clear skills section helps reviewers identify explicit capabilities quickly.",
    action: "Add a concise skills section containing only skills you can genuinely support.",
    checklist: ["Use specific skill names", "Remove vague claims", "Keep only skills you can discuss or demonstrate"],
    verification: ["Confirm every listed skill appears exactly once", "Confirm no skill was inferred or added only for scoring"],
  },
  "organized-skills": {
    section: "Skills",
    whyItMatters: "Grouping skills makes a long list easier to scan and understand.",
    action: "Group documented skills into technical, tools, domain, or interpersonal categories.",
    checklist: ["Place every listed skill in one suitable group", "Keep category names consistent", "Remove duplicate labels"],
    verification: ["Check that every grouped skill also exists in the resume", "Check that no skill appears in multiple groups unnecessarily"],
  },
  "supported-skills": {
    section: "Skills, projects, and experience",
    whyItMatters: "Skills are more credible when the resume shows where they were applied.",
    action: "Connect unsupported skills to genuine project, education, certification, or experience evidence.",
    checklist: ["Name the relevant skill in the supporting entry", "Describe how it was used", "Remove skills you cannot support"],
    verification: ["For each important skill, point to one resume entry that demonstrates it", "Do not create experience that did not happen"],
  },
  "clear-skill-labels": {
    section: "Skills",
    whyItMatters: "Consistent labels reduce keyword noise and improve readability.",
    action: "Normalize duplicate, overly long, or ambiguous skill labels.",
    checklist: ["Use one name per skill", "Expand unclear abbreviations when useful", "Avoid sentences inside the skills list"],
    verification: ["Search the skills section for repeated equivalent terms", "Confirm every label is easy to identify"],
  },
  "project-names": {
    section: "Projects",
    whyItMatters: "A project name gives reviewers a stable reference for the work.",
    action: "Give every documented project a specific name.",
    checklist: ["Name the product or problem", "Avoid generic labels such as Project 1", "Keep the name concise"],
    verification: ["Confirm every project card has a meaningful title"],
  },
  "project-objectives": {
    section: "Projects",
    whyItMatters: "The objective explains what was built and why the work mattered.",
    action: "Add the genuine objective or problem statement to incomplete project descriptions.",
    checklist: ["State the problem", "Identify the intended user or use case", "Keep the description factual"],
    verification: ["A reader should understand each project's purpose without guessing"],
  },
  "project-technologies": {
    section: "Projects",
    whyItMatters: "Project-specific technologies show practical application of skills.",
    action: "List only the technologies actually used for each project.",
    checklist: ["Name languages and frameworks", "Include relevant tools or databases", "Remove technologies not used"],
    verification: ["Confirm you can explain how every listed technology contributed to the project"],
  },
  "project-contributions": {
    section: "Projects",
    whyItMatters: "Contribution details separate the student's own work from the overall project.",
    action: "Add specific implementation bullets describing your personal contribution.",
    checklist: ["Start with a precise action", "Describe what you implemented", "Clarify your role in team work", "Avoid unsupported responsibility claims"],
    verification: ["Each project should contain at least one contribution you can personally explain"],
  },
  "project-outcomes": {
    section: "Projects",
    whyItMatters: "Outcomes show what the work produced or changed.",
    action: "Add a genuine result, completed capability, test result, or measurable outcome where evidence exists.",
    checklist: ["Describe the completed result", "Use a metric only when you have evidence", "Use a factual qualitative result when no metric exists"],
    verification: ["Confirm every outcome is supported and was not estimated for the resume"],
  },
  "project-support": {
    section: "Projects",
    whyItMatters: "Supporting details make project claims easier to review.",
    action: "Add a genuine project link or another specific implementation detail.",
    checklist: ["Add a repository or demo link when public", "Otherwise add a second substantive implementation bullet"],
    verification: ["Open every included link", "Remove inaccessible or unrelated links"],
  },
  "practical-source": {
    section: "Experience, projects, or activities",
    whyItMatters: "Applied evidence helps reviewers understand how knowledge was used.",
    action: "Document genuine practical work such as a project, internship, volunteering task, lab, or relevant activity.",
    checklist: ["Choose work you actually completed", "State the context", "Describe your contribution"],
    verification: ["Confirm the entry describes real work and not a planned activity"],
  },
  "practical-context": {
    section: "Experience, projects, or activities",
    whyItMatters: "Context lets a reviewer understand the setting and purpose of the work.",
    action: "Add the role, organization, project name, or activity context to practical entries.",
    checklist: ["Identify the setting", "State your role", "Explain the objective"],
    verification: ["A reader should know where or why the work happened"],
  },
  "practical-contributions": {
    section: "Experience, projects, or activities",
    whyItMatters: "Specific contributions provide stronger evidence than titles alone.",
    action: "Replace title-only entries with factual contribution bullets.",
    checklist: ["Describe actions you performed", "Name relevant methods or tools", "Separate team results from your contribution"],
    verification: ["Every practical entry should show at least one concrete contribution"],
  },
  "practical-outcomes": {
    section: "Experience, projects, or activities",
    whyItMatters: "Completed outputs and outcomes make practical evidence easier to evaluate.",
    action: "Describe what was completed, delivered, improved, or learned, using genuine evidence only.",
    checklist: ["State the completed output", "Add a supported outcome", "Do not invent a number"],
    verification: ["Confirm the outcome follows logically from the contribution"],
  },
  "practical-scope": {
    section: "Experience, projects, or activities",
    whyItMatters: "Dates, technologies, and scope help reviewers interpret the depth of an entry.",
    action: "Add available dates, duration, technologies, or scope details.",
    checklist: ["Add dates when known", "Name tools actually used", "Clarify team or feature scope when relevant"],
    verification: ["Confirm scope details are consistent with the rest of the resume"],
  },
  "education-identity": {
    section: "Education",
    whyItMatters: "Institution and qualification details identify the documented learning path.",
    action: "Complete missing institution, degree, or field-of-study information.",
    checklist: ["Add institution name", "Add qualification", "Add field or specialization when applicable"],
    verification: ["Confirm names match official academic records"],
  },
  "education-details": {
    section: "Education",
    whyItMatters: "Dates and relevant details make education evidence complete and understandable.",
    action: "Add available dates and useful academic details without rating or exaggerating them.",
    checklist: ["Add start or completion dates", "Add relevant coursework, specialization, or documented score", "Do not change or estimate grades"],
    verification: ["Compare dates and scores with official records"],
  },
  "learning-evidence": {
    section: "Education and certifications",
    whyItMatters: "Supporting learning evidence provides useful context for developing skills.",
    action: "Add genuine coursework, credentials, or certifications when relevant.",
    checklist: ["Name the course or credential", "Add issuer when applicable", "Add date or credential ID when available"],
    verification: ["Confirm every credential can be supported", "Remove expired or irrelevant claims only when appropriate"],
  },
  "identity-contact": {
    section: "Header and contact information",
    whyItMatters: "A reviewer needs to identify and contact the candidate.",
    action: "Add the candidate name and at least one current contact method.",
    checklist: ["Add full name", "Add current email or phone", "Check portfolio and LinkedIn links"],
    verification: ["Test links and confirm contact information is current"],
  },
  "opening-context": {
    section: "Professional summary",
    whyItMatters: "A concise opening gives context before detailed evidence.",
    action: "Add a short factual summary or objective tailored to the documented background.",
    checklist: ["State current background", "Mention supported focus areas", "Avoid unsupported adjectives or goals"],
    verification: ["Confirm every claim is supported elsewhere in the resume"],
  },
  "record-context": {
    section: "Education, experience, projects, and certifications",
    whyItMatters: "Entries need identifiers and context to be understood reliably.",
    action: "Complete missing names, organizations, titles, descriptions, or issuers in existing entries.",
    checklist: ["Review every section entry", "Fill only facts you can confirm", "Remove empty placeholders"],
    verification: ["Each entry should be understandable without relying on nearby formatting"],
  },
  "readable-evidence": {
    section: "Descriptions and bullet points",
    whyItMatters: "Substantive, concise evidence is easier to scan than fragments or dense paragraphs.",
    action: "Rewrite incomplete fragments as concise evidence-focused descriptions or bullets.",
    checklist: ["Use clear action language", "Keep one idea per bullet", "Include relevant context", "Avoid long generic paragraphs"],
    verification: ["Read each bullet independently and confirm it communicates a complete fact"],
  },
  "resolved-information": {
    section: "Sections flagged for confirmation",
    whyItMatters: "Ambiguous or conflicting details can reduce reviewer confidence.",
    action: "Confirm and correct the information listed under uncertainties.",
    checklist: ["Check dates", "Resolve unclear labels", "Verify names and credentials", "Remove unreadable or conflicting text"],
    verification: ["Reanalyze the updated PDF and confirm the uncertainty is no longer reported"],
  },
};

function makeImprovement(criterion, ruleResult, order) {
  const template = ACTIONS[ruleResult.ruleId];
  const pointsAvailable = ruleResult.possible - ruleResult.earned;
  return {
    criterionId: criterion.id,
    criterion: criterion.label,
    ruleId: ruleResult.ruleId,
    priority: pointsAvailable >= 5 ? "high" : pointsAvailable >= 3 ? "medium" : "low",
    pointsAvailable,
    section: template.section,
    whyItMatters: template.whyItMatters,
    observation: ruleResult.explanation,
    action: template.action,
    checklist: template.checklist,
    verification: template.verification,
    order,
  };
}

function scoreSkills(analysis, criterion) {
  const rules = Object.fromEntries(criterion.rules.map((rule) => [rule.id, rule]));
  const skills = analysis.skills.filter(hasText);
  const normalizedSkills = skills.map(normalize);
  const groupedSkills = Object.values(analysis.skillProfile).flat().filter(hasText);
  const grouped = new Set(groupedSkills.map(normalize));
  const supportText = [
    ...analysis.projects.flatMap((item) => [item.description, ...item.technologies, ...item.highlights]),
    ...analysis.experience.flatMap((item) => [item.title, ...item.highlights]),
    ...analysis.education.flatMap((item) => item.details),
    ...analysis.certifications.flatMap((item) => [item.name, item.issuer]),
  ].filter(hasText);
  const supported = skills.filter((skill) => supportText.some((text) => containsPhrase(text, skill)));
  const unique = new Set();
  const clearLabels = skills.filter((skill) => {
    const key = normalize(skill);
    const clear = Boolean(key) && skill.trim().length <= 60 && !unique.has(key);
    unique.add(key);
    return clear;
  });

  return [
    createRuleResult(rules["explicit-skills"], skills.length > 0 ? 4 : 0, skills.slice(0, 5), skills.length > 0 ? `${skills.length} explicit skills were documented.` : "No explicit skills were found in this resume."),
    createRuleResult(rules["organized-skills"], coveragePoints(4, normalizedSkills.filter((skill) => grouped.has(skill)).length, normalizedSkills.length), groupedSkills.slice(0, 5), groupedSkills.length > 0 ? `${groupedSkills.length} grouped skill entries support scanability.` : "No organized skill groups were found."),
    createRuleResult(rules["supported-skills"], coveragePoints(8, supported.length, skills.length), supported.slice(0, 5), skills.length > 0 ? `${supported.length} of ${skills.length} skills are linked to application evidence.` : "There are no skills to connect to application evidence."),
    createRuleResult(rules["clear-skill-labels"], coveragePoints(4, clearLabels.length, skills.length), clearLabels.slice(0, 5), skills.length > 0 ? `${clearLabels.length} of ${skills.length} skill labels are clear and non-duplicated.` : "No skill labels were available to assess."),
  ];
}

function scoreProjects(analysis, criterion) {
  const rules = Object.fromEntries(criterion.rules.map((rule) => [rule.id, rule]));
  const projects = analysis.projects;
  const total = projects.length;
  const names = projects.filter((item) => hasText(item.name));
  const objectives = projects.filter((item) => hasText(item.description));
  const technologies = projects.filter((item) => item.technologies.some(hasText));
  const contributions = projects.filter((item) => item.highlights.some(hasText));
  const outcomes = projects.filter((item) => [item.description, ...item.highlights].filter(hasText).some((text) => OUTCOME_PATTERN.test(text)));
  const support = projects.filter((item) => hasText(item.url) || item.highlights.filter(hasText).length >= 2);
  const noProjects = "No projects were found in this resume; this does not mean the candidate has no project experience.";

  const result = (rule, items, label) => createRuleResult(
    rule,
    coveragePoints(rule.points, items.length, total),
    items.map((item) => item.name || "Unnamed project").slice(0, 5),
    total > 0 ? `${items.length} of ${total} projects include ${label}.` : noProjects,
  );

  return [
    result(rules["project-names"], names, "a specific name"),
    result(rules["project-objectives"], objectives, "an objective or description"),
    result(rules["project-technologies"], technologies, "documented technologies"),
    result(rules["project-contributions"], contributions, "contribution highlights"),
    result(rules["project-outcomes"], outcomes, "a documented result or completed output"),
    result(rules["project-support"], support, "a supporting link or additional implementation evidence"),
  ];
}

function scorePractical(analysis, criterion) {
  const rules = Object.fromEntries(criterion.rules.map((rule) => [rule.id, rule]));
  const experiences = analysis.experience;
  const projects = analysis.projects;
  const activities = analysis.activities;
  const sourceCount = experiences.length + projects.length + activities.length;
  const context = experiences.some((item) => hasText(item.title) || hasText(item.employer)) || projects.some((item) => hasText(item.name) && hasText(item.description)) || activities.some((item) => hasText(item.point));
  const contributions = experiences.some((item) => item.highlights.some(hasText)) || projects.some((item) => item.highlights.some(hasText)) || activities.some((item) => hasText(item.evidence));
  const outcomeText = [
    ...experiences.flatMap((item) => item.highlights),
    ...projects.flatMap((item) => [item.description, ...item.highlights]),
    ...activities.flatMap((item) => [item.point, item.evidence]),
  ].filter(hasText);
  const outcomes = outcomeText.some((text) => OUTCOME_PATTERN.test(text));
  const scope = experiences.some((item) => hasText(item.startDate) || hasText(item.endDate) || hasText(item.location)) || projects.some((item) => item.technologies.some(hasText) || hasText(item.url)) || activities.some((item) => hasText(item.evidence));
  const evidence = [
    ...experiences.map((item) => item.title || item.employer || "Experience entry"),
    ...projects.map((item) => item.name || "Project entry"),
    ...activities.map((item) => item.point),
  ].filter(hasText).slice(0, 5);

  return [
    createRuleResult(rules["practical-source"], sourceCount > 0 ? 4 : 0, evidence, sourceCount > 0 ? `${sourceCount} practical evidence entries were documented; formal employment is not required.` : "No experience, project, or practical activity was found in this resume."),
    createRuleResult(rules["practical-context"], context ? 4 : 0, evidence, context ? "At least one practical entry includes role or project context." : "Practical role, organization, or project context is not sufficiently documented."),
    createRuleResult(rules["practical-contributions"], contributions ? 6 : 0, evidence, contributions ? "At least one practical entry describes contributions or responsibilities." : "No specific contribution or responsibility was found in practical entries."),
    createRuleResult(rules["practical-outcomes"], outcomes ? 4 : 0, evidence, outcomes ? "At least one practical entry documents a completed output or outcome." : "No completed output or outcome signal was found in practical entries."),
    createRuleResult(rules["practical-scope"], scope ? 2 : 0, evidence, scope ? "Dates, scope, technologies, or equivalent context were documented." : "Practical entries do not include enough date, scope, or technology context."),
  ];
}

function scoreEducation(analysis, criterion) {
  const rules = Object.fromEntries(criterion.rules.map((rule) => [rule.id, rule]));
  const education = analysis.education;
  const identityUnits = education.length * 2;
  const identityMatches = education.reduce((sum, item) => sum + Number(hasText(item.institution)) + Number(hasText(item.degree) || hasText(item.fieldOfStudy)), 0);
  const detailUnits = education.length * 3;
  const detailMatches = education.reduce((sum, item) => sum + Number(hasText(item.startDate)) + Number(hasText(item.endDate)) + Number(item.details.some(hasText)), 0);
  const completeCredentials = analysis.certifications.filter((item) => hasText(item.name) && hasText(item.issuer));
  const partialCredentials = analysis.certifications.filter((item) => hasText(item.name));
  const hasEducationDetail = education.some((item) => item.details.some(hasText));
  const learningPoints = completeCredentials.length > 0 || hasEducationDetail ? 4 : partialCredentials.length > 0 ? 2 : 0;
  const educationEvidence = education.map((item) => item.institution || item.degree || "Education entry").slice(0, 5);

  return [
    createRuleResult(rules["education-identity"], coveragePoints(6, identityMatches, identityUnits), educationEvidence, education.length > 0 ? `${identityMatches} of ${identityUnits} institution and qualification evidence points are documented.` : "No education entry was found in this resume."),
    createRuleResult(rules["education-details"], coveragePoints(5, detailMatches, detailUnits), educationEvidence, education.length > 0 ? `${detailMatches} of ${detailUnits} date and education-detail evidence points are documented.` : "No education details were available to assess."),
    createRuleResult(rules["learning-evidence"], learningPoints, [...completeCredentials.map((item) => item.name), ...(hasEducationDetail ? ["Education details"] : [])].filter(hasText).slice(0, 5), learningPoints === 4 ? "Supporting education details or complete credential evidence is documented." : learningPoints > 0 ? "A credential is named but supporting issuer information is incomplete." : "No supporting education detail or documented credential was found."),
  ];
}

function scoreStructure(analysis, criterion) {
  const rules = Object.fromEntries(criterion.rules.map((rule) => [rule.id, rule]));
  const contactMethods = [analysis.contact.email, analysis.contact.phone, analysis.contact.linkedin, analysis.contact.website].filter(hasText);
  const identityPoints = Number(hasText(analysis.name)) * 2 + Number(contactMethods.length > 0) * 2;
  const records = [
    ...analysis.education.map((item) => ({ complete: hasText(item.institution) && (hasText(item.degree) || hasText(item.fieldOfStudy)), label: item.institution || item.degree || "Education entry" })),
    ...analysis.experience.map((item) => ({ complete: hasText(item.title) && hasText(item.employer), label: item.title || item.employer || "Experience entry" })),
    ...analysis.projects.map((item) => ({ complete: hasText(item.name) && hasText(item.description), label: item.name || "Project entry" })),
    ...analysis.certifications.map((item) => ({ complete: hasText(item.name) && hasText(item.issuer), label: item.name || "Certification entry" })),
  ];
  const completeRecords = records.filter((item) => item.complete);
  const evidenceUnits = [
    analysis.professionalSummary,
    ...analysis.education.flatMap((item) => item.details),
    ...analysis.experience.flatMap((item) => item.highlights),
    ...analysis.projects.flatMap((item) => [item.description, ...item.highlights]),
  ].filter(hasText);
  const readableUnits = evidenceUnits.filter((item) => item.trim().length >= 20 && item.trim().length <= 350);
  const uncertaintyCount = analysis.uncertainties.filter(hasText).length;
  const hasAnyResumeEvidence = Boolean(
    hasText(analysis.name) ||
    contactMethods.length > 0 ||
    hasText(analysis.professionalSummary) ||
    records.length > 0 ||
    analysis.skills.some(hasText) ||
    analysis.activities.length > 0 ||
    analysis.additionalInformation.length > 0
  );
  const uncertaintyPoints = !hasAnyResumeEvidence ? 0 : uncertaintyCount === 0 ? 4 : uncertaintyCount === 1 ? 3 : uncertaintyCount === 2 ? 2 : uncertaintyCount === 3 ? 1 : 0;

  return [
    createRuleResult(rules["identity-contact"], identityPoints, [hasText(analysis.name) ? "Candidate name" : null, ...contactMethods.map(() => "Contact method")].filter(Boolean), identityPoints === 4 ? "Candidate identity and at least one contact method are documented." : "Candidate identity or a usable contact method is incomplete."),
    createRuleResult(rules["opening-context"], hasText(analysis.professionalSummary) ? 3 : 0, hasText(analysis.professionalSummary) ? ["Professional summary"] : [], hasText(analysis.professionalSummary) ? "A professional summary or objective provides opening context." : "No professional summary or objective was found."),
    createRuleResult(rules["record-context"], coveragePoints(5, completeRecords.length, records.length), completeRecords.map((item) => item.label).slice(0, 5), records.length > 0 ? `${completeRecords.length} of ${records.length} section entries contain essential identifying context.` : "No section records were available to assess for completeness."),
    createRuleResult(rules["readable-evidence"], coveragePoints(4, readableUnits.length, evidenceUnits.length), readableUnits.slice(0, 3), evidenceUnits.length > 0 ? `${readableUnits.length} of ${evidenceUnits.length} descriptions or bullets contain substantive, concise text.` : "No descriptions or evidence bullets were available to assess."),
    createRuleResult(rules["resolved-information"], uncertaintyPoints, analysis.uncertainties.slice(0, 5), uncertaintyCount === 0 ? "No material uncertainty was reported in the extracted resume information." : `${uncertaintyCount} item${uncertaintyCount === 1 ? "" : "s"} require confirmation.`),
  ];
}

function labelForScore(score) {
  if (score >= 85) return "strongly-documented";
  if (score >= 70) return "solid-documentation";
  if (score >= 50) return "developing-documentation";
  return "limited-scorable-evidence";
}

function ratingLabelForScore(score) {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  return "NEEDS WORK";
}

function buildAtsCompatibility(analysis, criteria, score, improvements) {
  const byId = Object.fromEntries(criteria.map((c) => [c.id, c]));
  const ruleMap = Object.fromEntries(
    criteria.flatMap((c) => c.ruleResults.map((r) => [r.ruleId, r])),
  );

  const contactMethods = [
    analysis.contact.email && "Email",
    analysis.contact.phone && "Phone",
    analysis.contact.location && "Location",
    analysis.contact.linkedin && "LinkedIn",
    analysis.contact.website && "Website",
  ].filter(Boolean);
  const contactScore = Math.min(
    100,
    (hasText(analysis.name) ? 40 : 0) +
      (hasText(analysis.contact.email) ? 30 : 0) +
      (hasText(analysis.contact.phone) || hasText(analysis.contact.location) ? 15 : 0) +
      (hasText(analysis.contact.linkedin) || hasText(analysis.contact.website) ? 15 : 0),
  );

  const summaryText = (analysis.professionalSummary ?? "").trim();
  const summaryScore = !summaryText
    ? 0
    : summaryText.length >= 60 && summaryText.length <= 450
      ? 100
      : summaryText.length >= 25
        ? 75
        : 50;

  const practicalCrit = byId.practical;
  const experienceScore = practicalCrit ? practicalCrit.percentage : 0;

  const skillsCrit = byId.skills;
  const skillsScore = skillsCrit ? skillsCrit.percentage : 0;

  const educationCrit = byId.education;
  const educationScore = educationCrit ? educationCrit.percentage : 0;

  const supportedRule = ruleMap["supported-skills"];
  const explicitRule = ruleMap["explicit-skills"];
  const keywordsEarned = (supportedRule?.earned ?? 0) + (explicitRule?.earned ?? 0);
  const keywordsMax = (supportedRule?.possible ?? 8) + (explicitRule?.possible ?? 4);
  const keywordsScore = keywordsMax > 0 ? Math.round((keywordsEarned / keywordsMax) * 100) : 0;

  const recordRule = ruleMap["record-context"];
  const resolvedRule = ruleMap["resolved-information"];
  const formattingEarned = (recordRule?.earned ?? 0) + (resolvedRule?.earned ?? 0);
  const formattingMax = (recordRule?.possible ?? 5) + (resolvedRule?.possible ?? 4);
  const formattingScore = formattingMax > 0 ? Math.round((formattingEarned / formattingMax) * 100) : 0;

  const projOutcomes = ruleMap["project-outcomes"]?.earned ?? 0;
  const practOutcomes = ruleMap["practical-outcomes"]?.earned ?? 0;
  const explicitAchievements = analysis.achievements?.length ?? 0;
  const achievementsScore = Math.min(
    100,
    Math.round(((projOutcomes + practOutcomes) / 8) * 85) + (explicitAchievements > 0 ? 15 : 0),
  );

  const readableRule = ruleMap["readable-evidence"];
  const clearLabelsRule = ruleMap["clear-skill-labels"];
  const readabilityEarned = (readableRule?.earned ?? 0) + (clearLabelsRule?.earned ?? 0);
  const readabilityMax = (readableRule?.possible ?? 4) + (clearLabelsRule?.possible ?? 4);
  const readabilityScore = readabilityMax > 0 ? Math.round((readabilityEarned / readabilityMax) * 100) : 0;

  const actionBullets = [
    ...analysis.experience.flatMap((e) => e.highlights),
    ...analysis.projects.flatMap((p) => [p.description, ...p.highlights]),
    ...(analysis.activities ?? []).map((a) => a.point),
  ].filter(hasText);
  const actionMatched = actionBullets.filter((b) => OUTCOME_PATTERN.test(b));
  const actionVerbsScore =
    actionBullets.length > 0
      ? Math.round((actionMatched.length / actionBullets.length) * 100)
      : 0;

  const toStatus = (val) => (val >= 80 ? "good" : val >= 50 ? "warning" : "critical");

  const sectionBreakdown = [
    {
      id: "contact-info",
      label: "CONTACT INFO",
      score: contactScore,
      maxScore: 100,
      status: toStatus(contactScore),
      evidence: contactMethods,
      explanation:
        contactScore >= 85
          ? "Candidate name and primary contact channels are clearly documented."
          : "Add missing contact channels (email, phone, location, or profile link) so parsers can index candidate identity.",
    },
    {
      id: "summary",
      label: "SUMMARY",
      score: summaryScore,
      maxScore: 100,
      status: toStatus(summaryScore),
      evidence: summaryText ? [summaryText.slice(0, 120)] : [],
      explanation:
        summaryScore >= 80
          ? "Opening summary provides concise, scorable context."
          : summaryScore > 0
            ? "Expand the professional summary to 2–3 factual sentences summarizing your core background."
            : "No professional summary or objective was found in the extracted text.",
    },
    {
      id: "experience",
      label: "EXPERIENCE",
      score: experienceScore,
      maxScore: 100,
      status: toStatus(experienceScore),
      evidence: practicalCrit?.ruleResults.flatMap((r) => r.evidence).slice(0, 4) ?? [],
      explanation: practicalCrit?.explanation ?? "Practical application evidence evaluation.",
    },
    {
      id: "skills",
      label: "SKILLS",
      score: skillsScore,
      maxScore: 100,
      status: toStatus(skillsScore),
      evidence: analysis.skills.slice(0, 6),
      explanation: skillsCrit?.explanation ?? "Explicit skills and organization evaluation.",
    },
    {
      id: "education",
      label: "EDUCATION",
      score: educationScore,
      maxScore: 100,
      status: toStatus(educationScore),
      evidence: educationCrit?.ruleResults.flatMap((r) => r.evidence).slice(0, 4) ?? [],
      explanation: educationCrit?.explanation ?? "Education completeness evaluation.",
    },
    {
      id: "keywords",
      label: "KEYWORDS",
      score: keywordsScore,
      maxScore: 100,
      status: toStatus(keywordsScore),
      evidence: supportedRule?.evidence ?? [],
      explanation:
        supportedRule?.explanation ??
        "Measures whether listed skills are backed by contextual evidence in projects or experience.",
    },
    {
      id: "formatting",
      label: "FORMATTING",
      score: formattingScore,
      maxScore: 100,
      status: toStatus(formattingScore),
      evidence: recordRule?.evidence ?? [],
      explanation:
        "Evaluates structural consistency of extracted entries and date/title completeness (visual layout is not assessed from text).",
    },
    {
      id: "achievements",
      label: "ACHIEVEMENTS",
      score: achievementsScore,
      maxScore: 100,
      status: toStatus(achievementsScore),
      evidence: [
        ...(analysis.achievements ?? []).map((a) => a.point),
        ...(ruleMap["project-outcomes"]?.evidence ?? []),
      ].slice(0, 4),
      explanation:
        achievementsScore >= 75
          ? "Projects or practical entries document concrete outputs or achievements."
          : "Add factual outcomes or completed deliverables to project and experience entries.",
    },
    {
      id: "readability",
      label: "READABILITY",
      score: readabilityScore,
      maxScore: 100,
      status: toStatus(readabilityScore),
      evidence: readableRule?.evidence ?? [],
      explanation:
        readableRule?.explanation ??
        "Measures bullet conciseness (20–350 characters) and normalized terminology.",
    },
    {
      id: "action-verbs",
      label: "ACTION VERBS",
      score: actionVerbsScore,
      maxScore: 100,
      status: toStatus(actionVerbsScore),
      evidence: actionMatched.slice(0, 3),
      explanation:
        actionBullets.length > 0
          ? `${actionMatched.length} of ${actionBullets.length} evidence statements include strong action or outcome language.`
          : "No project or experience statements were available to check for action verbs.",
    },
  ];

  const uncertaintyCount = analysis.uncertainties.filter(hasText).length;
  const hasAnyEvidence = score > 0;
  const distortionRisk = !hasAnyEvidence
    ? {
        level: "high",
        title: "No Scorable Text",
        subtitle: "(Check PDF Export)",
        explanation: "No structured resume text was available to score.",
      }
    : uncertaintyCount === 0
      ? {
          level: "none",
          title: "No Distortion",
          subtitle: "(Excellent)",
          explanation: "All extracted sections parsed cleanly without ambiguous or garbled fields.",
        }
      : {
          level: "low",
          title: `${uncertaintyCount} Ambiguous Field${uncertaintyCount === 1 ? "" : "s"}`,
          subtitle: "(Review Recommended)",
          explanation: analysis.uncertainties[0],
        };

  const hasDates =
    analysis.education.some((e) => hasText(e.startDate) || hasText(e.endDate)) ||
    analysis.experience.some((e) => hasText(e.startDate) || hasText(e.endDate));

  const globalStandards = [
    {
      id: "phone-contact",
      label: "Contact & Email Format",
      passed: hasText(analysis.contact.email) || hasText(analysis.contact.phone),
      status: hasText(analysis.contact.email) || hasText(analysis.contact.phone) ? "passed" : "missing",
    },
    {
      id: "date-format",
      label: "Date Format",
      passed: hasDates,
      status: hasDates ? "passed" : "missing",
    },
    {
      id: "language-support",
      label: "Language & Text Support",
      passed: hasAnyEvidence && uncertaintyCount === 0,
      status: hasAnyEvidence ? "passed" : "missing",
    },
    {
      id: "visual-layout",
      label: "Visual PDF Layout (Text-Only)",
      passed: null,
      status: "unavailable",
    },
  ];

  const topGaps = improvements.slice(0, 2).map((i) => i.section.toLowerCase());
  const ratingWord = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "developing" : "limited";
  const summaryNarrative =
    improvements.length === 0
      ? `Your resume scored ${score}/100 and is currently rated as ${ratingWord}. All configured ATS text-completeness and evidence checks passed.`
      : `Your resume scored ${score}/100. It is currently rated as ${ratingWord}. Addressing gaps in ${topGaps.join(" and ")} will strengthen your evidence for ATS and reviewer screening.`;

  return {
    version: "1.0.0",
    ratingLabel: ratingLabelForScore(score),
    ratingWord,
    summaryNarrative,
    distortionRisk,
    globalStandards,
    sectionBreakdown,
  };
}

function scoreResumeQuality(inputAnalysis, rubric = RESUME_QUALITY_RUBRIC) {
  validateResumeQualityRubric(rubric);
  let analysis;
  try {
    analysis = validateResumeAnalysis(inputAnalysis);
  } catch {
    throw new ResumeQualityInputError("Invalid resume analysis.");
  }

  const scorers = {
    skills: scoreSkills,
    projects: scoreProjects,
    practical: scorePractical,
    education: scoreEducation,
    structure: scoreStructure,
  };
  const criteria = rubric.criteria.map((criterion) => {
    const ruleResults = scorers[criterion.id](analysis, criterion);
    const earned = ruleResults.reduce((sum, rule) => sum + rule.earned, 0);
    const fullRules = ruleResults.filter((rule) => rule.passed).map((rule) => rule.label);
    return {
      id: criterion.id,
      label: criterion.label,
      earned,
      weight: criterion.weight,
      percentage: Math.round((earned / criterion.weight) * 100),
      explanation: fullRules.length > 0
        ? `${earned}/${criterion.weight} points. Full evidence was found for: ${fullRules.join(", ")}.`
        : `${earned}/${criterion.weight} points. No subcriterion had complete supporting evidence.`,
      ruleResults,
    };
  });
  const score = criteria.reduce((sum, criterion) => sum + criterion.earned, 0);
  const strengths = criteria.flatMap((criterion) => criterion.ruleResults
    .filter((rule) => rule.passed)
    .map((rule) => ({
      criterionId: criterion.id,
      criterion: criterion.label,
      ruleId: rule.ruleId,
      point: rule.label,
      evidence: rule.evidence,
      points: rule.earned,
    })));
  let improvementOrder = 0;
  const improvements = criteria
    .flatMap((criterion) => criterion.ruleResults
      .filter((rule) => !rule.passed)
      .map((rule) => makeImprovement(criterion, rule, improvementOrder++)))
    .sort((left, right) => right.pointsAvailable - left.pointsAvailable || left.order - right.order)
    .map(({ order, ...item }) => item);
  const warnings = [];
  if (score === 0) {
    warnings.push("No scorable resume-quality evidence was found in the validated analysis.");
  }

  return {
    rubricVersion: rubric.version,
    score,
    maxScore: 100,
    label: labelForScore(score),
    disclaimer: QUALITY_DISCLAIMER,
    criteria,
    strengths,
    improvements,
    warnings,
    limitations: QUALITY_LIMITATIONS,
    atsCompatibility: buildAtsCompatibility(analysis, criteria, score, improvements),
  };
}

module.exports = {
  QUALITY_DISCLAIMER,
  QUALITY_LIMITATIONS,
  ResumeQualityInputError,
  scoreResumeQuality,
};
