import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAnalysisLoadingStep,
  getAnalysisProgressPercent,
  MIN_ANALYSIS_LOADING_MS,
  MIN_CACHED_ANALYSIS_LOADING_MS,
  LOADING_PROGRESS_COMPLETE_MS,
  LOADING_PROGRESS_PAUSE_END_MS,
  LOADING_PROGRESS_PAUSE_PERCENT,
  navigateAfterMinimumLoading,
} from '../src/utils/analysisLoading.js'

test('progress quickly advances to 38%, pauses during step two, then holds at 68%', () => {
  assert.equal(getAnalysisProgressPercent(0), 0)
  assert.ok(getAnalysisProgressPercent(400) > 0)
  assert.equal(getAnalysisProgressPercent(800), LOADING_PROGRESS_PAUSE_PERCENT)
  assert.equal(getAnalysisLoadingStep(900), 1)
  assert.equal(getAnalysisProgressPercent(1_000), LOADING_PROGRESS_PAUSE_PERCENT)
  assert.equal(getAnalysisLoadingStep(1_000), 1)
  assert.equal(getAnalysisProgressPercent(LOADING_PROGRESS_PAUSE_END_MS), LOADING_PROGRESS_PAUSE_PERCENT)
  assert.equal(getAnalysisLoadingStep(LOADING_PROGRESS_PAUSE_END_MS), 1)
  assert.equal(getAnalysisProgressPercent(1_650), 53)
  assert.equal(getAnalysisProgressPercent(LOADING_PROGRESS_COMPLETE_MS), 68)
  assert.equal(getAnalysisProgressPercent(12_000), 68)
})

test('staged progress is monotonic and never reaches 100%', () => {
  const samples = Array.from({ length: 300 }, (_, index) =>
    getAnalysisProgressPercent(index * 50),
  )
  for (let index = 1; index < samples.length; index += 1) {
    assert.ok(samples[index] >= samples[index - 1])
  }
  assert.ok(samples.every((progress) => progress < 100))
})

test('cache hits and fresh uploads share the same delayed dashboard navigation', async () => {
  for (const cacheStatus of ['persistent', 'fresh']) {
    const calls = []
    let currentTime = 0
    const didNavigate = await navigateAfterMinimumLoading({
      startedAt: 0,
      resumeId: `report-${cacheStatus}`,
      navigate: (path) => calls.push(path),
      minimumDurationMs: 20,
      now: () => currentTime,
      sleep: async (duration) => { currentTime += duration },
    })

    assert.equal(didNavigate, true)
    assert.deepEqual(calls, [`/analysis/report-${cacheStatus}`])
    assert.equal(currentTime, 20)
  }
})

test('slow analyses do not receive an additional artificial delay', async () => {
  const calls = []
  let slept = false
  const didNavigate = await navigateAfterMinimumLoading({
    startedAt: 0,
    resumeId: 'slow-report',
    navigate: (path) => calls.push(path),
    minimumDurationMs: 20,
    now: () => 100,
    sleep: async () => { slept = true },
  })

  assert.equal(didNavigate, true)
  assert.equal(slept, false)
  assert.deepEqual(calls, ['/analysis/slow-report'])
  assert.ok(MIN_ANALYSIS_LOADING_MS > 0)
})

test('fresh analyses retain the existing 700 ms minimum', async () => {
  const calls = []
  let currentTime = 0
  const didNavigate = await navigateAfterMinimumLoading({
    startedAt: 0,
    resumeId: 'fresh-report',
    navigate: (path) => calls.push(path),
    now: () => currentTime,
    sleep: async (duration) => { currentTime += duration },
  })

  assert.equal(didNavigate, true)
  assert.equal(currentTime, MIN_ANALYSIS_LOADING_MS)
  assert.equal(currentTime, 700)
  assert.deepEqual(calls, ['/analysis/fresh-report'])
})

test('cached analyses wait twenty seconds from upload start before dashboard navigation', async () => {
  const calls = []
  let currentTime = 0
  const didNavigate = await navigateAfterMinimumLoading({
    startedAt: 0,
    resumeId: 'cached-report',
    navigate: (path) => calls.push(path),
    minimumDurationMs: MIN_CACHED_ANALYSIS_LOADING_MS,
    now: () => currentTime,
    sleep: async (duration) => { currentTime += duration },
  })

  assert.equal(didNavigate, true)
  assert.equal(currentTime, 20_000)
  assert.equal(currentTime, MIN_CACHED_ANALYSIS_LOADING_MS)
  assert.deepEqual(calls, ['/analysis/cached-report'])
})

test('cached analyses that take over twenty seconds navigate as soon as results are ready', async () => {
  const calls = []
  let slept = false
  const didNavigate = await navigateAfterMinimumLoading({
    startedAt: 0,
    resumeId: 'slow-cached-report',
    navigate: (path) => calls.push(path),
    minimumDurationMs: MIN_CACHED_ANALYSIS_LOADING_MS,
    now: () => 22_000,
    sleep: async () => { slept = true },
  })

  assert.equal(didNavigate, true)
  assert.equal(slept, false)
  assert.deepEqual(calls, ['/analysis/slow-cached-report'])
})

test('canceled uploads do not navigate after the loading interval', async () => {
  const calls = []
  const didNavigate = await navigateAfterMinimumLoading({
    startedAt: 0,
    resumeId: 'canceled-report',
    navigate: (path) => calls.push(path),
    signal: { aborted: true },
    minimumDurationMs: 0,
    now: () => 0,
  })

  assert.equal(didNavigate, false)
  assert.deepEqual(calls, [])
})
