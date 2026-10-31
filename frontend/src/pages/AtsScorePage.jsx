import React, { useEffect, useRef, useState } from 'react'
import {
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  UploadCloud,
  FileText,
  Sparkles,
  ListChecks,
  Info,
  Mail,
  Phone,
  MapPin,
  Globe,
  Link2,
  LayoutGrid,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'

import { normalizeContactUrl } from '../utils/contactLinks.js'
import { getDisplayedAtsScore } from '../utils/atsScoreDisplay.js'

function hasText(val) {
  return typeof val === 'string' && val.trim().length > 0
}

function getBarColorClass(score) {
  if (score >= 80) return 'is-emerald'
  if (score >= 50) return 'is-amber'
  return 'is-rose'
}

function ContactUrlPill({ icon: Icon, label, link, isCopied, onCopy }) {
  return (
    <div className="ag-contact-link-pill">
      <a
        className="ag-contact-link-anchor"
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${link.href}`}
      >
        <Icon size={14} aria-hidden="true" />
        <span className="ag-contact-link-label">{label}</span>
        <span className="ag-contact-link-url">{link.display}</span>
        <ExternalLink size={13} className="ag-contact-link-open-icon" aria-hidden="true" />
      </a>
      <button
        type="button"
        className="ag-contact-copy-button"
        onClick={() => onCopy(label, link.href)}
        aria-label={`Copy ${label} URL`}
        title={isCopied ? 'Copied' : `Copy ${label} URL`}
      >
        {isCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
    </div>
  )
}

export function AtsScorePage({
  resumeId,
  analysis,
  metadata,
  quality,
  onExploreCareers,
  onNewUpload,
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [expandedCriteria, setExpandedCriteria] = useState(() => {
    const initial = {}
    if (quality?.criteria) {
      quality.criteria.slice(0, 2).forEach((c) => {
        if (c.earned < c.weight) initial[c.id] = true
      })
    }
    return initial
  })
  const [showFullSections, setShowFullSections] = useState(false)
  const [copiedContactLink, setCopiedContactLink] = useState(null)
  const copyResetTimerRef = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(copyResetTimerRef.current)
  }, [])

  const score = quality?.score ?? 0
  const ats = quality?.atsCompatibility ?? {}
  const ratingLabel = ats.ratingLabel ?? (score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'NEEDS WORK')
  const ratingWord = ats.ratingWord ?? (score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'developing' : 'limited')
  const distortion = ats.distortionRisk ?? {
    level: 'none',
    title: 'No Distortion',
    subtitle: '(Excellent)',
    explanation: 'All extracted sections parsed cleanly without ambiguous fields.',
  }
  const standards = ats.globalStandards ?? [
    { id: 'phone-contact', label: 'Phone & Contact Format', status: 'passed' },
    { id: 'date-format', label: 'Date Format', status: 'passed' },
    { id: 'language-support', label: 'Language Support', status: 'passed' },
  ]
  const sectionBreakdown = ats.sectionBreakdown ?? []
  const activeSectionDetail = sectionBreakdown.find((s) => s.id === selectedSectionId) ?? null

  const radius = 68
  const circumference = 2 * Math.PI * radius
  const displayedScore = getDisplayedAtsScore(score)
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference

  const criteria = quality?.criteria ?? []
  const improvements = quality?.improvements ?? []
  const strengths = analysis?.strengths?.length ? analysis.strengths : (quality?.strengths ?? [])
  const contact = analysis?.contact ?? {}
  const linkedinLink = normalizeContactUrl(contact.linkedin, { linkedin: true })
  const portfolioLink = normalizeContactUrl(contact.website)

  const toggleCriterion = (id) => {
    setExpandedCriteria((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyContactLink = async (label, href) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = href
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }

      setCopiedContactLink(label)
      window.clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedContactLink(null)
      }, 1800)
    } catch {
      setCopiedContactLink(null)
    }
  }

  return (
    <div className="ag-page-1-shell">
      {/* Top Multi-Stop Gradient Accent Bar (Antigravity Image 1) */}
      <div className="ag-ats-top-gradient" aria-hidden="true" />

      {/* Top Header Region */}
      <header className="ag-ats-header">
        <div className="ag-ats-header-inner">
          <div className="ag-ats-title-group">
            <div className="ag-ats-icon-badge" aria-hidden="true">
              <LayoutGrid size={22} />
            </div>
            <div>
              <div className="ag-ats-title-row">
                <h1>ATS Analysis</h1>
                <span className="ag-ats-brand-pill">Pathwise Estimated Score · v{quality?.rubricVersion ?? '1.0.0'}</span>
              </div>
              <p className="ag-ats-subtitle">
                Deep dive into your resume&apos;s technical performance and deterministic evidence quality
              </p>
            </div>
          </div>

          <div className="ag-ats-header-actions">
            <button
              type="button"
              className="ag-btn-secondary"
              onClick={onNewUpload}
            >
              <UploadCloud size={16} />
              <span>Upload New PDF</span>
            </button>
            <button
              type="button"
              className="ag-btn-primary"
              onClick={onExploreCareers}
            >
              <span>Explore Matching Careers</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="ag-ats-main">
        {/* Hero Two-Column Grid: Score Gauge Card (Left) + Performance Summary Card (Right) */}
        <section className="ag-ats-hero-grid" aria-label="Overall ATS Score and Performance Summary">
          {/* Left Card: Circular Gradient Score Ring */}
          <div className="ag-ats-score-card">
            <div className="ag-ats-ring-wrapper">
              <svg width="176" height="176" viewBox="0 0 176 176" className="ag-ats-ring-svg">
                <defs>
                  <linearGradient id="agAtsRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="55%" stopColor="#0f7656" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="13"
                />
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  fill="none"
                  stroke="url(#agAtsRingGradient)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 88 88)"
                  className="ag-ats-ring-progress"
                />
              </svg>
              <div className="ag-ats-ring-center">
                <span className="ag-ats-ring-number">{displayedScore}</span>
                <span className="ag-ats-ring-sub">OUT OF 100</span>
              </div>
            </div>

            <div className={`ag-ats-rating-pill rating-${ratingLabel.toLowerCase().replace(/\s+/g, '-')}`}>
              {ratingLabel}
            </div>
          </div>

          {/* Right Card: Performance Summary + Distortion Risk & Global Standard Sub-cards */}
          <div className="ag-ats-summary-card">
            <div className="ag-ats-summary-heading">
              <Award size={20} className="ag-ats-award-icon" />
              <h2>Performance Summary</h2>
            </div>

            <p className="ag-ats-summary-copy">
              Your resume scored <strong>{displayedScore}/100</strong>. It is currently rated as{' '}
              <span className="ag-ats-rating-highlight">{ratingWord}</span>.{' '}
              {improvements.length > 0 ? (
                <>
                  There are <strong>{improvements.length} evidence or completeness opportunities</strong> across{' '}
                  {[...new Set(improvements.slice(0, 2).map((i) => i.section.toLowerCase()))].join(' and ')}{' '}
                  that can be strengthened for automated screening and human review.
                </>
              ) : (
                <>All configured text-completeness and evidence checks are well supported.</>
              )}
            </p>

            <div className="ag-ats-subcards-grid">
              {/* Sub-Card 1: Distortion Risk */}
              <div className="ag-ats-diagnostic-subcard">
                <span className="ag-subcard-eyebrow">DISTORTION RISK</span>
                <div className="ag-distortion-status">
                  {distortion.level === 'none' ? (
                    <CheckCircle2 size={18} className="ag-icon-emerald" />
                  ) : (
                    <AlertCircle size={18} className="ag-icon-amber" />
                  )}
                  <div>
                    <strong>{distortion.title}</strong>
                    <span className="ag-distortion-sub">{distortion.subtitle}</span>
                  </div>
                </div>
                <p className="ag-subcard-note">{distortion.explanation}</p>
              </div>

              {/* Sub-Card 2: Global Standard */}
              <div className="ag-ats-diagnostic-subcard">
                <span className="ag-subcard-eyebrow">GLOBAL STANDARD</span>
                <ul className="ag-standards-checklist">
                  {standards.map((std) => (
                    <li key={std.id} className={`std-item status-${std.status}`}>
                      {std.status === 'passed' ? (
                        <CheckCircle2 size={16} className="ag-icon-emerald" />
                      ) : std.status === 'unavailable' ? (
                        <Info size={16} className="ag-icon-slate" />
                      ) : (
                        <AlertCircle size={16} className="ag-icon-amber" />
                      )}
                      <span>{std.label}</span>
                      {std.status === 'unavailable' && (
                        <em className="std-unavailable-tag">Unavailable</em>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION BREAKDOWN (10-Tile Grid Matching Antigravity Image 1) */}
        <section className="ag-ats-breakdown-section" aria-label="Section Breakdown">
          <div className="ag-ats-breakdown-header">
            <h3 className="ag-ats-section-eyebrow">SECTION BREAKDOWN</h3>
            <span className="ag-ats-section-hint">Click any tile to inspect its evidence and scoring rule</span>
          </div>

          <div className="ag-ats-breakdown-grid">
            {sectionBreakdown.map((sec) => {
              const toneClass = getBarColorClass(sec.score)
              const isSelected = selectedSectionId === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  className={`ag-ats-tile ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSectionId(isSelected ? null : sec.id)}
                >
                  <div className="ag-ats-tile-top">
                    <span className="ag-ats-tile-label">{sec.label}</span>
                    <span className={`ag-ats-tile-score ${toneClass}`}>{sec.score}</span>
                  </div>
                  <div className="ag-ats-tile-track">
                    <div
                      className={`ag-ats-tile-fill ${toneClass}`}
                      style={{ width: `${sec.score}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {activeSectionDetail && (
            <div className="ag-ats-tile-drawer">
              <div className="ag-tile-drawer-top">
                <strong>{activeSectionDetail.label} — {activeSectionDetail.score}/100</strong>
                <button
                  type="button"
                  className="ag-drawer-close"
                  onClick={() => setSelectedSectionId(null)}
                >
                  Close
                </button>
              </div>
              <p>{activeSectionDetail.explanation}</p>
              {activeSectionDetail.evidence?.length > 0 && (
                <div className="ag-tile-drawer-evidence">
                  <span>Supporting resume evidence:</span>
                  <div className="ag-evidence-pills">
                    {activeSectionDetail.evidence.map((ev, idx) => (
                      <span key={idx} className="ag-evidence-pill">{ev}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Candidate Profile & Detected Skills Summary */}
        <section className="ag-ats-profile-card">
          <div className="ag-profile-top">
            <div className="ag-profile-identity">
              <div className="ag-profile-avatar">
                <FileText size={22} />
              </div>
              <div>
                <div className="ag-profile-name-row">
                  <h2>{analysis?.name || 'Candidate Resume'}</h2>
                  {metadata?.pageCount && (
                    <span className="ag-meta-chip">{metadata.pageCount} page{metadata.pageCount === 1 ? '' : 's'} extracted</span>
                  )}
                </div>
                <p className="ag-profile-summary">
                  {analysis?.professionalSummary || 'No professional summary section was found in the extracted resume text.'}
                </p>
              </div>
            </div>

            <div className="ag-contact-row">
              {hasText(contact.email) && <span className="ag-contact-pill"><Mail size={13} /> {contact.email}</span>}
              {hasText(contact.phone) && <span className="ag-contact-pill"><Phone size={13} /> {contact.phone}</span>}
              {hasText(contact.location) && <span className="ag-contact-pill"><MapPin size={13} /> {contact.location}</span>}
              {linkedinLink && (
                <ContactUrlPill
                  icon={Link2}
                  label="LinkedIn"
                  link={linkedinLink}
                  isCopied={copiedContactLink === 'LinkedIn'}
                  onCopy={copyContactLink}
                />
              )}
              {portfolioLink && (
                <ContactUrlPill
                  icon={Globe}
                  label="Portfolio"
                  link={portfolioLink}
                  isCopied={copiedContactLink === 'Portfolio'}
                  onCopy={copyContactLink}
                />
              )}
            </div>
          </div>

          <div className="ag-profile-skills-bar">
            <div className="ag-skills-header">
              <strong>Detected Explicit Skills ({analysis?.skills?.length ?? 0})</strong>
              <button
                type="button"
                className="ag-link-btn"
                onClick={() => setShowFullSections((prev) => !prev)}
              >
                <span>{showFullSections ? 'Hide Parsed Resume Sections' : 'Inspect Parsed Resume Sections'}</span>
                <ChevronDown size={15} className={showFullSections ? 'is-rotated' : ''} />
              </button>
            </div>
            <div className="ag-skills-chip-wrap">
              {(analysis?.skills ?? []).length > 0 ? (
                analysis.skills.map((skill) => (
                  <span key={skill} className="ag-skill-tag">{skill}</span>
                ))
              ) : (
                <span className="ag-empty-inline">No explicit skills list was found in this resume.</span>
              )}
            </div>
          </div>

          {showFullSections && (
            <div className="ag-parsed-sections-drawer">
              <div className="ag-parsed-col">
                <h4>Education ({analysis?.education?.length ?? 0})</h4>
                {(analysis?.education ?? []).map((edu, idx) => (
                  <div key={idx} className="ag-parsed-item">
                    <strong>{edu.degree || edu.fieldOfStudy || 'Education'}</strong>
                    <span>{[edu.institution, edu.startDate, edu.endDate].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
              <div className="ag-parsed-col">
                <h4>Experience ({analysis?.experience?.length ?? 0})</h4>
                {(analysis?.experience ?? []).map((exp, idx) => (
                  <div key={idx} className="ag-parsed-item">
                    <strong>{exp.title || 'Role'}</strong>
                    <span>{[exp.employer, exp.startDate, exp.endDate].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
                {(analysis?.experience ?? []).length === 0 && (
                  <p className="ag-empty-inline">No formal employment entries documented.</p>
                )}
              </div>
              <div className="ag-parsed-col">
                <h4>Projects ({analysis?.projects?.length ?? 0})</h4>
                {(analysis?.projects ?? []).map((proj, idx) => (
                  <div key={idx} className="ag-parsed-item">
                    <strong>{proj.name || 'Project'}</strong>
                    <span>{(proj.technologies ?? []).join(', ') || proj.description}</span>
                  </div>
                ))}
              </div>
              <div className="ag-parsed-col">
                <h4>Certifications ({analysis?.certifications?.length ?? 0})</h4>
                {(analysis?.certifications ?? []).length > 0 ? (
                  analysis.certifications.map((cert, idx) => (
                    <div key={`${cert.name || 'certification'}-${idx}`} className="ag-parsed-item">
                      <strong>{cert.name || 'Certificate'}</strong>
                      {(cert.issuer || cert.date) && (
                        <span>{[cert.issuer, cert.date].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="ag-empty-inline">No certificates were found in the extracted resume text.</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Key Strengths & Concise Recommendations (2-Column Grid) */}
        <section className="ag-ats-insights-grid">
          <div className="ag-ats-insight-card">
            <div className="ag-insight-header">
              <Sparkles size={18} className="ag-icon-emerald" />
              <div>
                <h3>Key Resume Strengths</h3>
                <p>Backed directly by extracted resume evidence</p>
              </div>
            </div>
            <ul className="ag-insight-list">
              {strengths.slice(0, 5).map((item, idx) => (
                <li key={idx} className="ag-insight-item is-strength">
                  <strong>{item.point}</strong>
                  {item.evidence && (
                    <p className="ag-insight-evidence">
                      Evidence: {Array.isArray(item.evidence) ? item.evidence.join(' · ') : item.evidence}
                    </p>
                  )}
                </li>
              ))}
              {strengths.length === 0 && (
                <li className="ag-empty-inline">Add project or skill details to unlock grounded strengths.</li>
              )}
            </ul>
          </div>

          <div className="ag-ats-insight-card">
            <div className="ag-insight-header">
              <ListChecks size={18} className="ag-icon-amber" />
              <div>
                <h3>Priority Improvement Opportunities</h3>
                <p>Highest-impact actions to increase your ATS compatibility score</p>
              </div>
            </div>
            <ul className="ag-insight-list">
              {improvements.slice(0, 5).map((imp, idx) => (
                <li key={idx} className="ag-insight-item is-improvement">
                  <div className="ag-imp-top">
                    <strong>{imp.action}</strong>
                    <span className="ag-imp-points">+{imp.pointsAvailable} pts</span>
                  </div>
                  <p className="ag-insight-evidence">{imp.section} · {imp.observation}</p>
                </li>
              ))}
              {improvements.length === 0 && (
                <li className="ag-empty-inline">All configured rubric rules are currently satisfied.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Expandable 100-Point Deterministic Rubric Breakdown */}
        <section className="ag-ats-rubric-section">
          <div className="ag-rubric-section-header">
            <div>
              <span className="ag-ats-section-eyebrow">TRANSPARENT 100-POINT RUBRIC</span>
              <h3>Category-Wise Score Breakdown</h3>
            </div>
            <span className="ag-rubric-sum-pill">Total: {displayedScore} / 100 pts</span>
          </div>

          <div className="ag-rubric-accordions">
            {criteria.map((criterion) => {
              const isOpen = Boolean(expandedCriteria[criterion.id])
              const isPassed = criterion.earned === criterion.weight
              return (
                <div key={criterion.id} className="ag-rubric-card">
                  <button
                    type="button"
                    className="ag-rubric-card-header"
                    onClick={() => toggleCriterion(criterion.id)}
                  >
                    <div className="ag-rubric-title-group">
                      <span className={`ag-status-dot ${isPassed ? 'is-emerald' : 'is-amber'}`} />
                      <div>
                        <h4>{criterion.label}</h4>
                        <p>{criterion.explanation}</p>
                      </div>
                    </div>
                    <div className="ag-rubric-right">
                      <span className="ag-rubric-pts">{criterion.earned} / {criterion.weight} pts</span>
                      <ChevronRight size={18} className={`ag-chevron ${isOpen ? 'is-open' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="ag-rubric-card-body">
                      <div className="ag-rules-grid">
                        {criterion.ruleResults.map((rule) => (
                          <div key={rule.ruleId} className={`ag-rule-box ${rule.passed ? 'is-passed' : 'is-unmet'}`}>
                            <div className="ag-rule-top">
                              <strong>{rule.label}</strong>
                              <span>{rule.earned}/{rule.possible} pts</span>
                            </div>
                            <p>{rule.explanation}</p>
                            {rule.evidence?.length > 0 && (
                              <small>Evidence: {rule.evidence.join(' · ')}</small>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="ag-ats-disclaimer-bar">
            <Info size={16} />
            <span>
              <strong>Transparency notice:</strong> {quality?.disclaimer ?? 'Pathwise calculates this estimated ATS compatibility score deterministically from extracted resume text. It is not an official score used by every ATS platform and does not evaluate visual PDF layout or fonts.'}
            </span>
          </div>
        </section>

        {/* Bottom Primary Navigation CTA Banner */}
        <section className="ag-ats-next-banner">
          <div>
            <span className="ag-next-eyebrow">NEXT STEP IN YOUR JOURNEY</span>
            <h3>Ready to see which career roles match your resume evidence?</h3>
            <p>Compare your extracted skills and projects against 21 approved career profiles and choose your target role.</p>
          </div>
          <button
            type="button"
            className="ag-btn-primary ag-btn-lg"
            onClick={onExploreCareers}
          >
            <span>Explore Matching Careers</span>
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  )
}
