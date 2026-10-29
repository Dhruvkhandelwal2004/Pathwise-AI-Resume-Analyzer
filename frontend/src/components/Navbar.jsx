import React, { useEffect, useRef } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  UploadCloud,
  ShieldCheck,
  Target,
  Gauge,
  Map,
  XCircle,
} from 'lucide-react'
import {
  smoothScrollToElement,
  smoothScrollToTop,
} from '../utils/smoothScroll.js'

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

  const scrollToLandingSection = (event, sectionId) => {
    event.preventDefault()

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

        {!isLoading && !isAnalyzed && (
          <nav className="pw-landing-nav-links" aria-label="Landing page navigation">
            <a
              href="#overview"
              className="pw-nav-link"
              onClick={(event) => scrollToLandingSection(event, 'overview')}
            >
              Overview
            </a>
            <a href="#features" className="pw-nav-link" onClick={(event) => scrollToLandingSection(event, 'features')}>Features</a>
            <a href="#how-it-works" className="pw-nav-link" onClick={(event) => scrollToLandingSection(event, 'how-it-works')}>How It Works</a>
            <a href="#modules" className="pw-nav-link" onClick={(event) => scrollToLandingSection(event, 'modules')}>Core Modules</a>
            <a href="#faqs" className="pw-nav-link" onClick={(event) => scrollToLandingSection(event, 'faqs')}>FAQs</a>
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
    </header>
  )
}
