import React, { useState, useMemo } from 'react'
import {
  Target,
  User,
  Search,
  Map,
  Wrench,
  Zap,
  ChevronRight,
  CheckCircle2,
  Check,
  ExternalLink,
  BookOpen,
  FolderGit2,
  ListChecks,
  AlertCircle,
  RotateCcw,
  Download,
  Sparkles,
} from 'lucide-react'
import {
  downloadRoadmapPdf,
  normalizeSkillRoadmapItem,
} from '../utils/roadmapPdfGenerator.js'

const SELF_ASSESSMENT_OPTIONS = [
  ['', 'Select self-assessment status...'],
  ['not-started', 'Not started'],
  ['learning', 'Currently learning'],
  ['practiced', 'Practiced in exercises'],
  ['can-demonstrate', 'Can demonstrate in a project'],
]

const STAGE_DEFINITIONS = [
  {
    id: 'stage-1',
    priority: 'high',
    badge: 'STAGE 1',
    title: 'Stage 1 — Learn the Essentials',
    subtitle: 'Focus on high-priority core skills and prerequisites first.',
  },
  {
    id: 'stage-2',
    priority: 'medium',
    badge: 'STAGE 2',
    title: 'Stage 2 — Practise and Build',
    subtitle: 'Apply your skills through hands-on exercises and practical projects.',
  },
  {
    id: 'stage-3',
    priority: 'low',
    badge: 'STAGE 3',
    title: 'Stage 3 — Prepare for Opportunities',
    subtitle: 'Improve your portfolio, cover optional specializations, and prepare for roles.',
  },
]

export function SkillsRoadmapPage({
  roleId,
  analysis,
  career,
  roleLoading = false,
  completedStepIds = [],
  onToggleStepComplete,
  onSaveStudentEvidence,
  onNavigateToRoles,
  onNavigateToAts,
  onNewUpload,
}) {
  const [activeSidebarTab, setActiveSidebarTab] = useState('roadmap')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [expandedIds, setExpandedIds] = useState(() => {
    const firstId = career?.targetRoleGap?.gaps?.[0]?.criterionId
    return firstId ? { [firstId]: true } : {}
  })
  const [studentInputs, setStudentInputs] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const gapReport = career?.targetRoleGap
  const roleTitle = gapReport?.role || career?.selectedProfile?.title || 'Selected Career Role'
  const roleScore = gapReport?.score ?? career?.selectedRoleMatch?.score ?? 0
  const rawGaps = useMemo(() => gapReport?.gaps ?? [], [gapReport])
  const demonstrated = useMemo(() => gapReport?.demonstratedCriteria ?? [], [gapReport])
  const completedSet = useMemo(() => new Set(completedStepIds), [completedStepIds])

  const normalizedSkills = useMemo(
    () =>
      rawGaps.map((gap, index) =>
        normalizeSkillRoadmapItem(gap, roleTitle, completedSet, studentInputs, index)
      ),
    [rawGaps, roleTitle, completedSet, studentInputs]
  )

  const filteredSkills = useMemo(() => {
    let list = normalizedSkills
    if (priorityFilter !== 'all') {
      list = list.filter((s) => s.priorityLevel === priorityFilter)
    }
    if (activeSidebarTab === 'projects') {
      const projectItems = list.filter((s) => s.kind === 'project' || s.practiceProject)
      if (projectItems.length > 0) list = projectItems
    }
    return list
  }, [normalizedSkills, priorityFilter, activeSidebarTab])

  const priorityCounts = useMemo(() => {
    return {
      all: normalizedSkills.length,
      high: normalizedSkills.filter((s) => s.priorityLevel === 'high').length,
      medium: normalizedSkills.filter((s) => s.priorityLevel === 'medium').length,
      low: normalizedSkills.filter((s) => s.priorityLevel === 'low').length,
    }
  }, [normalizedSkills])

  const visibleStages = useMemo(() => {
    return STAGE_DEFINITIONS.map((stage) => ({
      ...stage,
      items: filteredSkills.filter((s) => s.priorityLevel === stage.priority),
    })).filter(
      (stage) =>
        priorityFilter === 'all' ? stage.items.length > 0 : stage.priority === priorityFilter
    )
  }, [filteredSkills, priorityFilter])

  const completedCount = normalizedSkills.filter((s) => s.isCompleted).length

  const toggleExpand = (criterionId) => {
    setExpandedIds((prev) => ({ ...prev, [criterionId]: !prev[criterionId] }))
  }

  const updateInput = (criterionId, field, value) => {
    const existingGap = rawGaps.find((g) => g.criterionId === criterionId)
    setStudentInputs((prev) => ({
      ...prev,
      [criterionId]: {
        selfAssessment:
          prev[criterionId]?.selfAssessment ??
          existingGap?.studentProvided?.selfAssessment ??
          '',
        additionalEvidence:
          prev[criterionId]?.additionalEvidence ??
          existingGap?.studentProvided?.additionalEvidence ??
          '',
        [field]: value,
      },
    }))
  }

  const handleSaveContext = async (criterionId) => {
    const mergedMap = new Map()
    for (const gap of rawGaps) {
      if (gap.studentProvided?.selfAssessment || gap.studentProvided?.additionalEvidence) {
        mergedMap.set(gap.criterionId, {
          criterionId: gap.criterionId,
          ...(gap.studentProvided.selfAssessment
            ? { selfAssessment: gap.studentProvided.selfAssessment }
            : {}),
          ...(gap.studentProvided.additionalEvidence
            ? { additionalEvidence: gap.studentProvided.additionalEvidence }
            : {}),
        })
      }
    }
    for (const [cId, val] of Object.entries(studentInputs)) {
      const cleanEvidence = (val.additionalEvidence ?? '').trim()
      if (val.selfAssessment || cleanEvidence) {
        mergedMap.set(cId, {
          criterionId: cId,
          ...(val.selfAssessment ? { selfAssessment: val.selfAssessment } : {}),
          ...(cleanEvidence ? { additionalEvidence: cleanEvidence } : {}),
        })
      }
    }

    const payload = Array.from(mergedMap.values())
    if (payload.length === 0) return

    setSavingId(criterionId)
    setSaveError('')
    try {
      await onSaveStudentEvidence(payload)
    } catch {
      setSaveError('Could not save your self-assessment context. Please check your input and retry.')
    } finally {
      setSavingId(null)
    }
  }

  const handleDownloadPdf = async () => {
    setPdfError('')
    setIsDownloadingPdf(true)
    try {
      await Promise.resolve()
      downloadRoadmapPdf({
        roleId,
        analysis,
        career,
        completedStepIds,
        studentInputs,
      })
    } catch (err) {
      setPdfError(
        err?.message ||
          'Could not generate the Skills Roadmap PDF. Please ensure a valid career role is selected and try again.'
      )
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <div className="ag-page-3-shell">
      {/* Left Navigation Sidebar */}
      <aside className="ag-roadmap-sidebar" aria-label="Roadmap and analysis navigation">
        <div className="ag-sidebar-group">
          <span className="ag-sidebar-eyebrow">ANALYSIS</span>

          <button
            type="button"
            className="ag-sidebar-item"
            onClick={onNavigateToRoles}
          >
            <span className="ag-sidebar-icon-tile is-target">
              <Target size={17} />
            </span>
            <div className="ag-sidebar-item-copy">
              <strong>Role Match</strong>
              <small>Top best-fit roles</small>
            </div>
          </button>

          <button
            type="button"
            className="ag-sidebar-item"
            onClick={onNavigateToAts}
          >
            <span className="ag-sidebar-icon-tile is-user">
              <User size={17} />
            </span>
            <div className="ag-sidebar-item-copy">
              <strong>Recruiter POV</strong>
              <small>How they see you</small>
            </div>
          </button>

          <button
            type="button"
            className={`ag-sidebar-item ${activeSidebarTab === 'gaps' ? 'is-active' : ''}`}
            onClick={() => setActiveSidebarTab('gaps')}
          >
            <span className="ag-sidebar-icon-tile is-search">
              <Search size={17} />
            </span>
            <div className="ag-sidebar-item-copy">
              <strong>Skill Gaps</strong>
              <small>What&apos;s missing</small>
            </div>
          </button>

          <button
            type="button"
            className={`ag-sidebar-item ${activeSidebarTab === 'roadmap' ? 'is-active' : ''}`}
            onClick={() => setActiveSidebarTab('roadmap')}
          >
            <span className="ag-sidebar-icon-tile is-roadmap">
              <Map size={17} />
            </span>
            <div className="ag-sidebar-item-copy">
              <strong>Roadmap</strong>
              <small>3-stage action plan</small>
            </div>
          </button>

          <button
            type="button"
            className={`ag-sidebar-item ${activeSidebarTab === 'projects' ? 'is-active' : ''}`}
            onClick={() => setActiveSidebarTab('projects')}
          >
            <span className="ag-sidebar-icon-tile is-projects">
              <Wrench size={17} />
            </span>
            <div className="ag-sidebar-item-copy">
              <strong>Projects</strong>
              <small>Build to close gaps</small>
            </div>
          </button>
        </div>

        <hr className="ag-sidebar-divider" />

        <div className="ag-sidebar-group">
          <span className="ag-sidebar-eyebrow">TRACK GROWTH</span>

          <button
            type="button"
            className={`ag-sidebar-item is-growth ${activeSidebarTab === 'progress' ? 'is-active-purple' : ''}`}
            onClick={() => setActiveSidebarTab('progress')}
          >
            <span className="ag-sidebar-icon-tile is-bolt">
              <Zap size={17} />
            </span>
            <div className="ag-sidebar-item-copy is-purple">
              <strong>Progress Check</strong>
              <small>Before &amp; after</small>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="ag-roadmap-main">
        <div className="ag-roadmap-container">
          <span className="ag-roadmap-eyebrow">3-STAGE PREPARATION STRATEGY</span>

          <div className="ag-roadmap-header-row">
            <div>
              <h1>Your Step-by-Step Plan</h1>
              <p className="ag-roadmap-role-context">
                Target role: <strong>{roleTitle}</strong> ·{' '}
                Current resume evidence: <strong>{roleScore}/100</strong> ·{' '}
                <strong>{completedCount} of {normalizedSkills.length}</strong> skills completed in session
              </p>
            </div>

            <div className="ag-roadmap-header-actions">
              <div className="ag-roadmap-phase-count">
                <span>{filteredSkills.length} skills</span>
              </div>

              <button
                type="button"
                className="ag-download-pdf-btn"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf || roleLoading}
                aria-label={`Download ${roleTitle} skills roadmap as PDF`}
              >
                <Download size={16} />
                <span>
                  {isDownloadingPdf ? 'Generating PDF...' : 'Download Roadmap PDF'}
                </span>
              </button>
            </div>
          </div>

          {pdfError && (
            <div className="ag-matcher-alert" role="alert">
              <AlertCircle size={16} />
              <span>{pdfError}</span>
            </div>
          )}

          <hr className="ag-roadmap-header-rule" />

          {/* Stage / Priority Filter Bar */}
          <div className="ag-priority-filter-bar" role="tablist" aria-label="Filter roadmap by stage">
            <button
              type="button"
              className={`ag-priority-tab ${priorityFilter === 'all' ? 'is-selected' : ''}`}
              onClick={() => setPriorityFilter('all')}
            >
              All 3 Stages ({priorityCounts.all})
            </button>
            <button
              type="button"
              className={`ag-priority-tab is-high ${priorityFilter === 'high' ? 'is-selected' : ''}`}
              onClick={() => setPriorityFilter('high')}
            >
              Stage 1: Essentials — High ({priorityCounts.high})
            </button>
            <button
              type="button"
              className={`ag-priority-tab is-medium ${priorityFilter === 'medium' ? 'is-selected' : ''}`}
              onClick={() => setPriorityFilter('medium')}
            >
              Stage 2: Practise &amp; Build — Medium ({priorityCounts.medium})
            </button>
            <button
              type="button"
              className={`ag-priority-tab is-low ${priorityFilter === 'low' ? 'is-selected' : ''}`}
              onClick={() => setPriorityFilter('low')}
            >
              Stage 3: Opportunities — Low ({priorityCounts.low})
            </button>
          </div>

          {/* Progress Check Summary Banner when Progress Check tab is active */}
          {activeSidebarTab === 'progress' && (
            <section className="ag-progress-check-panel">
              <div className="ag-progress-check-left">
                <span className="ag-progress-tag">SESSION PROGRESS TRACKER</span>
                <h2>Before &amp; After Readiness for {roleTitle}</h2>
                <p>
                  Baseline Resume Score: <strong>{roleScore}/100</strong> ({demonstrated.length} skills already demonstrated).{' '}
                  Completed in Session: <strong>{completedCount} / {normalizedSkills.length}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="ag-btn-primary"
                onClick={onNewUpload}
              >
                <RotateCcw size={15} />
                <span>Upload Updated Resume to Re-Score</span>
              </button>
            </section>
          )}

          {/* Demonstrated Resume Strengths + Single Clear Evidence Note */}
          {(activeSidebarTab === 'gaps' || demonstrated.length > 0) && (
            <section className="ag-gaps-summary-strip">
              <div className="ag-gap-summary-col">
                <strong>Already in Your Resume ({demonstrated.length})</strong>
                <div className="ag-gap-pill-row">
                  {demonstrated.map((d) => (
                    <span key={d.criterionId} className="ag-demo-pill">
                      <CheckCircle2 size={13} /> {d.requirement}
                    </span>
                  ))}
                  {demonstrated.length === 0 && (
                    <span className="ag-muted-note">
                      No direct role criteria matched yet — start with Stage 1 below.
                    </span>
                  )}
                </div>
              </div>
              <p className="ag-missing-note-banner">
                Note: Skills in this roadmap were not detected in your uploaded PDF; this does not mean you lack the skill.
              </p>
            </section>
          )}

          {saveError && (
            <div className="ag-matcher-alert" role="alert">
              <AlertCircle size={16} />
              <span>{saveError}</span>
            </div>
          )}

          {/* 3-Stage Preparation Strategy Stack */}
          <div className="ag-stages-stack">
            {visibleStages.map((stage) => (
              <section key={stage.id} className="ag-stage-group">
                <div className="ag-stage-group-header">
                  <div>
                    <span className="ag-stage-badge">{stage.badge}</span>
                    <h2 className="ag-stage-heading">{stage.title}</h2>
                    <p className="ag-stage-subtitle">{stage.subtitle}</p>
                  </div>
                  <span className="ag-stage-count-pill">
                    {stage.items.length} {stage.items.length === 1 ? 'skill' : 'skills'}
                  </span>
                </div>

                <div className="ag-phase-cards-stack">
                  {stage.items.map((skill) => {
                    const isExpanded = Boolean(expandedIds[skill.criterionId])
                    const isCompleted = skill.isCompleted

                    return (
                      <article
                        key={skill.criterionId}
                        className={`ag-phase-card ${isExpanded ? 'is-expanded' : ''} ${isCompleted ? 'is-completed' : ''}`}
                      >
                        {/* Card Header */}
                        <div
                          className="ag-phase-card-header"
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpand(skill.criterionId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleExpand(skill.criterionId)
                            }
                          }}
                        >
                          <div className={`ag-phase-num-box ${isCompleted ? 'is-done' : ''}`}>
                            {isCompleted ? <Check size={18} /> : <span>{skill.stepNumber}</span>}
                          </div>

                          <div className="ag-phase-header-center">
                            <div className="ag-phase-week-row">
                              <span className={`ag-phase-priority-badge level-${skill.priorityLevel}`}>
                                Priority: {skill.priorityLabel}
                              </span>
                              {skill.status === 'partially-demonstrated' && (
                                <span className="ag-phase-partial-badge">Partially in resume</span>
                              )}
                              {skill.selfAssessment && (
                                <span className="ag-phase-self-badge">
                                  Self-assessed: {skill.selfAssessment}
                                </span>
                              )}
                            </div>
                            <h3 className="ag-phase-title">{skill.skillName}</h3>
                          </div>

                          <div className="ag-phase-header-right">
                            <ChevronRight
                              size={20}
                              className={`ag-phase-chevron ${isExpanded ? 'is-rotated' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Expanded Concise 6-Field Body */}
                        {isExpanded && (
                          <div className="ag-phase-card-body">
                            {/* 1. What to learn */}
                            <div className="ag-concise-learn-banner">
                              <Sparkles size={16} className="ag-learn-ico" />
                              <div>
                                <strong>What to learn:</strong>{' '}
                                <span>{skill.whatToLearn}</span>
                              </div>
                            </div>

                            <div className="ag-phase-details-grid">
                              {/* 2. Action steps (3-4 short bullets) */}
                              <div className="ag-phase-detail-col">
                                <h4>
                                  <ListChecks size={16} /> Action Steps
                                </h4>
                                <ol className="ag-ordered-steps">
                                  {skill.actionSteps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>

                              {/* 3. Practice/Project + 4. Resource + 5. Completion goal */}
                              <div className="ag-phase-detail-col">
                                <div className="ag-deliverable-card">
                                  <h4>
                                    <FolderGit2 size={16} /> Practice / Project
                                  </h4>
                                  <p>{skill.practiceProject}</p>
                                </div>

                                <div className="ag-resources-block">
                                  <h4>
                                    <BookOpen size={16} /> Verified Resource
                                  </h4>
                                  <div className="ag-single-resource">
                                    {skill.resource.url ? (
                                      <a
                                        href={skill.resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ag-resource-link"
                                      >
                                        <span>{skill.resource.title}</span>
                                        <small>({skill.resource.provider})</small>
                                        <ExternalLink size={12} />
                                      </a>
                                    ) : (
                                      <span className="ag-resource-text">
                                        {skill.resource.title}{' '}
                                        <small>({skill.resource.provider})</small>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="ag-completion-block">
                                  <h4>
                                    <CheckCircle2 size={16} /> Completion Goal
                                  </h4>
                                  <p className="ag-single-goal-text">{skill.completionGoal}</p>
                                </div>
                              </div>
                            </div>

                            {/* Session Progress & Self-Assessment Bar */}
                            <div className="ag-phase-progress-bar">
                              <label className="ag-complete-checkbox">
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={() => onToggleStepComplete(skill.criterionId)}
                                />
                                <span>
                                  {isCompleted
                                    ? 'Completed in this session'
                                    : 'Mark skill complete in session'}
                                </span>
                              </label>

                              <div className="ag-self-assessment-controls">
                                <select
                                  value={skill.selfAssessment}
                                  onChange={(e) =>
                                    updateInput(skill.criterionId, 'selfAssessment', e.target.value)
                                  }
                                  aria-label={`Self-assessment for ${skill.skillName}`}
                                >
                                  {SELF_ASSESSMENT_OPTIONS.map(([val, label]) => (
                                    <option key={val} value={val}>
                                      {label}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  maxLength={500}
                                  placeholder="Optional progress note..."
                                  value={skill.additionalEvidence}
                                  onChange={(e) =>
                                    updateInput(
                                      skill.criterionId,
                                      'additionalEvidence',
                                      e.target.value
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  className="ag-save-context-btn"
                                  disabled={savingId === skill.criterionId}
                                  onClick={() => handleSaveContext(skill.criterionId)}
                                >
                                  {savingId === skill.criterionId ? 'Saving...' : 'Save Note'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}

            {filteredSkills.length === 0 && (
              <div className="ag-all-met-card">
                <CheckCircle2 size={28} className="ag-icon-emerald" />
                <h3>All criteria for this stage are already supported!</h3>
                <p>
                  Your resume already documents direct evidence for these {roleTitle} skills, or you can switch stage tabs above to inspect other items.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
