import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  UploadCloud,
  ShieldCheck,
  Target,
  Gauge,
  Map,
  Menu,
  X,
  XCircle,
} from 'lucide-react'
import {
  smoothScrollToElement,
  smoothScrollToTop,
} from '../utils/smoothScroll.js'

const LANDING_NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'modules', label: 'Core Modules' },
  { id: 'faqs', label: 'FAQs' },
]

export function Navbar({
  activeTargetRole,
  isAnalyzed,
  isLoading = false,
  latestResumeId,
  activeRoleId = 'data-analyst',
  onNewUpload,
  onNavigateHome,
  onCancelAnalysis,
}) {
  const location = useLocation()
  const stepNavRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const mobileMenuToggleRef = useRef(null)
  const [mobileMenuLocationKey, setMobileMenuLocationKey] = useState(null)
  const isLandingPage = !isAnalyzed && location.pathname === '/'
  const isMobileMenuOpen = isLandingPage && mobileMenuLocationKey === location.key

  useEffect(() => {
    const nav = stepNavRef.current
    if (!nav) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      const activeStep = nav.querySelector('.ag-step-link.is-active')
      if (!activeStep) return

      const navRect = nav.getBoundingClientRect()
      const activeRect = activeStep.getBoundingClientRect()
      const navStyles = window.getComputedStyle(nav)
      const leftInset = Number.parseFloat(navStyles.paddingLeft) || 0
      const rightInset = Number.parseFloat(navStyles.paddingRight) || 0
      const visibleLeft = navRect.left + leftInset
      const visibleRight = navRect.right - rightInset
      let nextScrollLeft = nav.scrollLeft

      if (activeRect.left < visibleLeft) {
        nextScrollLeft -= visibleLeft - activeRect.left
      } else if (activeRect.right > visibleRight) {
        nextScrollLeft += activeRect.right - visibleRight
      }

      if (nextScrollLeft !== nav.scrollLeft) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        nav.scrollTo({
          left: nextScrollLeft,
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      }
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [location.pathname, isAnalyzed, latestResumeId, activeRoleId])

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined

    const body = document.body
    const previousOverflow = body.style.overflow
    const previousOverscrollBehavior = body.style.overscrollBehavior
    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuRef.current?.querySelector('a')?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setMobileMenuLocationKey(null)
      window.requestAnimationFrame(() => mobileMenuToggleRef.current?.focus())
    }

    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      body.style.overflow = previousOverflow
      body.style.overscrollBehavior = previousOverscrollBehavior
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  const scrollToLandingSection = (event, sectionId) => {
    event.preventDefault()
    setMobileMenuLocationKey(null)

    if (sectionId === 'overview') {
      smoothScrollToTop()
    } else {
      smoothScrollToElement(sectionId)
    }

    const nextUrl = sectionId === 'overview'
      ? `${window.location.pathname}${window.location.search}`
      : `${window.location.pathname}${window.location.search}#${sectionId}`
    window.history.replaceState(null, '', nextUrl)
  }

  return (
    <header className="enhancv-navbar">
      <div className={`navbar-container ${isAnalyzed ? 'is-analyzed' : 'is-landing'}`}>
        <div className="navbar-brand-group">
          <Link
            to="/"
            onClick={onNavigateHome}
            className="navbar-brand"
            aria-label="Pathwise Home"
          >
            <span className="brand-icon-wrapper">
              <BookOpen size={16} strokeWidth={2.2} />
            </span>
            <span className="brand-name">Pathwise</span>
          </Link>

          {!isLoading && isAnalyzed && latestResumeId && (
            <nav ref={stepNavRef} className="ag-step-nav" aria-label="Student journey steps">
              <NavLink
                to={`/analysis/${latestResumeId}`}
                className={({ isActive }) => `ag-step-link ${isActive ? 'is-active' : ''}`}
              >
                <Gauge size={14} />
                <span>1. ATS Score</span>
              </NavLink>
              <span className="ag-step-sep" aria-hidden="true">→</span>
              <NavLink
                to={`/careers/${latestResumeId}`}
                className={({ isActive }) => `ag-step-link ${isActive ? 'is-active' : ''}`}
              >
                <Target size={14} />
                <span>2. Career Match</span>
              </NavLink>
              <span className="ag-step-sep" aria-hidden="true">→</span>
              <NavLink
                to={`/roadmap/${latestResumeId}/${activeRoleId}`}
                className={({ isActive }) => `ag-step-link ${isActive ? 'is-active' : ''}`}
              >
                <Map size={14} />
                <span>3. Skills Roadmap</span>
              </NavLink>
            </nav>
          )}

          {!isLoading && isAnalyzed && activeTargetRole && (
            <div className="navbar-role-pill" title={`Goal: ${activeTargetRole}`}>
              <Target size={14} className="pill-icon" />
              <span>Goal: <strong>{activeTargetRole}</strong></span>
            </div>
          )}
        </div>

        {!isLoading && isLandingPage && (
          <nav className="pw-landing-nav-links" aria-label="Landing page navigation">
            {LANDING_NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="pw-nav-link"
                onClick={(event) => scrollToLandingSection(event, item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {isLoading ? (
          <div className="navbar-actions navbar-loading-actions">
            <button
              type="button"
              className="navbar-cancel-analysis-button"
              onClick={onCancelAnalysis}
            >
              <XCircle size={16} />
              <span>Cancel Analysis</span>
            </button>
          </div>
        ) : (
          <div className="navbar-actions">
            {isAnalyzed ? (
              <>
                <div className="navbar-trust-badge">
                  <ShieldCheck size={15} />
                  <span>Private &amp; In-Memory</span>
                </div>

                <button
                  type="button"
                  className="navbar-cta-button"
                  onClick={onNewUpload}
                >
                  <UploadCloud size={16} />
                  <span>New Upload</span>
                </button>
              </>
            ) : (
              <>
                {isLandingPage && (
                  <button
                    ref={mobileMenuToggleRef}
                    type="button"
                    className="pw-mobile-nav-toggle"
                    onClick={() => setMobileMenuLocationKey(
                      isMobileMenuOpen ? null : location.key,
                    )}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="pathwise-mobile-navigation"
                    aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  >
                    {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
                  </button>
                )}
                <button
                  type="button"
                  className="pw-nav-btn-outline"
                  onClick={onNewUpload}
                >
                  <span className="pw-btn-text-desktop">Upload PDF</span>
                  <span className="pw-btn-text-mobile">Upload</span>
                </button>
                <button
                  type="button"
                  className="pw-nav-btn-solid"
                  onClick={onNewUpload}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isLandingPage && isMobileMenuOpen && (
        <>
          <button
            type="button"
            className="pw-mobile-nav-scrim"
            onClick={() => setMobileMenuLocationKey(null)}
            aria-label="Close navigation menu"
          />
          <nav
            ref={mobileMenuRef}
            id="pathwise-mobile-navigation"
            className="pw-mobile-nav-panel"
            aria-label="Mobile landing page navigation"
          >
            {LANDING_NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="pw-mobile-nav-link"
                onClick={(event) => scrollToLandingSection(event, item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </header>
  )
}
