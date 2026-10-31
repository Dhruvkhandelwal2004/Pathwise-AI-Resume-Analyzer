export const MIN_ANALYSIS_LOADING_MS = 700
export const MIN_CACHED_ANALYSIS_LOADING_MS = 20_000
export const LOADING_PROGRESS_STAGE_ONE_MS = 800
export const LOADING_PROGRESS_PAUSE_END_MS = 1_300
export const LOADING_PROGRESS_COMPLETE_MS = 2_000
export const LOADING_PROGRESS_PAUSE_PERCENT = 38
export const LOADING_PROGRESS_HOLD_PERCENT = 68
export const ANALYSIS_LOADING_STEP_DURATION_MS = 800

export function getAnalysisProgressPercent(elapsedMs) {
  const elapsed = Math.max(0, elapsedMs)
  if (elapsed === 0) return 0
  if (elapsed < LOADING_PROGRESS_STAGE_ONE_MS) {
    return (elapsed / LOADING_PROGRESS_STAGE_ONE_MS) * LOADING_PROGRESS_PAUSE_PERCENT
  }
  if (elapsed < LOADING_PROGRESS_PAUSE_END_MS) {
    return LOADING_PROGRESS_PAUSE_PERCENT
  }
  if (elapsed < LOADING_PROGRESS_COMPLETE_MS) {
    const stageDuration = LOADING_PROGRESS_COMPLETE_MS - LOADING_PROGRESS_PAUSE_END_MS
    const stageProgress = (elapsed - LOADING_PROGRESS_PAUSE_END_MS) / stageDuration
    return LOADING_PROGRESS_PAUSE_PERCENT +
      stageProgress * (LOADING_PROGRESS_HOLD_PERCENT - LOADING_PROGRESS_PAUSE_PERCENT)
  }
  return LOADING_PROGRESS_HOLD_PERCENT
}

export function getAnalysisLoadingStep(elapsedMs) {
  return Math.min(
    Math.floor(Math.max(0, elapsedMs) / ANALYSIS_LOADING_STEP_DURATION_MS),
    2,
  )
}

export async function navigateAfterMinimumLoading({
  startedAt,
  resumeId,
  navigate,
  signal,
  minimumDurationMs = MIN_ANALYSIS_LOADING_MS,
  now = Date.now,
  sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration)),
}) {
  const remaining = Math.max(0, minimumDurationMs - (now() - startedAt))
  if (remaining > 0) await sleep(remaining)
  if (signal?.aborted) return false
  navigate(`/analysis/${resumeId}`)
  return true
}
