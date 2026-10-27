import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEmptySessionStore,
  getResumeSessionRecord,
  readSessionStore,
  saveResumeSessionRecord,
  updateResumeRoleState,
} from '../src/utils/sessionStore.js'

function createFakeStorage() {
  const map = new Map()
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

test('saves and retrieves a resume session record across route transitions', () => {
  const storage = createFakeStorage()
  const saved = saveResumeSessionRecord(
    {
      resumeId: 'analysis-report-101',
      analysis: { name: 'Aarav Sharma', skills: ['Python', 'SQL'] },
      metadata: { filename: 'aarav-resume.pdf', page_count: 1 },
      quality: { score: 78, label: 'Strong foundation' },
      career: {
        selectedProfile: { roleId: 'data-analyst', title: 'Data Analyst' },
      },
      selectedRoleId: 'data-analyst',
    },
    storage,
  )

  assert.equal(saved.resumeId, 'analysis-report-101')
  assert.equal(saved.selectedRoleId, 'data-analyst')

  const loaded = getResumeSessionRecord('analysis-report-101', storage)
  assert.equal(loaded.analysis.name, 'Aarav Sharma')
  assert.equal(loaded.quality.score, 78)
  assert.equal(loaded.selectedRoleId, 'data-analyst')
  assert.equal(loaded.careerByRoleId['data-analyst'].selectedProfile.title, 'Data Analyst')
  assert.equal(readSessionStore(storage).latestResumeId, 'analysis-report-101')
})

test('updates role-specific roadmap completion and student evidence without losing analysis', () => {
  const storage = createFakeStorage()
  saveResumeSessionRecord(
    {
      resumeId: 'analysis-report-202',
      analysis: { name: 'Meera Patel', skills: ['Java', 'Spring Boot'] },
      selectedRoleId: 'java-developer',
    },
    storage,
  )

  const updated = updateResumeRoleState(
    'analysis-report-202',
    'java-developer',
    {
      selectedRoleId: 'java-developer',
      completedStepIds: ['java-core', 'spring-boot'],
      studentEvidence: [{ criterionId: 'testing', status: 'claimed', note: 'Built JUnit suite' }],
    },
    storage,
  )

  assert.deepEqual(updated.completedStepIdsByRoleId['java-developer'], ['java-core', 'spring-boot'])
  assert.equal(updated.studentEvidenceByRoleId['java-developer'][0].criterionId, 'testing')
  assert.equal(updated.analysis.name, 'Meera Patel')
})

test('createEmptySessionStore returns valid schemaVersion 1 container', () => {
  const empty = createEmptySessionStore()
  assert.equal(empty.schemaVersion, 1)
  assert.equal(empty.latestResumeId, null)
  assert.deepEqual(empty.records, {})
})
