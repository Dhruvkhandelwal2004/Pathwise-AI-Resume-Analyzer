import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  BookOpen,
  UploadCloud,
  ShieldCheck,
  Target,
  Gauge,
  Map,
} from 'lucide-react'

export function Navbar({
  activeTargetRole,
  isAnalyzed,
  isLoading = false,
  latestResumeId,
  activeRoleId = 'data-analyst',
  onNewUpload,
  onResetHome,
}) {
  return (
    <header className="enhancv-navbar">
      <div className={`navbar-container ${isAnalyzed ? 'is-analyzed' : 'is-landing'}`}>
        <div className="navbar-brand-group">
          <Link
            to="/"
            onClick={onResetHome}
            className="navbar-brand"
            aria-label="Pathwise Home"
          >
            <span className="brand-icon-wrapper">
              <BookOpen size={16} strokeWidth={2.2} />
            </span>
            <span className="brand-name">Pathwise</span>
          </Link>

          {!isLoading && isAnalyzed && latestResumeId && (
            <nav className="ag-step-nav" aria-label="Student journey steps">
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
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
                if (window.location.hash) {
                  window.history.replaceState(null, '', window.location.pathname)
                }
              }}
            >
              Overview
            </a>
            <a href="#features" className="pw-nav-link">Features</a>
            <a href="#how-it-works" className="pw-nav-link">How It Works</a>
            <a href="#modules" className="pw-nav-link">Core Modules</a>
            <a href="#faqs" className="pw-nav-link">FAQs</a>
          </nav>
        )}

        {!isLoading && (
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
