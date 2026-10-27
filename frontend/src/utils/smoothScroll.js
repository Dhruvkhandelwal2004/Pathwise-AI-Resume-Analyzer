let cancelActiveScroll = null

const easeInOutCubic = (progress) => (
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
)

export function smoothScrollToPosition(targetTop, duration = 850) {
  cancelActiveScroll?.()

  const startTop = window.scrollY
  const finalTop = Math.max(0, targetTop)
  const distance = finalTop - startTop

  if (Math.abs(distance) < 1) return

  const root = document.documentElement
  const previousScrollBehavior = root.style.scrollBehavior
  let animationFrame = 0
  let cancelled = false
  const startedAt = performance.now()

  const cleanup = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    root.style.scrollBehavior = previousScrollBehavior
    if (cancelActiveScroll === cancel) cancelActiveScroll = null
  }

  const cancel = () => {
    cancelled = true
    cleanup()
  }

  const animate = (now) => {
    if (cancelled) return

    const progress = Math.min((now - startedAt) / duration, 1)
    root.style.scrollBehavior = 'auto'
    window.scrollTo(0, startTop + distance * easeInOutCubic(progress))

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(animate)
    } else {
      cleanup()
    }
  }

  cancelActiveScroll = cancel
  animationFrame = window.requestAnimationFrame(animate)
}

export function smoothScrollToElement(elementId, offset = 72) {
  const target = document.getElementById(elementId)
  if (!target) return

  const targetTop = target.getBoundingClientRect().top + window.scrollY - offset
  smoothScrollToPosition(targetTop)
}

export function smoothScrollToTop() {
  smoothScrollToPosition(0)
}
