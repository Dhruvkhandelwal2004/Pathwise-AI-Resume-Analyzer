export const CAREER_PLAN_STORAGE_KEY = 'pathwise-career-plan-v1'

export function createEmptyCareerPlanState() {
  return {
    schemaVersion: 1,
    activePlan: null,
    history: [],
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isStoredPlan(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && isNonEmptyString(value.planId)
      && isNonEmptyString(value.targetRoleId)
      && isNonEmptyString(value.targetRoleTitle)
      && isNonEmptyString(value.selectedAt)
      && isNonEmptyString(value.updatedAt)
      && ['active', 'superseded'].includes(value.status)
      && value.reportRef
      && isNonEmptyString(value.reportRef.reportId)
      && Number.isInteger(value.reportRef.reportVersion)
      && value.reportRef.reportVersion > 0,
  )
}

export function parseCareerPlanState(rawValue) {
  try {
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.history)) {
      return createEmptyCareerPlanState()
    }
    if (parsed.activePlan !== null && !isStoredPlan(parsed.activePlan)) {
      return createEmptyCareerPlanState()
    }
    if (!parsed.history.every(isStoredPlan)) {
      return createEmptyCareerPlanState()
    }
    return {
      schemaVersion: 1,
      activePlan: parsed.activePlan,
      history: parsed.history,
    }
  } catch {
    return createEmptyCareerPlanState()
  }
}

function validateSelection(selection) {
  if (!selection || !isNonEmptyString(selection.targetRoleId) || !isNonEmptyString(selection.targetRoleTitle)) {
    throw new TypeError('A valid target role is required.')
  }
  if (!selection.reportRef || !isNonEmptyString(selection.reportRef.reportId)) {
    throw new TypeError('A valid analysis report reference is required.')
  }
  if (!Number.isInteger(selection.reportRef.reportVersion) || selection.reportRef.reportVersion < 1) {
    throw new TypeError('A positive report version is required.')
  }
}

export function commitCareerGoal(currentState, selection, options = {}) {
  validateSelection(selection)
  const state = parseCareerPlanState(currentState)
  const now = options.now ?? new Date().toISOString()
  const existing = state.activePlan
  const sameRole = existing?.targetRoleId === selection.targetRoleId
  const planId = sameRole
    ? existing.planId
    : (options.planId ?? globalThis.crypto?.randomUUID?.() ?? `career-plan-${Date.now()}`)

  const activePlan = {
    planId,
    targetRoleId: selection.targetRoleId,
    targetRoleTitle: selection.targetRoleTitle,
    reportRef: {
      reportId: selection.reportRef.reportId,
      reportVersion: selection.reportRef.reportVersion,
      catalogueVersion: selection.reportRef.catalogueVersion ?? null,
      profileVersion: selection.reportRef.profileVersion ?? null,
    },
    relevance: {
      score: Number.isFinite(selection.relevance?.score) ? selection.relevance.score : null,
      matchedCriteriaCount: Number.isInteger(selection.relevance?.matchedCriteriaCount)
        ? selection.relevance.matchedCriteriaCount
        : 0,
    },
    selectedAt: sameRole ? existing.selectedAt : now,
    updatedAt: now,
    status: 'active',
  }

  const history = sameRole || !existing
    ? state.history
    : [
        ...state.history,
        {
          ...existing,
          status: 'superseded',
          replacedAt: now,
        },
      ]

  return {
    schemaVersion: 1,
    activePlan,
    history,
  }
}
