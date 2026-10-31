import React, { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import {
  Search,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  X,
  LoaderCircle,
  Target,
  AlertCircle,
  User,
} from 'lucide-react'

const NODE_API = import.meta.env.VITE_NODE_API_URL ?? ''
const AUTO_MATCH_STORAGE_KEY = 'pathwise-auto-match-enabled-v3'
const AUTO_MATCH_APPLIED_PREFIX = 'pathwise-auto-match-applied-v2:'
const autoMatchedResumeIds = new Set()

function hasAppliedInitialAutoMatch(resumeId) {
  if (autoMatchedResumeIds.has(resumeId)) return true

  try {
    if (window.sessionStorage.getItem(`${AUTO_MATCH_APPLIED_PREFIX}${resumeId}`) === 'true') {
      autoMatchedResumeIds.add(resumeId)
      return true
    }
  } catch {
    // Fall back to the in-memory set when session storage is unavailable.
  }

  return false
}

function markInitialAutoMatchApplied(resumeId) {
  autoMatchedResumeIds.add(resumeId)
  try {
    window.sessionStorage.setItem(`${AUTO_MATCH_APPLIED_PREFIX}${resumeId}`, 'true')
  } catch {
    // The in-memory set still prevents repeated automatic selection this session.
  }
}

function readAutoMatchPreference() {
  if (typeof window === 'undefined') return true

  try {
    const savedPreference = window.localStorage.getItem(AUTO_MATCH_STORAGE_KEY)
    if (savedPreference === 'false') return false
    if (savedPreference === 'true') return true
  } catch {
    // Use the default when browser storage is unavailable.
  }

  return true
}

function saveAutoMatchPreference(isEnabled) {
  try {
    window.localStorage.setItem(AUTO_MATCH_STORAGE_KEY, String(isEnabled))
  } catch {
    // The toggle still works for the current render when storage is unavailable.
  }
}

function MiniScoreRing({ score, isActive }) {
  const radius = 19
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score ?? 0))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="ag-mini-ring">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={isActive ? '#cde5da' : '#e2e8f0'}
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#0f7656"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="ag-mini-ring-val">{clamped}</span>
    </div>
  )
}

function LargeMatchRing({ score }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score ?? 0))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="ag-large-match-ring">
      <div className="ag-large-ring-svg-wrap">
        <svg width="108" height="108" viewBox="0 0 108 108">
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="#0f7656"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 54 54)"
          />
        </svg>
        <span className="ag-large-ring-num">{clamped}</span>
      </div>
      <span className="ag-large-ring-caption">Total score</span>
    </div>
  )
}

export function CareerMatchingPage({
  resumeId,
  analysis,
  career,
  careerByRoleId = {},
  selectedRoleId,
  activePlan,
  roleLoading,
  roleError,
  onSelectRole,
  onBuildRoadmap,
  onBackToAts,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [autoMatch, setAutoMatch] = useState(readAutoMatchPreference)
  const initialAutoMatchAppliedRef = useRef(
    hasAppliedInitialAutoMatch(resumeId),
  )
  const [catalogueRoles, setCatalogueRoles] = useState([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [showUnmatchedTab, setShowUnmatchedTab] = useState(false)

  // Fetch approved catalogue profiles when search query changes
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCatalogueLoading(true)
      try {
        const res = await axios.get(`${NODE_API}/api/careers/roles`, {
          params: { query: searchQuery.trim(), limit: 25 },
          signal: controller.signal,
        })
        setCatalogueRoles(res.data.results ?? [])
      } catch (err) {
        if (err?.code !== 'ERR_CANCELED') {
          setCatalogueRoles([])
        }
      } finally {
        setCatalogueLoading(false)
      }
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery])

  // Merge benchmark role matches with searched catalogue roles
  const benchmarkByRoleId = useMemo(() => {
    const map = {}
    for (const match of career?.roleMatches ?? []) {
      map[match.roleId] = match
    }
    for (const [rId, cached] of Object.entries(careerByRoleId)) {
      if (cached?.selectedRoleMatch) {
        map[rId] = cached.selectedRoleMatch
      }
    }
    return map
  }, [career, careerByRoleId])

  const hasRoleMatch = Object.values(benchmarkByRoleId).some(
    (match) => Number.isFinite(match?.score) && match.score > 0,
  )
  const autoMatchActive = autoMatch && hasRoleMatch

  const categories = useMemo(() => {
    const set = new Set(['All'])
    catalogueRoles.forEach((r) => {
      if (r.category) set.add(r.category)
    })
    return Array.from(set)
  }, [catalogueRoles])

  const currentRoleId =
    selectedRoleId ||
    career?.selectedProfile?.roleId ||
    career?.strongestMatches?.[0]?.roleId ||
    'data-analyst'

  const displayedRoles = useMemo(() => {
    const baseList =
      catalogueRoles.length > 0
        ? catalogueRoles
        : (career?.roleMatches ?? []).map((m) => ({
            roleId: m.roleId,
            title: m.role,
            category: 'Core Track',
            relevantSkills: m.foundSkills?.map((s) => s.skill) ?? [],
          }))

    const filtered = baseList.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false
      }
      return true
    })

    const enriched = filtered.map((prof) => {
      const matchObj = benchmarkByRoleId[prof.roleId]
      const score = matchObj?.score ?? null
      const tags =
        prof.relevantSkills?.slice(0, 3) ??
        matchObj?.foundSkills?.slice(0, 3).map((s) => s.skill) ??
        ['Role Criteria', 'Evidence', 'Rubric']
      return {
        ...prof,
        score,
        tags,
      }
    })

    if (autoMatchActive) {
      enriched.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    } else {
      const selectedIndex = enriched.findIndex((role) => role.roleId === currentRoleId)
      if (selectedIndex > 0) {
        const [selectedRole] = enriched.splice(selectedIndex, 1)
        enriched.unshift(selectedRole)
      }
    }
    return enriched
  }, [
    catalogueRoles,
    career,
    benchmarkByRoleId,
    selectedCategory,
    autoMatchActive,
    currentRoleId,
  ])

  const bestMatchingRoleId = useMemo(() => {
    const bestRole = displayedRoles.reduce((currentBest, role) => {
      if (!currentBest) return role
      return (role.score ?? -1) > (currentBest.score ?? -1)
        ? role
        : currentBest
    }, null)
    return bestRole?.roleId ?? null
  }, [displayedRoles])

  useEffect(() => {
    if (!autoMatchActive || !bestMatchingRoleId || initialAutoMatchAppliedRef.current) {
      return
    }

    initialAutoMatchAppliedRef.current = true
    markInitialAutoMatchApplied(resumeId)
    if (bestMatchingRoleId !== currentRoleId) {
      onSelectRole(bestMatchingRoleId)
    }
  }, [autoMatchActive, bestMatchingRoleId, currentRoleId, onSelectRole, resumeId])

  const handleRoleSelection = (roleId) => {
    if (autoMatchActive && roleId !== currentRoleId) {
      saveAutoMatchPreference(false)
      setAutoMatch(false)
    }
    onSelectRole(roleId)
  }

  const handleAutoMatchToggle = () => {
    if (!hasRoleMatch) return
    const nextAutoMatch = !autoMatchActive
    saveAutoMatchPreference(nextAutoMatch)
    setAutoMatch(nextAutoMatch)

    if (
      nextAutoMatch &&
      bestMatchingRoleId &&
      bestMatchingRoleId !== currentRoleId
    ) {
      onSelectRole(bestMatchingRoleId)
    }
  }

  const activeCareerData = careerByRoleId[currentRoleId] ?? career
  const selectedProfile = activeCareerData?.selectedProfile ?? {
    roleId: currentRoleId,
    title: activeCareerData?.selectedRoleMatch?.role ?? 'Data Analyst',
    category: 'Data and AI',
    description: 'Deterministic career role evaluation based on your extracted resume evidence.',
  }
  const selectedMatch = activeCareerData?.selectedRoleMatch ??
    benchmarkByRoleId[currentRoleId] ?? {
      roleId: currentRoleId,
      role: selectedProfile.title,
      score: 0,
      categoryBreakdown: [],
      foundSkills: [],
      skillsNotFoundInResume: [],
      matchedCriteria: [],
      unmatchedCriteria: [],
    }

  // Compute 4 horizontal bar metrics for the Match Score card (matching Image 2)
  const breakdownMap = Object.fromEntries(
    (selectedMatch.categoryBreakdown ?? []).map((c) => [c.category, c])
  )
  const toPct = (catKey) => {
    const item = breakdownMap[catKey]
    if (!item || !item.possible) return 0
    return Math.round((item.earned / item.possible) * 100)
  }

  const subBars = [
    { label: 'Skills', value: toPct('coreSkills') },
    { label: 'Experience', value: toPct('experienceEvidence') },
    { label: 'Portfolio', value: toPct('projectEvidence') },
    { label: 'Keywords', value: toPct('supportingSkills') },
  ]

  const confidenceLabel =
    activeCareerData?.evidenceLevel === 'sufficient'
      ? 'High (Verified)'
      : activeCareerData?.evidenceLevel === 'limited'
        ? 'Moderate (Limited)'
        : 'Low (Sparse)'

  const topGap = selectedMatch.unmatchedCriteria?.[0]?.label ?? 'None — all criteria met'

  // Gather evidence quotes for Evidence Viewer (matching Image 2)
  const evidenceQuotes = useMemo(() => {
    const quotes = []
    for (const crit of selectedMatch.matchedCriteria ?? []) {
      for (const ev of crit.evidence ?? []) {
        const badge = ev.source?.startsWith('projects')
          ? 'Portfolio'
          : ev.source === 'skills'
            ? 'Skills'
            : 'CV'
        quotes.push({
          text: ev.text,
          reference: crit.label,
          badge,
        })
      }
    }
    if (quotes.length === 0) {
      ;(analysis?.projects ?? []).slice(0, 2).forEach((p) => {
        if (p.description) {
          quotes.push({
            text: p.description,
            reference: p.name || 'Project',
            badge: 'Portfolio',
          })
        }
      })
      ;(analysis?.experience ?? []).slice(0, 2).forEach((e) => {
        if (e.highlights?.[0]) {
          quotes.push({
            text: e.highlights[0],
            reference: e.title || 'Experience',
            badge: 'CV',
          })
        }
      })
    }
    return quotes.slice(0, 4)
  }, [selectedMatch, analysis])

  return (
    <div className="ag-page-2-canvas">
      <div className="ag-matcher-workspace">
        {/* Top Workspace Header Bar (Antigravity Image 2) */}
        <header className="ag-matcher-topbar">
          <div className="ag-matcher-brand">
            <button
              type="button"
              className="ag-back-icon-btn"
              onClick={onBackToAts}
              title="Back to Page 1: ATS Resume Score"
            >
              <ArrowLeft size={17} />
            </button>
            <h1>AI Resume &amp; Portfolio Matcher</h1>
          </div>

          <div className="ag-matcher-topbar-right">
            <div className="ag-analyzed-sources">
              <span>Analyzed sources:</span>
              <span className="ag-source-pill">CV</span>
              {(analysis?.projects?.length ?? 0) > 0 && (
                <span className="ag-source-pill">Portfolio</span>
              )}
            </div>
            <span className="ag-last-run">
              Rubric: <strong>v{selectedMatch.profileVersion ?? '1.0.0'}</strong>
            </span>
            <div className="ag-candidate-chip">
              <div className="ag-candidate-chip-avatar">
                <User size={14} />
              </div>
              <span>{analysis?.name || 'Candidate'}</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {/* Search & Filter Row (Antigravity Image 2) */}
        <div className="ag-matcher-toolbar">
          <div className="ag-toolbar-left">
            <div className="ag-matcher-search">
              <input
                type="search"
                placeholder="Search roles, skills, or domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search approved career roles"
              />
              {catalogueLoading || roleLoading ? (
                <LoaderCircle size={15} className="ag-spin" />
              ) : (
                <Search size={15} className="ag-search-ico" />
              )}
            </div>

            <div className="ag-filter-pills">
              <div className="ag-category-select-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by role category"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'Category: All (21)' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory !== 'All' && (
                <button
                  type="button"
                  className="ag-active-filter-chip"
                  onClick={() => setSelectedCategory('All')}
                >
                  <span>{selectedCategory}</span>
                  <X size={13} />
                </button>
              )}

              {activePlan?.targetRoleTitle && (
                <span className="ag-active-filter-chip is-goal">
                  <Target size={13} />
                  <span>Goal: {activePlan.targetRoleTitle}</span>
                </span>
              )}
            </div>
          </div>

          <div className={`ag-toolbar-right${hasRoleMatch ? '' : ' is-unavailable'}`}>
            <div className="ag-automatch-label">
              <span className="ag-automatch-title">
                <Sparkles size={13} /> Auto-match
              </span>
              <small>{hasRoleMatch ? 'Auto-rank jobs by your profile' : 'No matching roles found'}</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoMatchActive}
              aria-label={hasRoleMatch ? 'Auto-match roles' : 'Auto-match unavailable because no roles matched'}
              title={hasRoleMatch ? 'Auto-rank jobs by your profile' : 'No matching roles found'}
              disabled={!hasRoleMatch}
              className={`ag-toggle-switch ${autoMatchActive ? 'is-on' : ''}`}
              onClick={handleAutoMatchToggle}
            >
              <span className="ag-toggle-knob" />
            </button>
          </div>
        </div>

        {roleError && (
          <div className="ag-matcher-alert" role="alert">
            <AlertCircle size={16} />
            <span>{roleError}</span>
          </div>
        )}

        {/* Two-Column Split Workspace */}
        <div className="ag-matcher-split">
          {/* Left Column: Ranked Approved Role Cards */}
          <aside className="ag-matcher-role-list" aria-label="Approved Career Profiles">
            <div className="ag-role-list-header">
              <span className="ag-list-query-label">
                {searchQuery.trim() ? `"${searchQuery.trim()}"` : `"${selectedCategory === 'All' ? 'All Approved Roles' : selectedCategory}"`}
              </span>
              <span className="ag-list-sort-label">
                ⇅ {autoMatch ? 'Best match' : 'Selected role first'} ⌄
              </span>
            </div>

            <div className="ag-role-cards-scroll">
              {displayedRoles.map((roleItem) => {
                const isSelected = roleItem.roleId === currentRoleId
                const displayScore =
                  roleItem.roleId === currentRoleId
                    ? selectedMatch.score
                    : (roleItem.score ?? 0)
                return (
                  <button
                    key={roleItem.roleId}
                    type="button"
                    className={`ag-role-list-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleRoleSelection(roleItem.roleId)}
                  >
                    <div className="ag-role-card-top">
                      <MiniScoreRing score={displayScore} isActive={isSelected} />
                      <div className="ag-role-card-titles">
                        <h3>{roleItem.title}</h3>
                        <p>
                          Pathwise · {roleItem.category || 'Tech Profile'} ·{' '}
                          {roleItem.score !== null || isSelected ? 'Scored' : 'Click to score'}
                        </p>
                      </div>
                    </div>

                    <div className="ag-role-card-tags">
                      {(roleItem.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="ag-role-mini-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}

              {displayedRoles.length === 0 && !catalogueLoading && (
                <div className="ag-empty-roles">
                  <p>No approved job profile matched &ldquo;{searchQuery}&rdquo;.</p>
                  <button
                    type="button"
                    className="ag-btn-secondary"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('All')
                    }}
                  >
                    Reset search
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Selected Role Deep-Dive & Actions */}
          <section className="ag-matcher-inspector" aria-label="Selected Role Match Details">
            {/* Role Title & Primary Action Header */}
            <div className="ag-inspector-header">
              <div>
                <h2>
                  {selectedProfile.title}{' '}
                  <span className="ag-role-cat-paren">
                    ({selectedProfile.category || 'Approved Profile'})
                  </span>
                </h2>
                <p className="ag-inspector-sub">
                  Canonical ID: <code>{selectedProfile.roleId}</code> ·{' '}
                  {selectedProfile.description}
                </p>
              </div>

              <div className="ag-inspector-cta-group">
                <button
                  type="button"
                  className="ag-btn-outline"
                  onClick={onBackToAts}
                >
                  ATS Score
                </button>
                <button
                  type="button"
                  className="ag-btn-indigo"
                  disabled={roleLoading}
                  onClick={() => onBuildRoadmap(selectedProfile.roleId)}
                >
                  <span>Build My Skills Roadmap</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Inner 2-Column Inspector Grid */}
            <div className="ag-inspector-grid">
              {/* Left Sub-Column: Match Score Card + Strengths/Gaps for this role */}
              <div className="ag-inspector-left-col">
                <div className="ag-inspector-section-block">
                  <h3 className="ag-inspector-h3">Match score</h3>
                  <div className="ag-match-score-box">
                    <div className="ag-match-score-top">
                      <LargeMatchRing score={selectedMatch.score} />

                      <div className="ag-match-bars-list">
                        {subBars.map((bar) => (
                          <div key={bar.label} className="ag-match-bar-row">
                            <span className="ag-bar-label">{bar.label}</span>
                            <div className="ag-bar-track">
                              <div
                                className="ag-bar-fill"
                                style={{ width: `${bar.value}%` }}
                              />
                            </div>
                            <strong className="ag-bar-val">{bar.value}</strong>
                          </div>
                        ))}
                        <div className="ag-match-confidence-row">
                          <span className="ag-bar-label">Confidence</span>
                          <strong className="ag-confidence-val">{confidenceLabel}</strong>
                        </div>
                      </div>
                    </div>

                    <p className="ag-match-box-footnote">
                      Strongest alignment in{' '}
                      <strong>{selectedProfile.title}</strong> ({selectedMatch.matchedCriteria?.length ?? 0}{' '}
                      criteria supported). Biggest gap: <strong>{topGap}</strong>.
                    </p>
                  </div>
                </div>

                <div className="ag-inspector-section-block">
                  <div className="ag-strengths-tabs-header">
                    <h3 className="ag-inspector-h3">
                      {showUnmatchedTab ? 'Requirements not found in resume' : 'Strengths for this role'}
                    </h3>
                    <div className="ag-mini-tab-pills">
                      <button
                        type="button"
                        className={`ag-mini-tab ${!showUnmatchedTab ? 'is-active' : ''}`}
                        onClick={() => setShowUnmatchedTab(false)}
                      >
                        Supported ({selectedMatch.matchedCriteria?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        className={`ag-mini-tab ${showUnmatchedTab ? 'is-active' : ''}`}
                        onClick={() => setShowUnmatchedTab(true)}
                      >
                        Not Found ({selectedMatch.unmatchedCriteria?.length ?? 0})
                      </button>
                    </div>
                  </div>

                  <div className="ag-role-strengths-box">
                    {!showUnmatchedTab ? (
                      <ul className="ag-check-list">
                        {(selectedMatch.matchedCriteria ?? []).map((crit) => (
                          <li key={crit.criterionId}>
                            <Check size={15} className="ag-check-ico" />
                            <div>
                              <strong>{crit.label}</strong>
                              <span className="ag-crit-pts">+{crit.points} pts</span>
                            </div>
                          </li>
                        ))}
                        {(selectedMatch.matchedCriteria ?? []).length === 0 && (
                          <li className="ag-empty-check">
                            No direct resume evidence matched this role&apos;s criteria yet. Click &ldquo;Not Found&rdquo; or build your roadmap to close the gaps.
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="ag-unmatched-wrap">
                        <p className="ag-unmatched-disclaimer">
                          Not found in this resume; this does not mean you lack these skills.
                        </p>
                        <ul className="ag-check-list is-missing">
                          {(selectedMatch.unmatchedCriteria ?? []).map((item) => (
                            <li key={item.criterionId}>
                              <span className="ag-missing-dot" />
                              <div>
                                <strong>{item.label}</strong>
                                <span className="ag-crit-pts is-gap">+{item.pointsAvailable} pts available</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Sub-Column: Recommended Actions + Evidence Viewer */}
              <div className="ag-inspector-right-col">
                <div className="ag-inspector-section-block">
                  <h3 className="ag-inspector-h3">Recommended actions</h3>
                  <div className="ag-recommended-actions">
                    <button
                      type="button"
                      className="ag-action-row-btn is-primary-row"
                      onClick={() => onBuildRoadmap(selectedProfile.roleId)}
                    >
                      <span>Build My Skills Roadmap</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="ag-action-row-btn"
                      onClick={() => setShowUnmatchedTab(true)}
                    >
                      <span>Inspect missing role requirements ({selectedMatch.unmatchedCriteria?.length ?? 0})</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="ag-action-row-btn"
                      onClick={() => setShowUnmatchedTab(false)}
                    >
                      <span>View matched resume strengths ({selectedMatch.matchedCriteria?.length ?? 0})</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="ag-action-row-btn"
                      onClick={onBackToAts}
                    >
                      <span>Return to ATS Resume Score</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>

                <div className="ag-inspector-section-block">
                  <h3 className="ag-inspector-h3">Evidence viewer</h3>
                  <div className="ag-evidence-viewer">
                    {evidenceQuotes.length > 0 ? (
                      evidenceQuotes.map((quote, idx) => (
                        <blockquote key={idx} className="ag-evidence-quote">
                          <p>
                            &ldquo;{quote.text}&rdquo;{' '}
                            <span className="ag-quote-badge">{quote.badge}</span>
                          </p>
                        </blockquote>
                      ))
                    ) : (
                      <p className="ag-empty-evidence">
                        No direct excerpts matched this role yet. Select your target role to build a step-by-step project and skill plan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
