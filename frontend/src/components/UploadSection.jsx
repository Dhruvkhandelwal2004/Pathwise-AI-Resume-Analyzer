import React, { useState, useRef } from 'react'
import {
  UploadCloud,
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
  AlertCircle,
} from 'lucide-react'
import {
  RESUME_FILE_VALIDATION_MESSAGE,
  validateResumeFile,
} from '../utils/resumeFileValidation.js'
import {
  smoothScrollToElement,
} from '../utils/smoothScroll.js'

export function UploadDropzone({
  onAnalyze,
  loading,
  onFileChange,
  validationError = '',
  onValidationErrorChange,
}) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const inputRef = useRef(null)
  const validationSequenceRef = useRef(0)

  const updateFileError = (message) => {
    setFileError(message)
    onValidationErrorChange?.(message)
  }

  const clearSelectedFile = () => {
    validationSequenceRef.current += 1
    setFile(null)
    setFileError('')
    onValidationErrorChange?.('')
    onFileChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const pickFile = async (candidate) => {
    const validationSequence = validationSequenceRef.current + 1
    validationSequenceRef.current = validationSequence
    setFile(null)
    setFileError('')
    onValidationErrorChange?.('')
    onFileChange?.(null)

    if (!candidate) return

    const validation = await validateResumeFile(candidate)
    if (validationSequence !== validationSequenceRef.current) return

    if (!validation.valid) {
      updateFileError(validation.message || RESUME_FILE_VALIDATION_MESSAGE)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setFile(candidate)
    onFileChange?.(candidate)
  }

  const submit = () => {
    if (file) onAnalyze({ file })
  }

  const displayedFileError = fileError || validationError
  const ready = Boolean(file) && !displayedFileError

  return (
    <div className="enhancv-upload-box card">
      <div className="upload-tabs-bar is-single">
        <div className="upload-tab is-active">
          <UploadCloud size={16} />
          <span>Upload Resume/CV</span>
        </div>
      </div>

      <div
          className={`enhancv-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''} ${displayedFileError ? 'has-error' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (e.dataTransfer.files?.length !== 1) {
              clearSelectedFile()
              updateFileError(RESUME_FILE_VALIDATION_MESSAGE)
              return
            }
            void pickFile(e.dataTransfer.files[0])
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
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => void pickFile(e.target.files?.[0])}
            hidden
          />

          {file ? (
            <div className="dropzone-file-preview">
              <div className="file-icon-box">
                <FileText size={28} />
              </div>
              <div className="file-details">
                <strong>{file.name}</strong>
                <span>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Valid {file.name.split('.').pop()?.toUpperCase()} file
                </span>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                aria-label="Remove selected file"
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelectedFile()
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
              <h4>Drag &amp; drop your resume file here</h4>
              <p>or click to browse from your device</p>
              <div className="dropzone-limits">
                <span>PDF, DOC, or DOCX · Maximum 5 MB · In-memory processing</span>
              </div>
            </div>
          )}
      </div>

      {displayedFileError && (
        <div className="upload-inline-error" role="alert">
          <AlertCircle size={16} />
          <span>{displayedFileError}</span>
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

export function UploadHeroSection({
  onAnalyze,
  loading,
  onOpenUpload,
  uploadError,
  onUploadErrorChange,
}) {
  const uploadBoxRef = useRef(null)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const scrollToUpload = () => {
    if (uploadBoxRef.current) {
      smoothScrollToElement('upload-workspace', 110)
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
      title: 'PDF, DOC & DOCX',
      desc: 'Upload a supported resume file',
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
      desc: 'Upload a PDF, DOC, or DOCX resume file from your device.',
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
        'Upload a PDF, DOC, or DOCX resume file',
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

  const jobSeekerReasons = [
    {
      title: 'Clear resume feedback',
      text: 'See which resume sections need attention, why they affect your score, and what evidence can make them stronger.',
      name: 'Marcus T.',
      position: 'Software Engineer, London',
    },
    {
      title: 'Evidence-based career matching',
      text: 'Compare your verified resume evidence with relevant career paths and review matched and missing requirements clearly.',
      name: 'Priya S.',
      position: 'Marketing Manager, Toronto',
    },
    {
      title: 'A practical skills roadmap',
      text: 'Turn identified skill gaps into staged learning, practice projects, and progress checks that are easier to follow.',
      name: 'James O.',
      position: 'Product Manager, Berlin',
    },
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
      q: 'What is an ATS-friendly resume?',
      intro: 'An ATS-friendly resume uses a clean, text-based layout that an Applicant Tracking System can parse reliably. Use standard section headings, readable fonts, a simple structure, and relevant keywords that truthfully reflect your experience.',
      closing: 'Avoid scanned pages, heavy graphics, complex tables, multiple columns, and text boxes that can make important details difficult to extract. You can upload your PDF to Pathwise to check which resume evidence is detected and which sections may need attention.',
    },
    {
      q: 'How to create an ATS-friendly resume?',
      intro: 'Create an ATS-friendly resume with a simple, text-based structure that keeps important information easy for both software and recruiters to read:',
      bullets: [
        'Use a clean single-column layout with readable, conventional fonts.',
        'Use standard section headings such as Work Experience, Skills, Education, and Projects.',
        'Include relevant job-description keywords only where they truthfully match your experience.',
        'Describe achievements with clear action verbs and measurable results when available.',
        'Avoid scanned pages, logos, heavy graphics, complex tables, columns, and text boxes.',
        'Export a text-based PDF and confirm that its text can be selected and copied.',
      ],
      closing: 'Upload the finished PDF to Pathwise to review the extracted evidence, section completeness, and areas that may need clearer documentation.',
    },
    {
      q: 'Can ATS read PDF resumes?',
      intro: 'Yes, many modern Applicant Tracking Systems can read text-based PDF resumes, but the way the PDF is created matters:',
      bullets: [
        'Text-based PDFs exported from a word processor usually work well because their text remains selectable and parseable.',
        'Scanned or photographed PDFs can fail parsing because their content may be stored as an image instead of text.',
        'PDFs with complex columns, heavy graphics, tables, or text boxes can be harder for some systems to process correctly.',
      ],
      closing: 'Always follow the file-format instructions in the job posting. Pathwise accepts PDF, DOC, and DOCX uploads and can help you verify whether the resume text and evidence are being extracted clearly.',
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
      a: 'Pathwise Resume Analyzer accepts PDF, DOC, and DOCX resume uploads up to 5 MB. After making the suggested edits, you can re-upload your updated resume anytime to track how your ATS score improves!',
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
              Upload your PDF, DOC, or DOCX resume, extract verified evidence with AI, calculate a 100-point ATS score, match against 21 career roles, and follow a personalized skills roadmap from one platform.
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
                  <span>Puneet</span>
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
            <h2>From resume file to career roadmap in minutes.</h2>
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
            <UploadDropzone
              onAnalyze={onAnalyze}
              loading={loading}
              validationError={uploadError}
              onValidationErrorChange={onUploadErrorChange}
            />
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

      {/* 6. ATS SCORE EXPLAINER */}
      <section className="pw-ats-explainer-section" aria-labelledby="ats-score-explainer-title">
        <div className="pw-container pw-ats-explainer-container">
          <article className="pw-ats-explainer-content">
            <h2 id="ats-score-explainer-title">
              <span>What Is An ATS Score?</span>
              <span className="pw-ats-explainer-accent">Pathwise AI Explained</span>
            </h2>

            <p>
              An ATS score is a number out of 100 that estimates how clearly your resume presents information that an Applicant Tracking System can parse. Pathwise first uses AI to extract explicit resume evidence, then applies a transparent scoring rubric to show what is working and what needs attention.
            </p>

            <p>
              Your Pathwise score considers <strong>keyword relevance</strong>, <strong>section completeness</strong>, <strong>measurable evidence</strong>, overall structure, and readability. It checks whether important details across your skills, projects, education, and experience are clearly documented without inventing missing information.
            </p>

            <p>
              Treat the score as a practical improvement guide rather than a hiring guarantee. Review the flagged sections, strengthen your evidence, and re-upload your updated PDF to measure progress against the same consistent 100-point rubric.
            </p>
          </article>
        </div>
      </section>

      {/* 7. JOB SEEKER VALUE SECTION */}
      <section className="pw-job-seeker-section" aria-labelledby="job-seeker-value-title">
        <div className="pw-container pw-job-seeker-container">
          <div className="pw-section-heading pw-job-seeker-heading">
            <span className="pw-eyebrow-pill">BUILT FOR BETTER NEXT STEPS</span>
            <h2 id="job-seeker-value-title">Why job seekers choose Pathwise.</h2>
            <p>Clear feedback, transparent career matching, and a focused plan for improving your resume evidence.</p>
          </div>

          <div className="pw-job-seeker-grid">
            {jobSeekerReasons.map((reason) => (
              <article key={reason.title} className="pw-job-seeker-card">
                <div className="pw-rating-stars" role="img" aria-label="Five out of five stars">
                  <span aria-hidden="true">★★★★★</span>
                </div>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
                <div className="pw-job-seeker-reviewer">
                  <strong>{reason.name}</strong>
                  <span>{reason.position}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="pw-job-seeker-cta-wrap">
            <button type="button" className="pw-job-seeker-cta" onClick={triggerUpload}>
              <span>Check Your Resume Free</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 8. FAQS SECTION */}
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
                  {f.a && <p>{f.a}</p>}
                  {f.intro && <p>{f.intro}</p>}
                  {f.bullets && (
                    <ul>
                      {f.bullets.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  {f.closing && <p>{f.closing}</p>}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM CTA SECTION */}
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
          </div>
        </div>
      </section>

    </div>
  )
}
