import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_DISPLAYED_ATS_SCORE,
  getDisplayedAtsScore,
} from '../src/utils/atsScoreDisplay.js'

test('caps displayed ATS scores above 91 without changing lower scores', () => {
  for (const originalScore of [100, 98, 95, 93, 92]) {
    assert.equal(getDisplayedAtsScore(originalScore), 91)
  }

  assert.equal(getDisplayedAtsScore(91), 91)
  assert.equal(getDisplayedAtsScore(89), 89)
  assert.equal(getDisplayedAtsScore(75), 75)
  assert.equal(MAX_DISPLAYED_ATS_SCORE, 91)
})
