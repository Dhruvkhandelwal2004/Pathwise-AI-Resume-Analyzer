const URL_WITH_SCHEME_PATTERN = /https?:\/\/[^\s<>"']+/i
const DOMAIN_URL_PATTERN = /(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i
const TRAILING_PUNCTUATION_PATTERN = /[),.;:]+$/

function extractUrlCandidate(value) {
  const trimmed = value.trim()
  const matchedUrl = trimmed.match(URL_WITH_SCHEME_PATTERN)?.[0]
    ?? trimmed.match(DOMAIN_URL_PATTERN)?.[0]

  return matchedUrl?.replace(TRAILING_PUNCTUATION_PATTERN, '') ?? null
}

export function normalizeContactUrl(value, { linkedin = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null

  const candidate = extractUrlCandidate(value)
  if (!candidate) return null

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`

  try {
    const parsed = new URL(withProtocol)
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.username || parsed.password || !hostname.includes('.')) return null
    if (linkedin && hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) {
      return null
    }

    return {
      href: parsed.href,
      display: parsed.href.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    }
  } catch {
    return null
  }
}
