/**
 * Deterministic Resume Content Validation Engine
 *
 * Evaluates whether extracted document text represents a genuine resume or CV
 * using multi-signal weighted scoring and negative indicator heuristics.
 * Runs completely in memory before any external AI provider (e.g. Groq) is called.
 */

const MIN_CHARACTERS = 80;
const MIN_WORDS = 25;
const CONFIDENT_THRESHOLD = 45;
const AMBIGUOUS_THRESHOLD = 32;

// 1. Contact & Identity patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}\b/;
const PROFILE_LINKS_REGEX = /\b(?:linkedin\.com\/in|github\.com\/[a-zA-Z0-9_-]+|gitlab\.com\/|portfolio|behance\.net)\b/i;

// 2. Education indicators
const EDUCATION_SECTION_REGEX = /\b(?:education|academic(?:s|\s+background|\s+qualifications)?|qualifications|educational\s+details)\b/i;
const DEGREE_REGEX = /\b(?:b\.?tech|b\.?e\.?|bachelor(?:'s)?|b\.?s\.?|b\.?sc|m\.?tech|m\.?e\.?|master(?:'s)?|m\.?s\.?|m\.?sc|mca|bca|mba|bba|ph\.?d|doctorate|diploma|secondary|intermediate|matriculation|high\s+school)\b/i;
const INSTITUTION_REGEX = /\b(?:university|college|institute(?:\s+of)?|polytechnic|academy|school\s+of|vidyalaya|campus)\b/i;
const ACADEMIC_CONTEXT_REGEX = /\b(?:gpa|cgpa|percentage|\bmajor\b|field\s+of\s+study|coursework|graduat(?:ed?|ion))\b/i;

// 3. Skills indicators
const SKILLS_SECTION_REGEX = /\b(?:skills|technical\s+skills|core\s+competencies|tools\s*(?:&|and)\s*technologies|key\s+skills|programming\s+languages|tech\s+stack|expertise)\b/i;
const TECH_SKILLS_KEYWORDS = [
  "python", "java", "javascript", "typescript", "c++", "c#", "php", "ruby", "swift",
  "kotlin", "go", "rust", "sql", "mysql", "postgresql", "sqlite", "mongodb", "oracle",
  "redis", "html", "css", "react", "angular", "vue", "node", "express", "django",
  "flask", "spring", "docker", "kubernetes", "aws", "azure", "gcp", "git", "linux",
  "excel", "power bi", "tableau", "pandas", "numpy", "machine learning", "data analysis",
  "rest api", "graphql", "devops", "ci/cd", "agile", "scrum", "oop", "figma",
];

// 4. Experience indicators
const EXPERIENCE_SECTION_REGEX = /\b(?:experience|work\s+experience|professional\s+experience|employment\s+history|internships?|work\s+history|career\s+history)\b/i;
const JOB_TITLE_REGEX = /\b(?:software\s+engineer|developer|data\s+analyst|data\s+scientist|frontend|backend|full\s*stack|web\s+developer|qa\s+engineer|devops|system\s+administrator|project\s+manager|product\s+manager|intern|associate|consultant|specialist|trainee|analyst|architect|lead|coordinator|executive|assistant)\b/i;
const EMPLOYMENT_ACTION_REGEX = /\b(?:developed|implemented|designed|maintained|managed|collaborated|built|optimized|engineered|spearheaded|responsible\s+for|contributed\s+to|worked\s+on)\b/i;
const DATE_RANGE_REGEX = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}\s*[-–—]\s*(?:\d{4}|present|current))\b/i;

// 5. Projects indicators
const PROJECT_SECTION_REGEX = /\b(?:projects|academic\s+projects|personal\s+projects|key\s+projects|portfolio|technical\s+projects)\b/i;
const PROJECT_ACTION_REGEX = /\b(?:built\s+a|developed\s+a|created\s+a|designed\s+a|implemented\s+a|project\s+overview|problem\s+statement|technologies\s+used)\b/i;

// 6. Summary / Certifications indicators
const SUMMARY_SECTION_REGEX = /\b(?:summary|professional\s+summary|career\s+objective|profile|about\s+me)\b/i;
const CERTIFICATIONS_SECTION_REGEX = /\b(?:certifications?|certificates?|achievements?|awards?|honors?|publications?|activities|extracurricular)\b/i;

// Disqualifiers: Marksheets & Transcripts
const MARKSHEET_PATTERNS = [
  /\b(?:marksheet|mark\s+sheet|grade\s+card|grade\s+sheet|academic\s+transcript|statement\s+of\s+marks)\b/i,
  /\b(?:controller\s+of\s+examinations|semester\s+(?:examination|grade|result))\b/i,
  /\b(?:subject\s+code|sub\s+code|course\s+code|credits\s+earned|sgpa|cgpa\s*[:=]\s*\d+\.\d+)\b/i,
];

// Disqualifiers: Certificates only
const CERTIFICATE_PATTERNS = [
  /\b(?:certificate\s+of\s+(?:completion|achievement|appreciation|excellence|participation|merit))\b/i,
  /\b(?:this\s+is\s+to\s+certify\s+that|is\s+hereby\s+awarded\s+to|has\s+successfully\s+completed\s+the\s+(?:course|training|program|bootcamp|workshop))\b/i,
  /\b(?:authorized\s+signat(?:ure|ory)|director\s+of\s+training|issue\s+date|verification\s+url)\b/i,
];

// Disqualifiers: Financial / Administrative
const FINANCIAL_PATTERNS = [
  /\b(?:tax\s+invoice|invoice\s+number|bill\s+to|ship\s+to|payment\s+receipt|amount\s+due|subtotal)\b/i,
  /\b(?:purchase\s+order|statement\s+of\s+account|remittance\s+advice)\b/i,
];

function countDistinctMatches(text, keywords) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Validate extracted text to determine if it is a genuine resume or CV.
 *
 * @param {string} text - Raw or normalized text extracted from document.
 * @returns {Object} Validation result with boolean isValid, status code, actionable message, and diagnostic reason.
 */
function validateResumeContent(text) {
  if (typeof text !== "string") {
    return {
      isValid: false,
      score: 0,
      confidence: "none",
      code: "INVALID_RESUME_TEXT",
      reason: "unreadable_text",
      message: "We couldn't extract readable text. Please upload a text-based PDF.",
      disqualifiers: ["non_string_input"],
    };
  }

  const cleanText = text.trim();
  const nonSpaceLength = cleanText.replace(/\s+/g, "").length;
  const words = cleanText.split(/\s+/).filter(Boolean);

  if (nonSpaceLength < MIN_CHARACTERS || words.length < MIN_WORDS) {
    return {
      isValid: false,
      score: 0,
      confidence: "none",
      code: "INSUFFICIENT_RESUME_DATA",
      reason: "insufficient_content",
      message: "This document appears incomplete or doesn't contain enough resume-related information. Please check your file and try again.",
      disqualifiers: ["insufficient_length"],
    };
  }

  let score = 0;
  const matchedSignals = {
    contact: false,
    education: false,
    skills: false,
    experience: false,
    projects: false,
    summaryOrCertifications: false,
  };
  const disqualifiers = [];

  // Check Disqualifiers
  const isMarksheetOnly = MARKSHEET_PATTERNS.filter((p) => p.test(cleanText)).length >= 2;
  const isCertificateOnly = CERTIFICATE_PATTERNS.filter((p) => p.test(cleanText)).length >= 2;
  const isFinancialDoc = FINANCIAL_PATTERNS.some((p) => p.test(cleanText));

  if (isMarksheetOnly) disqualifiers.push("marksheet_signals");
  if (isCertificateOnly) disqualifiers.push("certificate_signals");
  if (isFinancialDoc) disqualifiers.push("financial_signals");

  // 1. Contact / Profile Signals (max 15 pts)
  let contactScore = 0;
  if (EMAIL_REGEX.test(cleanText)) contactScore += 5;
  if (PHONE_REGEX.test(cleanText)) contactScore += 5;
  if (PROFILE_LINKS_REGEX.test(cleanText)) contactScore += 5;
  if (contactScore > 0) matchedSignals.contact = true;
  score += contactScore;

  // 2. Education Signals (max 25 pts)
  let educationScore = 0;
  if (EDUCATION_SECTION_REGEX.test(cleanText)) educationScore += 10;
  if (DEGREE_REGEX.test(cleanText)) educationScore += 8;
  if (INSTITUTION_REGEX.test(cleanText)) educationScore += 4;
  if (ACADEMIC_CONTEXT_REGEX.test(cleanText)) educationScore += 3;
  educationScore = Math.min(25, educationScore);
  if (educationScore >= 7) matchedSignals.education = true;
  score += educationScore;

  // 3. Skills Signals (max 25 pts)
  let skillsScore = 0;
  if (SKILLS_SECTION_REGEX.test(cleanText)) skillsScore += 10;
  const distinctSkills = countDistinctMatches(cleanText, TECH_SKILLS_KEYWORDS);
  skillsScore += Math.min(15, distinctSkills * 3);
  skillsScore = Math.min(25, skillsScore);
  if (skillsScore >= 7) matchedSignals.skills = true;
  score += skillsScore;

  // 4. Experience Signals (max 25 pts)
  let experienceScore = 0;
  const hasExperienceHeader = EXPERIENCE_SECTION_REGEX.test(cleanText);
  const hasJobTitle = JOB_TITLE_REGEX.test(cleanText);
  if (hasExperienceHeader) experienceScore += 10;
  if (hasJobTitle && (hasExperienceHeader || DATE_RANGE_REGEX.test(cleanText))) experienceScore += 7;
  if (hasExperienceHeader && EMPLOYMENT_ACTION_REGEX.test(cleanText)) experienceScore += 4;
  if (hasExperienceHeader && DATE_RANGE_REGEX.test(cleanText)) experienceScore += 4;
  experienceScore = Math.min(25, experienceScore);
  if (experienceScore >= 10) matchedSignals.experience = true;
  score += experienceScore;

  // 5. Projects Signals (max 25 pts)
  let projectScore = 0;
  if (PROJECT_SECTION_REGEX.test(cleanText)) projectScore += 10;
  if (PROJECT_ACTION_REGEX.test(cleanText)) projectScore += 8;
  if (distinctSkills >= 2 && (PROJECT_SECTION_REGEX.test(cleanText) || EMPLOYMENT_ACTION_REGEX.test(cleanText))) {
    projectScore += 7;
  }
  projectScore = Math.min(25, projectScore);
  if (projectScore >= 7) matchedSignals.projects = true;
  score += projectScore;

  // 6. Summary / Certifications / Achievements (max 15 pts)
  let extraScore = 0;
  if (SUMMARY_SECTION_REGEX.test(cleanText)) extraScore += 5;
  if (CERTIFICATIONS_SECTION_REGEX.test(cleanText)) extraScore += 5;
  extraScore = Math.min(15, extraScore);
  if (extraScore > 0) matchedSignals.summaryOrCertifications = true;
  score += extraScore;

  // Count core resume pillar categories (Education, Skills, Experience, Projects)
  const corePillarsCount = [
    matchedSignals.education,
    matchedSignals.skills,
    matchedSignals.experience,
    matchedSignals.projects,
  ].filter(Boolean).length;

  // Specific Disqualification Checks
  // A. Certificate-only: Has certificate boilerplate, but lacks multi-pillar resume breadth
  if (isCertificateOnly && corePillarsCount <= 1) {
    return {
      isValid: false,
      score: Math.min(30, score),
      confidence: "none",
      code: "DOCUMENT_NOT_RESUME",
      reason: "certificate_only",
      message: "This document appears to be a certificate rather than a full resume. Please upload your resume or CV.",
      matchedSignals,
      disqualifiers,
    };
  }

  // B. Marksheet-only: Has marksheet/transcript boilerplate, but lacks projects/skills/experience
  if (isMarksheetOnly && !matchedSignals.skills && !matchedSignals.projects && !matchedSignals.experience) {
    return {
      isValid: false,
      score: Math.min(30, score),
      confidence: "none",
      code: "DOCUMENT_NOT_RESUME",
      reason: "marksheet_only",
      message: "This document appears to be a marksheet or transcript rather than a resume. Please upload your resume or CV.",
      matchedSignals,
      disqualifiers,
    };
  }

  // C. Financial document
  if (isFinancialDoc && corePillarsCount < 2) {
    return {
      isValid: false,
      score: 10,
      confidence: "none",
      code: "DOCUMENT_NOT_RESUME",
      reason: "not_a_resume",
      message: "This PDF doesn't appear to be a resume. Please upload your resume or CV.",
      matchedSignals,
      disqualifiers,
    };
  }

  // D. Contact-only, Zero Signals, or Insufficient Core Pillars Check
  // Cannot classify as a resume based on a name and email alone, or just the word "resume"
  if (corePillarsCount < 2) {
    if (score < 15 || (!matchedSignals.education && !matchedSignals.skills && !matchedSignals.experience && !matchedSignals.projects)) {
      return {
        isValid: false,
        score: Math.min(score, 20),
        confidence: "none",
        code: "DOCUMENT_NOT_RESUME",
        reason: "not_a_resume",
        message: "This PDF doesn't appear to be a resume. Please upload your resume or CV.",
        matchedSignals,
        disqualifiers: ["unrecognized_document_type"],
      };
    }
    return {
      isValid: false,
      score: Math.min(score, 32),
      confidence: "none",
      code: "INSUFFICIENT_RESUME_DATA",
      reason: "insufficient_content",
      message: "This document appears incomplete or doesn't contain enough resume-related information. Please check your file and try again.",
      matchedSignals,
      disqualifiers: ["insufficient_core_pillars"],
    };
  }

  // E. Score-based Decision
  if (score >= CONFIDENT_THRESHOLD) {
    return {
      isValid: true,
      score: Math.min(100, score),
      confidence: score >= 65 ? "high" : "moderate",
      code: "VALID_RESUME",
      reason: "valid",
      message: "Valid resume.",
      matchedSignals,
      disqualifiers: [],
    };
  }

  // F. Ambiguous boundary (32 <= score < 45)
  if (score >= AMBIGUOUS_THRESHOLD) {
    return {
      isValid: false,
      score,
      confidence: "low",
      code: "DOCUMENT_NOT_RESUME",
      reason: "ambiguous",
      message: "Could not confidently identify this as a resume. Please upload your resume or CV.",
      matchedSignals,
      disqualifiers: ["low_confidence_score"],
    };
  }

  // G. Definite non-resume
  return {
    isValid: false,
    score,
    confidence: "none",
    code: "DOCUMENT_NOT_RESUME",
    reason: "not_a_resume",
    message: "This PDF doesn't appear to be a resume. Please upload your resume or CV.",
    matchedSignals,
    disqualifiers: ["unrecognized_document_type"],
  };
}

module.exports = {
  validateResumeContent,
  MIN_CHARACTERS,
  MIN_WORDS,
  CONFIDENT_THRESHOLD,
  AMBIGUOUS_THRESHOLD,
};
