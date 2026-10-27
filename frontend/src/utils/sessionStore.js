export const SESSION_STORE_KEY = 'pathwise-session-store-v1'

let memoryFallback = {
  schemaVersion: 1,
  latestResumeId: null,
  records: {},
}

function getStorage(customStorage) {
  if (customStorage) return customStorage
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

export function createEmptySessionStore() {
  return {
    schemaVersion: 1,
    latestResumeId: null,
    records: {},
  }
}

export function clearSessionStore(customStorage) {
  const empty = createEmptySessionStore()
  memoryFallback = empty
  const storage = getStorage(customStorage)
  if (storage) {
    try {
      storage.removeItem(SESSION_STORE_KEY)
    } catch {
      // Ignore storage errors
    }
  }
  return empty
}

export function readSessionStore(customStorage) {
  const storage = getStorage(customStorage)
  try {
    const raw = storage ? storage.getItem(SESSION_STORE_KEY) : null
    if (!raw) return memoryFallback
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.records !== 'object' || !parsed.records) {
      return memoryFallback
    }
    memoryFallback = parsed
    return parsed
  } catch {
    return memoryFallback
  }
}

export function writeSessionStore(nextStore, customStorage) {
  const safeStore = {
    schemaVersion: 1,
    latestResumeId: nextStore?.latestResumeId ?? null,
    records: nextStore?.records && typeof nextStore.records === 'object' ? nextStore.records : {},
  }
  memoryFallback = safeStore
  const storage = getStorage(customStorage)
  if (storage) {
    try {
      storage.setItem(SESSION_STORE_KEY, JSON.stringify(safeStore))
    } catch {
      // In-memory store continues to work when sessionStorage quota is exceeded or disabled
    }
  }
  return safeStore
}

export function saveResumeSessionRecord(record, customStorage) {
  if (!record?.resumeId || !record?.analysis) {
    throw new TypeError('A valid resumeId and analysis object are required.')
  }
  const store = readSessionStore(customStorage)
  const existing = store.records[record.resumeId] ?? {}
  const merged = {
    resumeId: record.resumeId,
    reportVersion: record.reportVersion ?? existing.reportVersion ?? 1,
    analyzedAt: record.analyzedAt ?? existing.analyzedAt ?? new Date().toISOString(),
    analysis: record.analysis,
    metadata: record.metadata ?? existing.metadata ?? null,
    quality: record.quality !== undefined ? record.quality : (existing.quality ?? null),
    career: record.career !== undefined ? record.career : (existing.career ?? null),
    careerByRoleId: {
      ...(existing.careerByRoleId ?? {}),
      ...(record.careerByRoleId ?? {}),
      ...(record.career?.selectedProfile?.roleId
        ? { [record.career.selectedProfile.roleId]: record.career }
        : {}),
    },
    selectedRoleId:
      record.selectedRoleId !== undefined
        ? record.selectedRoleId
        : (existing.selectedRoleId ?? record.career?.selectedProfile?.roleId ?? null),
    studentEvidenceByRoleId: {
      ...(existing.studentEvidenceByRoleId ?? {}),
      ...(record.studentEvidenceByRoleId ?? {}),
    },
    completedStepIdsByRoleId: {
      ...(existing.completedStepIdsByRoleId ?? {}),
      ...(record.completedStepIdsByRoleId ?? {}),
    },
  }

  const nextStore = {
    schemaVersion: 1,
    latestResumeId: record.resumeId,
    records: {
      ...store.records,
      [record.resumeId]: merged,
    },
  }
  writeSessionStore(nextStore, customStorage)
  return merged
}

export function getResumeSessionRecord(resumeId, customStorage) {
  const store = readSessionStore(customStorage)
  if (resumeId && store.records[resumeId]) {
    return store.records[resumeId]
  }
  return null
}

export function updateResumeRoleState(resumeId, roleId, updates = {}, customStorage) {
  const existing = getResumeSessionRecord(resumeId, customStorage)
  if (!existing) return null

  const nextCareerByRoleId = { ...(existing.careerByRoleId ?? {}) }
  if (updates.careerResult && roleId) {
    nextCareerByRoleId[roleId] = updates.careerResult
  }

  const nextStudentEvidence = { ...(existing.studentEvidenceByRoleId ?? {}) }
  if (updates.studentEvidence && roleId) {
    nextStudentEvidence[roleId] = updates.studentEvidence
  }

  const nextCompletedSteps = { ...(existing.completedStepIdsByRoleId ?? {}) }
  if (Array.isArray(updates.completedStepIds) && roleId) {
    nextCompletedSteps[roleId] = updates.completedStepIds
  }

  return saveResumeSessionRecord(
    {
      ...existing,
      career: updates.careerResult ?? existing.career,
      selectedRoleId: updates.selectedRoleId !== undefined ? updates.selectedRoleId : existing.selectedRoleId,
      careerByRoleId: nextCareerByRoleId,
      studentEvidenceByRoleId: nextStudentEvidence,
      completedStepIdsByRoleId: nextCompletedSteps,
    },
    customStorage,
  )
}
