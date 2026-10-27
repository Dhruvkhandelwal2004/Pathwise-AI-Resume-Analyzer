const {
  CAREER_ROLES,
  CATALOGUE_VERSION,
} = require("../config/careerRoles");

class CareerCatalogInputError extends Error {}

function normalizeRoleSearch(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function profileSummary(profile) {
  return {
    roleId: profile.id,
    title: profile.title,
    aliases: [...profile.titleAliases],
    description: profile.description,
    category: profile.category,
    profileVersion: profile.profileVersion,
    catalogueVersion: profile.catalogueVersion,
    scoringReady: profile.scoringReady,
    source: { ...profile.source },
    relevantSkills: profile.criteria
      .filter((criterion) => criterion.kind === "skill")
      .map((criterion) => criterion.label),
  };
}

function profileDetails(profile) {
  return {
    ...profileSummary(profile),
    relatedRoleIds: [...profile.relatedRoleIds],
    requirements: profile.criteria.map((criterion) => ({
      criterionId: criterion.id,
      label: criterion.label,
      category: criterion.category,
      kind: criterion.kind,
      weight: criterion.weight,
      prerequisiteCriterionIds: [...criterion.prerequisiteCriterionIds],
      evidenceSources: [...criterion.sources],
      evidenceExpectation:
        criterion.kind === "skill"
          ? "Explicit resume evidence in an approved skill, project, experience, education, or certification field."
          : `Explicit ${criterion.kind} evidence in the configured resume fields.`,
    })),
  };
}

function candidateRank(profile, normalizedQuery) {
  if (!normalizedQuery) return profile.featured ? 0 : 1;

  const title = normalizeRoleSearch(profile.title);
  const aliases = profile.titleAliases.map(normalizeRoleSearch);
  if (title === normalizedQuery) return 0;
  if (aliases.includes(normalizedQuery)) return 1;

  const queryTokens = normalizedQuery.split(" ");
  const titleTokens = title.split(" ");
  const aliasTokens = aliases.map((alias) => alias.split(" "));
  const matchesTokens = (candidateTokens) =>
    queryTokens.every((queryToken) =>
      candidateTokens.some((candidateToken) => candidateToken.startsWith(queryToken)),
    );

  if (matchesTokens(titleTokens)) return 2;
  if (aliasTokens.some(matchesTokens)) return 3;
  return null;
}

function searchCareerProfiles(query = "", limit = 10) {
  if (typeof query !== "string" || query.length > 80) {
    throw new CareerCatalogInputError("Invalid role search query.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new CareerCatalogInputError("Invalid role search limit.");
  }

  const normalizedQuery = normalizeRoleSearch(query);
  const matches = CAREER_ROLES
    .map((profile, catalogueOrder) => ({
      profile,
      catalogueOrder,
      rank: candidateRank(profile, normalizedQuery),
    }))
    .filter((entry) => entry.rank !== null)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.catalogueOrder - right.catalogueOrder ||
        left.profile.title.localeCompare(right.profile.title) ||
        left.profile.id.localeCompare(right.profile.id),
    )
    .slice(0, limit)
    .map((entry) => profileSummary(entry.profile));

  const suggestions = matches.length === 0
    ? CAREER_ROLES.filter((profile) => profile.featured).slice(0, 5).map(profileSummary)
    : [];

  return {
    catalogueVersion: CATALOGUE_VERSION,
    query: normalizedQuery,
    results: matches,
    suggestions,
  };
}

function getCareerProfile(roleId) {
  if (typeof roleId !== "string" || !roleId.trim()) {
    throw new CareerCatalogInputError("Invalid canonical role ID.");
  }
  const profile = CAREER_ROLES.find((role) => role.id === roleId);
  if (!profile || !profile.scoringReady) return null;

  const details = profileDetails(profile);
  details.relatedRoles = profile.relatedRoleIds
    .map((relatedId) => CAREER_ROLES.find((role) => role.id === relatedId))
    .filter(Boolean)
    .map(profileSummary);
  return details;
}

module.exports = {
  CareerCatalogInputError,
  getCareerProfile,
  normalizeRoleSearch,
  profileDetails,
  profileSummary,
  searchCareerProfiles,
};
