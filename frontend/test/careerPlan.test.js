import test from 'node:test'
import assert from 'node:assert/strict'

import {
  commitCareerGoal,
  createEmptyCareerPlanState,
  parseCareerPlanState,
} from '../src/careerPlan.js'

const selection = (roleId, title, reportId = 'report-1') => ({
  targetRoleId: roleId,
  targetRoleTitle: title,
  reportRef: {
    reportId,
    reportVersion: 1,
    catalogueVersion: '2026.1',
    profileVersion: '1.0',
  },
  relevance: { score: 72, matchedCriteriaCount: 4 },
})

test('invalid persisted data falls back to an empty plan', () => {
  assert.deepEqual(parseCareerPlanState('{not-json'), createEmptyCareerPlanState())
  assert.deepEqual(parseCareerPlanState({ schemaVersion: 1, history: 'invalid' }), createEmptyCareerPlanState())
})

test('first career-goal selection creates an active plan', () => {
  const result = commitCareerGoal(
    createEmptyCareerPlanState(),
    selection('data-analyst', 'Data Analyst'),
    { now: '2026-10-27T10:00:00.000Z', planId: 'plan-1' },
  )

  assert.equal(result.activePlan.targetRoleId, 'data-analyst')
  assert.equal(result.activePlan.status, 'active')
  assert.equal(result.activePlan.reportRef.reportId, 'report-1')
  assert.deepEqual(result.history, [])
})

test('reassessing the same goal refreshes its report without duplicating history', () => {
  const first = commitCareerGoal(
    createEmptyCareerPlanState(),
    selection('data-analyst', 'Data Analyst'),
    { now: '2026-10-27T10:00:00.000Z', planId: 'plan-1' },
  )
  const refreshed = commitCareerGoal(
    first,
    selection('data-analyst', 'Data Analyst', 'report-2'),
    { now: '2026-10-27T11:00:00.000Z' },
  )

  assert.equal(refreshed.activePlan.planId, 'plan-1')
  assert.equal(refreshed.activePlan.selectedAt, '2026-10-27T10:00:00.000Z')
  assert.equal(refreshed.activePlan.updatedAt, '2026-10-27T11:00:00.000Z')
  assert.equal(refreshed.activePlan.reportRef.reportId, 'report-2')
  assert.deepEqual(refreshed.history, [])
})

test('changing goals archives the previous plan instead of deleting it', () => {
  const first = commitCareerGoal(
    createEmptyCareerPlanState(),
    selection('data-analyst', 'Data Analyst'),
    { now: '2026-10-27T10:00:00.000Z', planId: 'plan-1' },
  )
  const changed = commitCareerGoal(
    first,
    selection('cloud-engineer', 'Cloud Engineer', 'report-2'),
    { now: '2026-10-27T12:00:00.000Z', planId: 'plan-2' },
  )

  assert.equal(changed.activePlan.targetRoleId, 'cloud-engineer')
  assert.equal(changed.history.length, 1)
  assert.equal(changed.history[0].targetRoleId, 'data-analyst')
  assert.equal(changed.history[0].status, 'superseded')
  assert.equal(changed.history[0].replacedAt, '2026-10-27T12:00:00.000Z')
})

test('a goal without a valid role or report reference is rejected', () => {
  assert.throws(
    () => commitCareerGoal(createEmptyCareerPlanState(), { targetRoleId: '' }),
    /valid target role/,
  )
})
