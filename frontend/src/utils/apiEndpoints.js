const PRODUCTION_API_URLS = {
  python: 'https://pathwise-python-api-dhruv.onrender.com',
  node: 'https://pathwise-node-api-dhruv.onrender.com',
}

function resolveApiUrl(configuredUrl, productionUrl) {
  const value = typeof configuredUrl === 'string' ? configuredUrl.trim() : ''
  if (value) {
    const isLoopbackUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(value)
    if (import.meta.env.DEV || !isLoopbackUrl) return value.replace(/\/+$/, '')
  }

  // Local development uses Vite's /api proxy; production uses the Render APIs.
  return import.meta.env.DEV ? '' : productionUrl
}

export const PYTHON_API = resolveApiUrl(
  import.meta.env.VITE_PYTHON_API_URL,
  PRODUCTION_API_URLS.python,
)

export const NODE_API = resolveApiUrl(
  import.meta.env.VITE_NODE_API_URL,
  PRODUCTION_API_URLS.node,
)
