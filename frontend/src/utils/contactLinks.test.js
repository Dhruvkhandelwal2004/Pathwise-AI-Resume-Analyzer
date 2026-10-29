import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeContactUrl } from './contactLinks.js'

test('normalizes LinkedIn links that omit a protocol', () => {
  assert.deepEqual(
    normalizeContactUrl('linkedin.com/in/dhruv-khandelwal', { linkedin: true }),
    {
      href: 'https://linkedin.com/in/dhruv-khandelwal',
      display: 'linkedin.com/in/dhruv-khandelwal',
    },
  )
})

test('extracts a complete portfolio URL from a labelled value', () => {
  assert.deepEqual(
    normalizeContactUrl('Portfolio: https://dhruv.example.dev/work'),
    {
      href: 'https://dhruv.example.dev/work',
      display: 'dhruv.example.dev/work',
    },
  )
})

test('rejects generic labels and non-LinkedIn domains', () => {
  assert.equal(normalizeContactUrl('LinkedIn', { linkedin: true }), null)
  assert.equal(normalizeContactUrl('https://example.com/profile', { linkedin: true }), null)
  assert.equal(normalizeContactUrl('Portfolio'), null)
})

test('rejects unsafe URL schemes', () => {
  assert.equal(normalizeContactUrl('javascript:alert(1)'), null)
  assert.equal(normalizeContactUrl('data:text/html,test'), null)
})
