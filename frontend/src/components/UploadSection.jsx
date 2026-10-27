import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  Link2,
  FileText,
  X,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Clock,
  BarChart3,
  SlidersHorizontal,
  Send,
  Building2,
  GraduationCap,
  Users,
  Check,
} from 'lucide-react'

export function UploadDropzone({ onAnalyze, loading, onFileChange, initialMode = 'upload' }) {
  const [mode, setMode] = useState(initialMode)
  const [file, setFile] = useState(null)
  const [driveUrl, setDriveUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const pickFile = (candidate) => {
    if (candidate) {
      setFile(candidate)
      if (onFileChange) onFileChange(candidate)
    }
  }

  const submit = () => {
    if (mode === 'upload' && file) onAnalyze({ mode, file })
    if (mode === 'drive' && driveUrl.trim()) {
      onAnalyze({ mode, driveUrl: driveUrl.trim() })
    }
  }

  const ready = mode === 'upload' ? Boolean(file) : Boolean(driveUrl.trim())

  return (
    <div className="enhancv-upload-box card">
      <div className="upload-tabs-bar" role="tablist">
        <button
          type="button"
          className={`upload-tab ${mode === 'upload' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'upload'}
          onClick={() => setMode('upload')}
        >
          <UploadCloud size={16} />
          <span>Upload PDF</span>
        </button>
        <button
          type="button"
          className={`upload-tab ${mode === 'drive' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'drive'}
          onClick={() => setMode('drive')}
        >
          <Link2 size={16} />
          <span>Google Drive Link</span>
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          className={`enhancv-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pickFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => !file && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!file && (e.key === 'Enter' || e.key === ' ')) {
              inputRef.current?.click()
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => pickFile(e.target.files?.[0])}
            hidden
          />

          {file ? (
            <div className="dropzone-file-preview">
              <div className="file-icon-box">
                <FileText size={28} />
              </div>
              <div className="file-details">
                <strong>{file.name}</strong>
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB · Valid PDF</span>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                aria-label="Remove selected file"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="dropzone-empty-prompt">
              <div className="upload-cloud-icon">
                <UploadCloud size={30} />
              </div>
              <h4>Drag &amp; drop your resume PDF here</h4>
              <p>or click to browse from your device</p>
              <div className="dropzone-limits">
                <span>PDF only · Maximum 5 MB · In-memory processing</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="enhancv-drive-input-box">
          <label htmlFor="drive-url-field">Public Google Drive Share Link</label>
          <div className="drive-input-row">
            <Link2 size={18} className="drive-icon" />
            <input
              id="drive-url-field"
              type="url"
              placeholder="https://drive.google.com/file/d/FILE_ID/view"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
            />
          </div>
          <small className="drive-note">
            Ensure sharing permissions are set to “Anyone with the link can view”.
          </small>
        </div>
      )}

      <button
        type="button"
        className="enhancv-analyze-submit-btn"
        disabled={!ready || loading}
        onClick={submit}
      >
        <Sparkles size={17} />
        <span>{loading ? 'Analyzing resume evidence…' : 'Run Full Resume Audit'}</span>
      </button>

      <div className="enhancv-privacy-strip">
        <ShieldCheck size={15} />
        <span>Your resume is parsed in memory and never stored permanently.</span>
      </div>
    </div>
  )
}

export function UploadHeroSection({ onAnalyze, loading, onOpenUpload }) {
  const uploadBoxRef = useRef(null)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const scrollToUpload = () => {
    if (uploadBoxRef.current) {
      uploadBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (onOpenUpload) {
      onOpenUpload()
    }
  }

  const triggerUpload = () => {
    if (onOpenUpload) {
      onOpenUpload()
    } else {
      scrollToUpload()
    }
  }

  const featureHighlights = [
    {
      icon: FileText,
      title: 'PDF / Drive Link',
      desc: 'Upload any resume document',
    },
    {
      icon: Sparkles,
      title: 'AI Extraction',
      desc: 'Extract skills & projects automatically',
    },
    {
      icon: Clock,
      title: '100-Pt ATS Score',
      desc: 'Deterministic rubric evaluation',
    },
    {
      icon: BarChart3,
      title: 'Detailed Analytics',
      desc: 'Track career & skill-gap readiness',
    },
  ]

  const workflowSteps = [
    {
      num: '01',
      icon: UploadCloud,
      title: 'Upload',
      desc: 'Upload your resume in PDF format or paste a public Google Drive link.',
    },
    {
      num: '02',
      icon: Sparkles,
      title: 'Extract',
      desc: 'AI extracts skills, projects, and timeline first, with strict schema validation.',
    },
    {
      num: '03',
      icon: SlidersHorizontal,
      title: 'Score & Match',
      desc: 'Verify your 100-point ATS breakdown, section rules, and 21 career role matches.',
    },
    {
      num: '04',
      icon: Send,
      title: 'Build Roadmap',
      desc: 'Follow a personalized week-by-week learning and project roadmap instantly.',
    },
  ]

  const threeModuleCards = [
    {
      badge: 'ATS RESUME SCORING',
      tone: 'mint',
      title: 'Audit resumes with ease.',
      desc: 'Evaluate structure, measurable impact, and keyword readiness from a single dashboard.',
      bullets: [
        'Upload PDF or import via Google Drive link',
        'AI-powered extraction with strict schema fallback',
        '100-point deterministic rubric across 10 sections',
        'Distortion risk and global formatting checks',
        'Line-by-line resume evidence verification',
      ],
      cta: 'Explore ATS Scoring',
    },
    {
      badge: 'CAREER ROLE MATCHING',
      tone: 'cream',
      title: 'Match skills to 21 tech roles.',
      desc: 'Compare your verified resume evidence against curated industry career profiles.',
      bullets: [
        'Instant alignment scores across 21 career tracks',
        'Weighted scoring for skills, projects, and experience',
        'Transparent matched vs. missing requirement lists',
        'Direct resume quote and portfolio evidence viewer',
        'One-click target career role selection',
      ],
      cta: 'Try Career Matcher',
    },
    {
      badge: 'SKILLS ROADMAP',
      tone: 'sage',
      title: 'Focus on growth, we map the rest.',
      desc: 'Close every skill gap in a clean, structured, and distraction-free learning plan.',
      bullets: [
        'Topological priority ordering (High, Medium, Low)',
        'Ordered action points and hands-on practice tasks',
        'Portfolio deliverables with resume-writing guidance',
        'Verifiable learning resources and completion checks',
        'Track complete session progress and self-assessments',
      ],
      cta: 'Build Skills Roadmap',
    },
  ]

  const trustAudiences = [
    { icon: Building2, label: 'Colleges & Campuses' },
    { icon: GraduationCap, label: 'Coding Bootcamps' },
    { icon: BookOpen, label: 'Universities' },
    { icon: Users, label: 'Independent Job Seekers' },
  ]

  const faqs = [
    {
      q: 'What is Pathwise Resume Analyzer?',
      a: 'Pathwise Resume Analyzer is a free tool that instantly analyzes your resume and gives you an ATS score, section-by-section feedback, keyword suggestions, career role matching, and a personalized skills roadmap — helping you build a stronger resume and improve your chances of getting shortlisted for campus placements or your first job.',
    },
    {
      q: 'What is an ATS score and why does it matter?',
      a: 'ATS (Applicant Tracking System) is software that companies use to filter resumes before a human ever sees them. Your ATS score tells you how well your resume is optimized to pass these filters. A higher ATS score means better visibility to recruiters during campus placements and job applications.',
    },
    {
      q: 'How is my resume score calculated?',
      a: 'Your resume score is based on multiple factors — ATS compatibility, keyword relevance, completeness of sections like education, skills, projects, and summary, measurable impact, and overall formatting. Each factor contributes to your final score, along with actionable tips to improve it.',
    },
    {
      q: 'What kind of feedback will I get on my resume?',
      a: "You'll receive detailed, section-by-section feedback covering your summary, education, skills, projects, experience, and more. The Pathwise Resume Analyzer highlights what's working, what's missing, and exactly what to fix, so you know where to focus your efforts.",
    },
    {
      q: "I'm a fresher with no work experience. Will this tool still be useful for me?",
      a: '100%, this tool is built with freshers and students in mind! Pathwise Resume Analyzer helps you make the most of what you have — your education, projects, skills, and certifications — and guides you on how to present them in a way that resonates with recruiters and clears ATS systems.',
    },
    {
      q: 'How is this different from just having someone review my resume?',
      a: 'Unlike manual reviews, Pathwise Resume Analyzer gives you instant, unbiased, data-driven feedback based on what actually works with ATS systems and recruiters. No waiting, no guesswork — just a clear resume score and specific steps to improve.',
    },
    {
      q: 'Is my resume data safe and private?',
      a: 'Yes, your resume and personal data are processed securely on Pathwise. Your information is never shared with third parties or recruiters without your permission, and you stay in full control of your data at all times.',
    },
    {
      q: 'What file format should I upload my resume in, and can I re-upload after making changes?',
      a: 'Pathwise Resume Analyzer accepts resumes in PDF format (up to 10MB) or via a public Google Drive PDF link. After making the suggested edits, you can re-upload your updated resume anytime to track how your ATS score improves!',
    },
  ]

  return (
    <div className="pw-landing-page" id="overview">
      {/* 1. HERO SECTION */}
      <section className="pw-hero-section">
        <div className="pw-hero-bg-shape" aria-hidden="true" />
        <div className="pw-container pw-hero-grid">
          {/* Left Hero Copy */}
          <div className="pw-hero-copy">
            <div className="pw-pill-badge">
              <CheckCircle2 size={13} strokeWidth={2.4} />
              <span>SIMPLE · PRIVATE · POWERFUL</span>
            </div>

            <h1 className="pw-hero-title">
              Everything <br className="pw-br-desktop" />
              you need <br className="pw-br-desktop" />
              to run
              <br />
              <span className="pw-text-emerald">
                AI resume &amp;
                <br />
                career audits.
              </span>
            </h1>

            <p className="pw-hero-subtitle">
              Upload your resume PDF, extract verified evidence with AI, calculate a 100-point ATS score, match against 21 career roles, and follow a personalized skills roadmap from one platform.
            </p>

            <div className="pw-hero-actions">
              <button
                type="button"
                className="pw-btn-dark"
                onClick={triggerUpload}
              >
                <span>Start Free</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="pw-btn-light"
                onClick={scrollToUpload}
              >
                <span>Upload Resume</span>
              </button>
            </div>

            <div className="pw-hero-Split-checks">
              <span className="pw-mini-check">
                <CheckCircle2 size={14} /> Easy to use
              </span>
              <span className="pw-mini-check">
                <CheckCircle2 size={14} /> No setup required
              </span>
              <span className="pw-mini-check">
                <CheckCircle2 size={14} /> Built for job seekers
              </span>
            </div>
          </div>

          {/* Right Product / Dashboard Mockup Window */}
          <div className="pw-hero-mockup-wrap">
            <div className="pw-mockup-window">
              {/* Window Top Bar */}
              <div className="pw-window-topbar">
                <div className="pw-window-dots" aria-hidden="true">
                  <span className="dot-red" />
                  <span className="dot-amber" />
                  <span className="dot-green" />
                </div>
                <div className="pw-window-user">
                  <span className="pw-user-avatar">P</span>
                  <span>Candidate</span>
                </div>
              </div>

              {/* Window Body: Sidebar + Dashboard Content */}
              <div className="pw-window-body">
                <aside className="pw-mockup-sidebar">
                  <div className="pw-mockup-brand">
                    <span className="pw-mockup-brand-ico">
                      <BookOpen size={12} strokeWidth={2.3} />
                    </span>
                    <strong>Pathwise</strong>
                  </div>
                  <ul className="pw-mockup-nav">
                    <li className="is-active">Dashboard</li>
                    <li>ATS Score</li>
                    <li>Career Match</li>
                    <li>Skills Roadmap</li>
                    <li>Evidence Audit</li>
                    <li>Settings</li>
                  </ul>
                </aside>

                <div className="pw-mockup-main">
                  <div className="pw-mockup-header">
                    <div>
                      <h3>Dashboard</h3>
                      <p>Here is what is happening today.</p>
                    </div>
                    <span className="pw-mockup-date">Rubric v1.0</span>
                  </div>

                  {/* 4 Metric Cards */}
                  <div className="pw-mockup-stats-grid">
                    <div className="pw-mockup-stat-card">
                      <span className="pw-stat-ico">
                        <FileText size={13} />
                      </span>
                      <strong>90</strong>
                      <small>ATS Score</small>
                    </div>
                    <div className="pw-mockup-stat-card">
                      <span className="pw-stat-ico">
                        <CheckCircle2 size={13} />
                      </span>
                      <strong>21</strong>
                      <small>Career Tracks</small>
                    </div>
                    <div className="pw-mockup-stat-card">
                      <span className="pw-stat-ico">
                        <Users size={13} />
                      </span>
                      <strong>14</strong>
                      <small>Verified Skills</small>
                    </div>
                    <div className="pw-mockup-stat-card">
                      <span className="pw-stat-ico">
                        <BarChart3 size={13} />
                      </span>
                      <strong>92%</strong>
                      <small>Role Match</small>
                    </div>
                  </div>

                  {/* Bottom Split: Recent Role Audits + Performance Bars */}
                  <div className="pw-mockup-bottom-grid">
                    <div className="pw-mockup-list-card">
                      <div className="pw-mockup-card-head">
                        <strong>Top Role Matches</strong>
                        <span>View all</span>
                      </div>

                      <div className="pw-mockup-list-rows">
                        <div className="pw-mockup-row">
                          <div>
                            <strong>Data Analyst Track</strong>
                            <small>100-Pt Rubric · 8 Criteria</small>
                          </div>
                          <span className="pw-tag-published">Matched</span>
                        </div>
                        <div className="pw-mockup-row">
                          <div>
                            <strong>Full-Stack Engineer</strong>
                            <small>100-Pt Rubric · 7 Criteria</small>
                          </div>
                          <span className="pw-tag-published">Matched</span>
                        </div>
                        <div className="pw-mockup-row">
                          <div>
                            <strong>AI / ML Roadmap</strong>
                            <small>6 Phases · 12 Weeks</small>
                          </div>
                          <span className="pw-tag-draft">Draft</span>
                        </div>
                      </div>
                    </div>

                    <div className="pw-mockup-chart-card">
                      <div className="pw-mockup-card-head">
                        <strong>Performance</strong>
                      </div>
                      <div className="pw-mockup-bars" aria-hidden="true">
                        <span style={{ height: '42%' }} />
                        <span style={{ height: '55%' }} />
                        <span style={{ height: '66%' }} />
                        <span style={{ height: '76%' }} />
                        <span style={{ height: '86%' }} />
                        <span style={{ height: '96%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4-COLUMN FEATURE HIGHLIGHTS STRIP */}
      <section className="pw-feature-strip" id="features">
        <div className="pw-container pw-feature-strip-grid">
          {featureHighlights.map((item) => {
            const IconComponent = item.icon
            return (
              <div key={item.title} className="pw-strip-item">
                <span className="pw-strip-icon">
                  <IconComponent size={18} strokeWidth={2} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. HOW IT WORKS (4 STEPS + INLINE INTERACTIVE UPLOAD) */}
      <section className="pw-how-section" id="how-it-works">
        <div className="pw-container">
          <div className="pw-section-heading">
            <span className="pw-eyebrow-pill">HOW IT WORKS</span>
            <h2>From resume PDF to career roadmap in minutes.</h2>
            <p>A simple, evidence-backed workflow designed for students and job seekers.</p>
          </div>

          <div className="pw-steps-4-grid">
            {workflowSteps.map((step) => {
              const StepIcon = step.icon
              return (
                <div key={step.num} className="pw-step-col">
                  <span className="pw-step-num-badge">{step.num}</span>
                  <div className="pw-step-icon-row">
                    <StepIcon size={18} strokeWidth={2} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Interactive Upload Workspace */}
          <div className="pw-inline-upload-wrap" ref={uploadBoxRef} id="upload-workspace">
            <UploadDropzone onAnalyze={onAnalyze} loading={loading} />
          </div>
        </div>
      </section>

      {/* 4. 3-CARD CORE MODULES SECTION */}
      <section className="pw-modules-section" id="modules">
        <div className="pw-container">
          <div className="pw-modules-3-grid">
            {threeModuleCards.map((card) => (
              <article key={card.title} className={`pw-module-card tone-${card.tone}`}>
                <span className={`pw-module-badge tone-${card.tone}`}>{card.badge}</span>
                <h3>{card.title}</h3>
                <p className="pw-module-desc">{card.desc}</p>

                <ul className="pw-module-checklist">
                  {card.bullets.map((point) => (
                    <li key={point}>
                      <span className="pw-check-circle">
                        <Check size={11} strokeWidth={2.8} />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="pw-btn-dark pw-module-btn"
                  onClick={triggerUpload}
                >
                  <span>{card.cta}</span>
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TRUSTED BY / AUDIENCE BAR */}
      <section className="pw-trust-section">
        <div className="pw-container">
          <p className="pw-trust-eyebrow">
            BUILT FOR STUDENTS, UNIVERSITIES, BOOTCAMPS AND CAREER SWITCHERS
          </p>
          <div className="pw-trust-4-grid">
            {trustAudiences.map((aud) => {
              const AudIcon = aud.icon
              return (
                <div key={aud.label} className="pw-trust-pill-card">
                  <AudIcon size={16} strokeWidth={2} />
                  <span>{aud.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. FAQS SECTION */}
      <section className="pw-faq-section" id="faqs">
        <div className="pw-container pw-faq-container">
          <div className="pw-section-heading">
            <span className="pw-eyebrow-pill">FREQUENTLY ASKED QUESTIONS</span>
            <h2>Everything you need to know about Pathwise.</h2>
            <p>Transparent answers on how our deterministic rubric and career matching work.</p>
          </div>

          <div className="pw-faq-list">
            {faqs.map((f, i) => (
              <details key={i} className="pw-faq-item" open={openFaqIndex === i}>
                <summary
                  className="pw-faq-summary"
                  onClick={(event) => {
                    event.preventDefault()
                    setOpenFaqIndex((currentIndex) => currentIndex === i ? null : i)
                  }}
                >
                  <span>{f.q}</span>
                  <ChevronDown size={17} className="pw-faq-chevron" />
                </summary>
                <div className="pw-faq-body">
                  <p>{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CTA SECTION */}
      <section className="pw-bottom-cta-section">
        <div className="pw-container pw-bottom-cta-inner">
          <span className="pw-eyebrow-pill">GET STARTED TODAY</span>
          <h2 className="pw-cta-heading">
            Build stronger careers, together.
          </h2>
          <p className="pw-cta-sub">
            Join students and professionals who use Pathwise to create evidence-backed resumes and career roadmaps.
          </p>
          <div className="pw-cta-actions">
            <button
              type="button"
              className="pw-btn-dark"
              onClick={triggerUpload}
            >
              <span>Analyze Your Resume</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              className="pw-btn-light"
              onClick={scrollToUpload}
            >
              <span>Import from Drive</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
