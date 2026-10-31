export const MAX_DISPLAYED_ATS_SCORE = 87

export function getDisplayedAtsScore(originalScore) {
  return Math.min(MAX_DISPLAYED_ATS_SCORE, Math.max(0, originalScore))
}
