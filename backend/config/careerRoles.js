const {
  ADDITIONAL_CAREER_ROLES,
  CATALOGUE_VERSION,
} = require("./additionalCareerRoles");

const SKILL_SOURCES = [
  "skills",
  "projects.technologies",
  "projects.description",
  "projects.highlights",
  "experience.title",
  "experience.highlights",
  "education.details",
  "certifications.name",
];
const PROJECT_SOURCES = [
  "projects.name",
  "projects.description",
  "projects.technologies",
  "projects.highlights",
];
const EXPERIENCE_SOURCES = ["experience.title", "experience.highlights"];
const EXPERIENCE_HIGHLIGHT_SOURCES = ["experience.highlights"];
const EDUCATION_SOURCES = [
  "education.degree",
  "education.fieldOfStudy",
  "education.details",
];
const CERTIFICATION_SOURCES = [
  "certifications.name",
  "certifications.issuer",
];

const ALLOWED_EVIDENCE_SOURCES = [
  "skills",
  "projects.name",
  "projects.description",
  "projects.technologies",
  "projects.highlights",
  "experience.title",
  "experience.highlights",
  "education.degree",
  "education.fieldOfStudy",
  "education.details",
  "certifications.name",
  "certifications.issuer",
];

function criterion(id, label, category, kind, weight, aliases, sources, prerequisiteCriterionIds = []) {
  return { id, label, category, kind, weight, aliases, sources, prerequisiteCriterionIds };
}

const LEGACY_CAREER_ROLES = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    criteria: [
      criterion("sql", "SQL", "coreSkills", "skill", 12, ["sql", "mysql", "postgresql", "postgres", "sqlite", "sql server", "t sql"], SKILL_SOURCES),
      criterion("python-r", "Python or R", "coreSkills", "skill", 10, ["python", "r", "r programming", "r language"], SKILL_SOURCES),
      criterion("spreadsheets", "Excel or spreadsheets", "coreSkills", "skill", 8, ["excel", "microsoft excel", "google sheets", "spreadsheet", "spreadsheets"], SKILL_SOURCES),
      criterion("bi-tools", "Power BI or Tableau", "coreSkills", "skill", 8, ["power bi", "powerbi", "tableau", "looker", "data visualization", "data visualisation"], SKILL_SOURCES),
      criterion("statistics", "Statistics", "coreSkills", "skill", 7, ["statistics", "statistical analysis", "hypothesis testing", "regression analysis"], SKILL_SOURCES),
      criterion("pandas-numpy", "Pandas or NumPy", "supportingSkills", "skill", 5, ["pandas", "numpy"], SKILL_SOURCES),
      criterion("data-cleaning", "Data cleaning or ETL", "supportingSkills", "skill", 5, ["data cleaning", "data cleansing", "data preprocessing", "etl", "extract transform load"], SKILL_SOURCES),
      criterion("data-modeling", "Databases or data modelling", "supportingSkills", "skill", 5, ["relational database", "database design", "data modeling", "data modelling"], SKILL_SOURCES),
      criterion("analytics-project", "Relevant analytics project", "projectEvidence", "project", 10, ["dashboard", "data analysis", "data analytics", "analytics", "business intelligence", "reporting", "data visualization", "data visualisation", "exploratory data analysis", "etl"], PROJECT_SOURCES),
      criterion("analytics-project-tools", "Applied analytics tools in a project", "projectEvidence", "project", 5, ["python", "r", "sql", "pandas", "numpy", "excel", "power bi", "tableau"], PROJECT_SOURCES),
      criterion("analytics-role", "Relevant analytics role", "experienceEvidence", "experience", 10, ["data analyst", "analytics analyst", "business intelligence analyst", "reporting analyst", "business analyst", "data scientist"], EXPERIENCE_SOURCES),
      criterion("analytics-responsibilities", "Applied analytics responsibilities", "experienceEvidence", "experience", 5, ["data analysis", "analytics", "reporting", "dashboard", "etl", "sql", "python", "power bi", "tableau"], EXPERIENCE_HIGHLIGHT_SOURCES),
      criterion("analytics-education", "Related education", "educationCertifications", "education", 6, ["data science", "statistics", "mathematics", "economics", "computer science", "computer applications", "bca", "information technology"], EDUCATION_SOURCES),
      criterion("analytics-certification", "Related certification", "educationCertifications", "certification", 4, ["google data analytics", "data analytics certificate", "power bi certification", "tableau certification", "microsoft certified power bi"], CERTIFICATION_SOURCES),
    ],
  },
  {
    id: "java-developer",
    name: "Java Developer",
    criteria: [
      criterion("java", "Java", "coreSkills", "skill", 18, ["java", "java se", "java ee", "jakarta ee"], SKILL_SOURCES),
      criterion("oop", "Object-oriented programming", "coreSkills", "skill", 8, ["object oriented programming", "object oriented design", "oop"], SKILL_SOURCES),
      criterion("spring", "Spring or Spring Boot", "coreSkills", "skill", 10, ["spring", "spring boot", "spring mvc", "spring framework"], SKILL_SOURCES, ["java"]),
      criterion("java-persistence", "JPA, Hibernate, or SQL", "coreSkills", "skill", 5, ["jpa", "hibernate", "jdbc", "sql"], SKILL_SOURCES),
      criterion("java-rest", "REST APIs", "coreSkills", "skill", 4, ["rest api", "rest apis", "restful api", "restful services"], SKILL_SOURCES, ["java"]),
      criterion("java-build", "Maven or Gradle", "supportingSkills", "skill", 5, ["maven", "gradle"], SKILL_SOURCES),
      criterion("java-git", "Git", "supportingSkills", "skill", 4, ["git", "github", "gitlab", "version control"], SKILL_SOURCES),
      criterion("java-testing", "Java testing", "supportingSkills", "skill", 3, ["junit", "mockito", "testng", "unit testing"], SKILL_SOURCES, ["java"]),
      criterion("java-deployment", "Docker or cloud", "supportingSkills", "skill", 3, ["docker", "kubernetes", "aws", "azure", "google cloud"], SKILL_SOURCES),
      criterion("java-project", "Relevant Java project", "projectEvidence", "project", 10, ["java application", "java backend", "spring boot", "microservice", "microservices", "rest api"], PROJECT_SOURCES),
      criterion("java-project-tools", "Applied Java tools in a project", "projectEvidence", "project", 5, ["java", "spring", "hibernate", "jpa", "maven", "gradle"], PROJECT_SOURCES),
      criterion("java-role", "Relevant Java role", "experienceEvidence", "experience", 10, ["java developer", "java engineer", "backend developer", "backend engineer", "application developer"], EXPERIENCE_SOURCES),
      criterion("java-responsibilities", "Applied Java responsibilities", "experienceEvidence", "experience", 5, ["java", "spring", "microservice", "rest api", "hibernate", "jpa"], EXPERIENCE_HIGHLIGHT_SOURCES),
      criterion("java-education", "Related education", "educationCertifications", "education", 6, ["computer science", "computer applications", "bca", "information technology", "software engineering"], EDUCATION_SOURCES),
      criterion("java-certification", "Related certification", "educationCertifications", "certification", 4, ["oracle certified java", "java certification", "spring certification", "vmware spring professional"], CERTIFICATION_SOURCES),
    ],
  },
  {
    id: "web-full-stack-developer",
    name: "Web / Full Stack Developer",
    criteria: [
      criterion("javascript-typescript", "JavaScript or TypeScript", "coreSkills", "skill", 12, ["javascript", "java script", "js", "typescript", "ts"], SKILL_SOURCES),
      criterion("web-framework", "React, Angular, or Vue", "coreSkills", "skill", 10, ["react", "react js", "reactjs", "angular", "angular js", "vue", "vue js", "vuejs"], SKILL_SOURCES, ["javascript-typescript"]),
      criterion("html-css", "HTML and CSS", "coreSkills", "skill", 7, ["html", "html5", "css", "css3", "responsive design"], SKILL_SOURCES),
      criterion("web-backend", "Web backend development", "coreSkills", "skill", 9, ["node", "node js", "nodejs", "express", "express js", "django", "flask", "asp net", "laravel"], SKILL_SOURCES),
      criterion("web-rest", "REST APIs", "coreSkills", "skill", 7, ["rest api", "rest apis", "restful api", "restful services"], SKILL_SOURCES),
      criterion("web-database", "SQL or NoSQL databases", "supportingSkills", "skill", 5, ["sql", "mysql", "postgresql", "mongodb", "mongo db", "nosql", "firebase"], SKILL_SOURCES),
      criterion("web-git", "Git", "supportingSkills", "skill", 4, ["git", "github", "gitlab", "version control"], SKILL_SOURCES),
      criterion("web-testing", "Web testing", "supportingSkills", "skill", 3, ["jest", "vitest", "cypress", "playwright", "unit testing"], SKILL_SOURCES, ["javascript-typescript"]),
      criterion("web-deployment", "Deployment, Docker, or cloud", "supportingSkills", "skill", 3, ["docker", "vercel", "netlify", "aws", "azure", "google cloud", "deployment"], SKILL_SOURCES),
      criterion("web-project", "Relevant web project", "projectEvidence", "project", 10, ["web application", "web app", "website", "full stack", "frontend", "front end", "ecommerce", "e commerce", "portfolio", "dashboard"], PROJECT_SOURCES),
      criterion("web-project-tools", "Applied web tools in a project", "projectEvidence", "project", 5, ["javascript", "typescript", "react", "angular", "vue", "node", "express", "html", "css"], PROJECT_SOURCES),
      criterion("web-role", "Relevant web role", "experienceEvidence", "experience", 10, ["web developer", "full stack developer", "fullstack developer", "frontend developer", "front end developer", "backend web developer"], EXPERIENCE_SOURCES),
      criterion("web-responsibilities", "Applied web responsibilities", "experienceEvidence", "experience", 5, ["web application", "frontend", "front end", "backend", "rest api", "react", "node", "javascript"], EXPERIENCE_HIGHLIGHT_SOURCES),
      criterion("web-education", "Related education", "educationCertifications", "education", 6, ["computer science", "computer applications", "bca", "information technology", "software engineering", "web development"], EDUCATION_SOURCES),
      criterion("web-certification", "Related certification", "educationCertifications", "certification", 4, ["web development certificate", "full stack certification", "javascript certification", "react certification", "aws certified developer"], CERTIFICATION_SOURCES),
    ],
  },
  {
    id: "ai-automation-developer",
    name: "AI Automation Developer",
    criteria: [
      criterion("automation-python", "Python", "coreSkills", "skill", 12, ["python"], SKILL_SOURCES),
      criterion("llm-integration", "LLM or AI API integration", "coreSkills", "skill", 12, ["llm", "large language model", "openai api", "groq api", "anthropic api", "gemini api", "ai api"], SKILL_SOURCES),
      criterion("automation-workflows", "Automation and workflows", "coreSkills", "skill", 9, ["automation", "workflow automation", "automated workflow", "process automation"], SKILL_SOURCES),
      criterion("automation-prompting", "Prompt engineering", "coreSkills", "skill", 6, ["prompt engineering", "prompt design", "prompting"], SKILL_SOURCES),
      criterion("automation-rest", "REST APIs", "coreSkills", "skill", 6, ["rest api", "rest apis", "restful api", "api integration"], SKILL_SOURCES),
      criterion("ai-frameworks", "LangChain or LlamaIndex", "supportingSkills", "skill", 5, ["langchain", "llamaindex", "llama index"], SKILL_SOURCES),
      criterion("automation-rag", "RAG or vector databases", "supportingSkills", "skill", 4, ["rag", "retrieval augmented generation", "vector database", "pinecone", "chromadb", "chroma db", "weaviate"], SKILL_SOURCES),
      criterion("workflow-platforms", "n8n, Make, or Zapier", "supportingSkills", "skill", 3, ["n8n", "make com", "make automation", "zapier"], SKILL_SOURCES),
      criterion("automation-deployment", "Docker or cloud", "supportingSkills", "skill", 3, ["docker", "kubernetes", "aws", "azure", "google cloud"], SKILL_SOURCES),
      criterion("automation-project", "Relevant AI automation project", "projectEvidence", "project", 10, ["ai agent", "agentic", "automation", "automated workflow", "chatbot", "document processing", "rag", "llm application", "ai assistant"], PROJECT_SOURCES),
      criterion("automation-project-tools", "Applied AI automation tools in a project", "projectEvidence", "project", 5, ["python", "openai", "groq", "anthropic", "langchain", "llamaindex", "n8n", "zapier"], PROJECT_SOURCES),
      criterion("automation-role", "Relevant AI automation role", "experienceEvidence", "experience", 10, ["ai developer", "ai engineer", "automation developer", "automation engineer", "llm engineer", "machine learning engineer"], EXPERIENCE_SOURCES),
      criterion("automation-responsibilities", "Applied AI automation responsibilities", "experienceEvidence", "experience", 5, ["automation", "llm", "ai agent", "chatbot", "rag", "api integration", "workflow"], EXPERIENCE_HIGHLIGHT_SOURCES),
      criterion("automation-education", "Related education", "educationCertifications", "education", 6, ["artificial intelligence", "machine learning", "data science", "computer science", "computer applications", "bca", "information technology"], EDUCATION_SOURCES),
      criterion("automation-certification", "Related certification", "educationCertifications", "certification", 4, ["artificial intelligence certification", "machine learning certification", "generative ai certification", "llm certification", "ai automation certification"], CERTIFICATION_SOURCES),
    ],
  },
  {
    id: "prompt-engineer",
    name: "Prompt Engineer",
    criteria: [
      criterion("prompt-design", "Prompt design", "coreSkills", "skill", 15, ["prompt engineering", "prompt design", "prompting", "few shot prompting", "zero shot prompting"], SKILL_SOURCES),
      criterion("prompt-llm", "LLM APIs and platforms", "coreSkills", "skill", 10, ["llm", "large language model", "openai", "groq", "anthropic", "claude", "gemini"], SKILL_SOURCES),
      criterion("structured-output", "Structured outputs or JSON Schema", "coreSkills", "skill", 8, ["structured output", "structured outputs", "json schema", "json mode"], SKILL_SOURCES),
      criterion("prompt-evaluation", "Prompt evaluation and testing", "coreSkills", "skill", 7, ["prompt evaluation", "prompt testing", "llm evaluation", "evals", "a b testing"], SKILL_SOURCES),
      criterion("prompt-tools", "Context, tools, or function calling", "coreSkills", "skill", 5, ["context engineering", "function calling", "tool calling", "tool use", "system prompt"], SKILL_SOURCES),
      criterion("prompt-programming", "Python or JavaScript", "supportingSkills", "skill", 5, ["python", "javascript", "typescript"], SKILL_SOURCES),
      criterion("prompt-rag", "RAG or vector databases", "supportingSkills", "skill", 4, ["rag", "retrieval augmented generation", "vector database", "pinecone", "chromadb", "weaviate"], SKILL_SOURCES),
      criterion("prompt-automation", "Automation", "supportingSkills", "skill", 3, ["automation", "workflow automation", "n8n", "zapier"], SKILL_SOURCES),
      criterion("prompt-communication", "Documentation or communication", "supportingSkills", "skill", 3, ["technical writing", "documentation", "communication", "content design"], SKILL_SOURCES),
      criterion("prompt-project", "Relevant prompt or LLM project", "projectEvidence", "project", 10, ["prompt library", "prompt evaluation", "chatbot", "ai assistant", "ai agent", "rag", "structured extraction", "llm application"], PROJECT_SOURCES),
      criterion("prompt-project-tools", "Applied prompting tools in a project", "projectEvidence", "project", 5, ["prompt", "openai", "groq", "anthropic", "json schema", "function calling", "tool calling"], PROJECT_SOURCES),
      criterion("prompt-role", "Relevant prompt or conversational AI role", "experienceEvidence", "experience", 10, ["prompt engineer", "conversational ai", "llm engineer", "ai trainer", "conversation designer"], EXPERIENCE_SOURCES),
      criterion("prompt-responsibilities", "Applied prompting responsibilities", "experienceEvidence", "experience", 5, ["prompt", "llm", "chatbot", "evaluation", "function calling", "structured output"], EXPERIENCE_HIGHLIGHT_SOURCES),
      criterion("prompt-education", "Related education", "educationCertifications", "education", 6, ["artificial intelligence", "machine learning", "computer science", "computer applications", "bca", "linguistics", "communications"], EDUCATION_SOURCES),
      criterion("prompt-certification", "Related certification", "educationCertifications", "certification", 4, ["prompt engineering certification", "generative ai certification", "llm certification", "conversational ai certification"], CERTIFICATION_SOURCES),
    ],
  },
];

const LEGACY_ROLE_METADATA = {
  "data-analyst": {
    titleAliases: ["Data Analytics Specialist", "Reporting Analyst"],
    description: "Examines data, builds reports, and communicates evidence-based insights for decisions.",
    category: "Data and AI",
    relatedRoleIds: ["business-analyst", "product-analyst", "data-scientist"],
  },
  "java-developer": {
    titleAliases: ["Java Engineer", "Java Software Developer"],
    description: "Develops and maintains applications and services using Java and its enterprise ecosystem.",
    category: "Software Engineering",
    relatedRoleIds: ["backend-developer", "software-engineer"],
  },
  "web-full-stack-developer": {
    titleAliases: ["Full Stack Developer", "Full-Stack Engineer", "Web Application Developer"],
    description: "Builds complete web applications across browser interfaces, backend services, and data storage.",
    category: "Software Engineering",
    relatedRoleIds: ["frontend-developer", "backend-developer", "software-engineer"],
  },
  "ai-automation-developer": {
    titleAliases: ["AI Automation Engineer", "LLM Automation Developer"],
    description: "Builds AI-assisted workflows, integrations, agents, and automated business processes.",
    category: "Data and AI",
    relatedRoleIds: ["ai-engineer", "automation-engineer", "prompt-engineer"],
  },
  "prompt-engineer": {
    titleAliases: ["Prompt Designer", "LLM Prompt Engineer"],
    description: "Designs, evaluates, and documents prompts and structured interactions for language-model applications.",
    category: "Data and AI",
    relatedRoleIds: ["ai-engineer", "ai-automation-developer"],
  },
};

const LEGACY_ROLE_IDS = LEGACY_CAREER_ROLES.map((role) => role.id);
const CAREER_ROLES = [
  ...LEGACY_CAREER_ROLES.map((role) => ({
    ...role,
    title: role.name,
    ...LEGACY_ROLE_METADATA[role.id],
    profileVersion: "1.0.0",
    catalogueVersion: CATALOGUE_VERSION,
    scoringReady: true,
    featured: true,
    source: {
      name: "Pathwise original role configuration",
      reference: "Preserved legacy scoring profile.",
    },
  })),
  ...ADDITIONAL_CAREER_ROLES,
];
const ROLE_IDS = CAREER_ROLES.map((role) => role.id);

function normalizeAlias(alias) {
  return alias
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateCareerRoleConfig(roles = CAREER_ROLES) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error("Career role configuration must be a non-empty array.");
  }

  const roleIds = new Set();
  const searchableTitles = new Map();
  const allowedSources = new Set(ALLOWED_EVIDENCE_SOURCES);

  for (const role of roles) {
    if (!role.id || roleIds.has(role.id)) {
      throw new Error("Career role IDs must be present and unique.");
    }
    roleIds.add(role.id);

    if (
      !role.title ||
      role.name !== role.title ||
      !Array.isArray(role.titleAliases) ||
      !role.description ||
      !role.category ||
      !role.profileVersion ||
      !role.catalogueVersion ||
      role.scoringReady !== true ||
      !role.source?.name ||
      !role.source?.reference ||
      !Array.isArray(role.relatedRoleIds)
    ) {
      throw new Error(`Career role '${role.id}' is missing required catalogue metadata.`);
    }

    for (const title of [role.title, ...role.titleAliases]) {
      const normalizedTitle = normalizeAlias(title);
      if (!normalizedTitle || searchableTitles.has(normalizedTitle)) {
        throw new Error(`Career role title or alias '${title}' must resolve uniquely.`);
      }
      searchableTitles.set(normalizedTitle, role.id);
    }

    const criterionIds = new Set();
    const skillAliases = new Set();
    let totalWeight = 0;

    for (const item of role.criteria) {
      if (!item.id || criterionIds.has(item.id)) {
        throw new Error(`Criterion IDs must be unique for ${role.id}.`);
      }
      criterionIds.add(item.id);

      if (!Number.isInteger(item.weight) || item.weight <= 0) {
        throw new Error(`Criterion weights must be positive integers for ${role.id}.`);
      }
      totalWeight += item.weight;

      if (!Array.isArray(item.aliases) || item.aliases.length === 0) {
        throw new Error(`Every criterion must define aliases for ${role.id}.`);
      }

      if (!Array.isArray(item.sources) || item.sources.length === 0 || item.sources.some((source) => !allowedSources.has(source))) {
        throw new Error(`Every criterion must use approved evidence sources for ${role.id}.`);
      }

      if (!Array.isArray(item.prerequisiteCriterionIds)) {
        throw new Error(`Criterion prerequisites must be an array for ${item.id}.`);
      }

      const aliasesWithinCriterion = new Set();
      for (const alias of item.aliases) {
        const normalized = normalizeAlias(alias);
        if (!normalized || aliasesWithinCriterion.has(normalized)) {
          throw new Error(`Aliases must be non-empty and unique within ${item.id}.`);
        }
        aliasesWithinCriterion.add(normalized);

        if (item.kind === "skill") {
          if (skillAliases.has(normalized)) {
            throw new Error(`Equivalent skill alias '${alias}' appears in multiple criteria for ${role.id}.`);
          }
          skillAliases.add(normalized);
        }
      }
    }

    const criteriaById = new Map(role.criteria.map((item) => [item.id, item]));
    for (const item of role.criteria) {
      const uniquePrerequisites = new Set(item.prerequisiteCriterionIds);
      if (uniquePrerequisites.size !== item.prerequisiteCriterionIds.length) {
        throw new Error(`Criterion prerequisites must be unique for ${item.id}.`);
      }
      for (const prerequisiteId of item.prerequisiteCriterionIds) {
        if (prerequisiteId === item.id || !criteriaById.has(prerequisiteId)) {
          throw new Error(`Criterion prerequisite '${prerequisiteId}' is invalid for ${item.id}.`);
        }
      }
    }

    const visiting = new Set();
    const visited = new Set();
    function visitCriterion(criterionId) {
      if (visiting.has(criterionId)) {
        throw new Error(`Criterion prerequisites must not contain cycles for ${role.id}.`);
      }
      if (visited.has(criterionId)) return;
      visiting.add(criterionId);
      for (const prerequisiteId of criteriaById.get(criterionId).prerequisiteCriterionIds) {
        visitCriterion(prerequisiteId);
      }
      visiting.delete(criterionId);
      visited.add(criterionId);
    }
    for (const criterionId of criteriaById.keys()) visitCriterion(criterionId);

    if (totalWeight !== 100) {
      throw new Error(`Career role '${role.id}' must total exactly 100 points; received ${totalWeight}.`);
    }
  }

  for (const role of roles) {
    if (role.relatedRoleIds.some((roleId) => roleId === role.id || !roleIds.has(roleId))) {
      throw new Error(`Related role IDs must reference other valid profiles for ${role.id}.`);
    }
  }

  return true;
}

validateCareerRoleConfig();

module.exports = {
  ALLOWED_EVIDENCE_SOURCES,
  CAREER_ROLES,
  CATALOGUE_VERSION,
  LEGACY_ROLE_IDS,
  ROLE_IDS,
  validateCareerRoleConfig,
};
