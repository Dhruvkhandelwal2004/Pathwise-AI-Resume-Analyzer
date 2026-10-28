import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
  Link,
} from 'react-router-dom'
import axios from 'axios'
import { AlertCircle, X, FileText, ArrowRight, UploadCloud, BookOpen } from 'lucide-react'

import {
  CAREER_PLAN_STORAGE_KEY,
  commitCareerGoal,
  createEmptyCareerPlanState,
  parseCareerPlanState,
} from './careerPlan.js'
import {
  clearSessionStore,
  getResumeSessionRecord,
  readSessionStore,
  saveResumeSessionRecord,
  updateResumeRoleState,
} from './utils/sessionStore.js'

import { Navbar } from './components/Navbar.jsx'
import { UploadHeroSection } from './components/UploadSection.jsx'
import { UploadModal } from './components/UploadModal.jsx'
import { LoadingOverlay } from './components/LoadingOverlay.jsx'
import { HelpAssistant } from './components/HelpAssistant.jsx'
import { AtsScorePage } from './pages/AtsScorePage.jsx'
import { CareerMatchingPage } from './pages/CareerMatchingPage.jsx'
import { SkillsRoadmapPage } from './pages/SkillsRoadmapPage.jsx'
import {
  RESUME_FILE_SIZE_MESSAGE,
  RESUME_FILE_VALIDATION_MESSAGE,
} from './utils/resumeFileValidation.js'

import './App.css'

const PYTHON_API = import.meta.env.VITE_PYTHON_API_URL ?? ''
const NODE_API = import.meta.env.VITE_NODE_API_URL ?? ''

const ERROR_MESSAGES = {
  file_not_pdf: 'Please choose a valid PDF file.',
  invalid_resume_file: RESUME_FILE_VALIDATION_MESSAGE,
  resume_file_too_large: RESUME_FILE_SIZE_MESSAGE,
  pdf_too_large: 'The PDF must be 5 MB or smaller.',
  protected_pdf: 'Password-protected PDFs are not supported.',
  unreadable_pdf: 'This PDF could not be read. Try exporting it again.',
  textless_pdf: 'No selectable text was found in this PDF.',
  ai_rate_limited: 'The AI service is busy. Please try again shortly.',
  ai_timeout: 'Analysis took too long. Please try again.',
  ai_not_configured: 'The AI service is not configured.',
  ai_provider_error: 'The AI service could not complete this analysis.',
  ai_provider_http_400: 'The AI service could not produce a schema-valid result after retrying. Please try again shortly.',
  ai_provider_http_500: 'The AI service is temporarily unavailable. Please try again shortly.',
  ai_provider_http_502: 'The AI service is temporarily unavailable. Please try again shortly.',
  ai_provider_http_503: 'The AI service is temporarily unavailable. Please try again shortly.',
  ai_connection_error: 'The server could not connect to the AI service. Check the network and retry.',
  ai_empty_output: 'The AI service returned an empty result.',
  ai_invalid_output: 'The analysis did not pass validation. Please try again.',
}

const QUALITY_HISTORY_KEY = 'pathwise-quality-score-history-v1'

function resetSessionIfPageReloaded() {
  if (typeof window === 'undefined') return false
  try {
    const navEntries = window.performance?.getEntriesByType?.('navigation')
    const isReload =
      (Array.isArray(navEntries) && navEntries[0]?.type === 'reload') ||
      window.performance?.navigation?.type === 1

    if (isReload) {
      clearSessionStore()
      window.sessionStorage?.removeItem(CAREER_PLAN_STORAGE_KEY)
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/')
      }
      return true
    }
  } catch {
    // Ignore storage/navigation API errors
  }
  return false
}

let shouldRedirectReloadOnMount = resetSessionIfPageReloaded()

function readQualityHistory() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(QUALITY_HISTORY_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.slice(-10) : []
  } catch {
    return []
  }
}

function readCareerPlanState() {
  try {
    return parseCareerPlanState(window.sessionStorage.getItem(CAREER_PLAN_STORAGE_KEY))
  } catch {
    return createEmptyCareerPlanState()
  }
}

function makeId(prefix) {
  return window.crypto?.randomUUID?.()
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getApiError(error) {
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return 'The Python analysis service is offline. Start it on port 8000, then try again.'
  }
  const code = error?.response?.data?.detail?.code
  return ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.'
}

function isCanceledRequest(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED'
}

function MissingResumeSessionView({ onOpenUpload, latestResumeId }) {
  return (
    <div className="ag-missing-session-wrap">
      <div className="ag-missing-session-card">
        <div className="ag-missing-icon">
          <FileText size={28} />
        </div>
        <h2>Resume Session Not Found</h2>
        <p>
          This resume report ID is not in your current browser session, or the session was cleared. Upload your PDF resume to generate a fresh analysis.
        </p>
        <div className="ag-missing-actions">
          <button type="button" className="ag-btn-primary" onClick={onOpenUpload}>
            <UploadCloud size={16} />
            <span>Upload Resume PDF</span>
          </button>
          {latestResumeId && (
            <Link to={`/analysis/${latestResumeId}`} className="ag-btn-secondary">
              <span>Open Latest Session Report</span>
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalysisRouteView({
  storeVersion,
  careerPlanState,
  onOpenUpload,
}) {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const record = getResumeSessionRecord(resumeId)
  const latestId = readSessionStore().latestResumeId

  if (!record) {
    return <MissingResumeSessionView onOpenUpload={onOpenUpload} latestResumeId={latestId} />
  }

  return (
    <AtsScorePage
      key={`${resumeId}-${storeVersion}`}
      resumeId={resumeId}
      analysis={record.analysis}
      metadata={record.metadata}
      quality={record.quality}
      activePlan={careerPlanState.activePlan}
      onExploreCareers={() => navigate(`/careers/${resumeId}`)}
      onNewUpload={onOpenUpload}
    />
  )
}

function CareersRouteView({
  storeVersion,
  careerPlanState,
  onSelectAndLoadRole,
  onCommitRoleAndNavigate,
  onOpenUpload,
  roleLoading,
  roleError,
}) {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const record = getResumeSessionRecord(resumeId)
  const latestId = readSessionStore().latestResumeId

  if (!record) {
    return <MissingResumeSessionView onOpenUpload={onOpenUpload} latestResumeId={latestId} />
  }

  const activeRoleId =
    record.selectedRoleId ||
    careerPlanState.activePlan?.targetRoleId ||
    record.career?.selectedProfile?.roleId ||
    record.career?.strongestMatches?.[0]?.roleId ||
    'data-analyst'

  return (
    <CareerMatchingPage
      key={`${resumeId}-${storeVersion}`}
      resumeId={resumeId}
      analysis={record.analysis}
      career={record.career}
      careerByRoleId={record.careerByRoleId ?? {}}
      selectedRoleId={activeRoleId}
      activePlan={careerPlanState.activePlan}
      roleLoading={roleLoading}
      roleError={roleError}
      onSelectRole={(roleId) => onSelectAndLoadRole(resumeId, roleId)}
      onBuildRoadmap={(roleId) => onCommitRoleAndNavigate(resumeId, roleId)}
      onBackToAts={() => navigate(`/analysis/${resumeId}`)}
    />
  )
}

function RoadmapRouteView({
  storeVersion,
  onEnsureRoadmapRole,
  onToggleStepComplete,
  onSaveStudentEvidence,
  onOpenUpload,
  roleLoading,
  roleError,
}) {
  const { resumeId, roleId } = useParams()
  const navigate = useNavigate()
  const record = getResumeSessionRecord(resumeId)
  const latestId = readSessionStore().latestResumeId

  useEffect(() => {
    if (record && roleId) {
      onEnsureRoadmapRole(resumeId, roleId)
    }
  }, [resumeId, roleId, Boolean(record), onEnsureRoadmapRole])

  if (!record) {
    return <MissingResumeSessionView onOpenUpload={onOpenUpload} latestResumeId={latestId} />
  }

  const roleCareer = record.careerByRoleId?.[roleId]
  if (roleError && !roleCareer) {
    return (
      <div className="ag-missing-session-wrap">
        <div className="ag-missing-session-card">
          <AlertCircle size={32} className="ag-icon-amber" />
          <h2>Invalid or Unsupported Career Role</h2>
          <p>
            The role ID <code>{roleId}</code> does not match an approved profile in the Pathwise career catalogue. Please choose an approved profile on the Career Role Matching page.
          </p>
          <div className="ag-missing-actions">
            <button
              type="button"
              className="ag-btn-primary"
              onClick={() => navigate(`/careers/${resumeId}`)}
            >
              <span>Choose Approved Career Role</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeCareer = roleCareer ?? record.career
  const completedStepIds = record.completedStepIdsByRoleId?.[roleId] ?? []

  return (
    <SkillsRoadmapPage
      key={`${resumeId}-${roleId}-${storeVersion}`}
      resumeId={resumeId}
      roleId={roleId}
      analysis={record.analysis}
      career={activeCareer}
      roleLoading={roleLoading}
      completedStepIds={completedStepIds}
      onToggleStepComplete={(criterionId) => onToggleStepComplete(resumeId, roleId, criterionId)}
      onSaveStudentEvidence={(entries) => onSaveStudentEvidence(resumeId, roleId, entries)}
      onNavigateToRoles={() => navigate(`/careers/${resumeId}`)}
      onNavigateToAts={() => navigate(`/analysis/${resumeId}`)}
      onNewUpload={onOpenUpload}
    />
  )
}

export function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')

  const [, setQualityHistory] = useState(readQualityHistory)
  const [careerPlanState, setCareerPlanState] = useState(readCareerPlanState)
  const [storeVersion, setStoreVersion] = useState(0)
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleError, setRoleError] = useState('')
  const analysisAbortControllerRef = useRef(null)

  useEffect(() => {
    if (shouldRedirectReloadOnMount) {
      shouldRedirectReloadOnMount = false
      if (location.pathname !== '/') {
        navigate('/', { replace: true })
      }
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  const handleResetToHome = useCallback(() => {
    analysisAbortControllerRef.current?.abort()
    analysisAbortControllerRef.current = null
    clearSessionStore()
    try {
      window.sessionStorage.removeItem(CAREER_PLAN_STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
    setCareerPlanState(createEmptyCareerPlanState())
    setIsUploadModalOpen(false)
    setError('')
    setUploadError('')
    setRoleError('')
    setLoading(false)
    setLoadingStep(0)
    setStoreVersion((v) => v + 1)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    navigate('/', { replace: true })
  }, [navigate])

  useEffect(() => () => {
    analysisAbortControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!loading) return undefined
    const interval = window.setInterval(() => {
      setLoadingStep((curr) => Math.min(curr + 1, 2))
    }, 2800)
    return () => window.clearInterval(interval)
  }, [loading])

  useEffect(() => {
    if (!loading) return undefined

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousHtmlOverscroll = html.style.overscrollBehavior
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = previousHtmlOverflow
      html.style.overscrollBehavior = previousHtmlOverscroll
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [loading])

  const requestCareerMatches = async (resumeAnalysis, roleId, studentEvidence, signal) => {
    const requestBody = { analysis: resumeAnalysis }
    if (roleId) requestBody.targetRoleId = roleId
    if (studentEvidence) requestBody.studentEvidence = studentEvidence
    const response = await axios.post(`${NODE_API}/api/careers/match`, requestBody, { signal })
    return response.data
  }

  const persistCareerPlan = useCallback((selection) => {
    setCareerPlanState((current) => {
      const next = commitCareerGoal(current, selection, { planId: makeId('career-plan') })
      try {
        window.sessionStorage.setItem(CAREER_PLAN_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Active plan still works in memory if session storage is disabled
      }
      return next
    })
  }, [])

  const buildGoalSelection = (careerResult, reportId, reportVersion = 1) => ({
    targetRoleId: careerResult.selectedProfile.roleId,
    targetRoleTitle: careerResult.selectedProfile.title,
    reportRef: {
      reportId,
      reportVersion,
      catalogueVersion: careerResult.selectedProfile.catalogueVersion,
      profileVersion: careerResult.selectedProfile.profileVersion,
    },
    relevance: {
      score: careerResult.selectedRoleMatch.score,
      matchedCriteriaCount: careerResult.selectedRoleMatch.matchedCriteria.length,
    },
  })

  const fetchQualityScore = async (resumeAnalysis, signal) => {
    try {
      const response = await axios.post(`${NODE_API}/api/resumes/quality-score`, {
        analysis: resumeAnalysis,
      }, { signal })
      const result = response.data
      setQualityHistory((current) => {
        const snapshot = {
          id: window.crypto?.randomUUID?.() ?? `${Date.now()}-${current.length}`,
          analyzedAt: new Date().toISOString(),
          rubricVersion: result.rubricVersion,
          score: result.score,
          label: result.label,
          criteria: result.criteria.map(({ id, label, earned, weight }) => ({
            id,
            label,
            earned,
            weight,
          })),
        }
        const updated = [...current, snapshot].slice(-10)
        try {
          window.sessionStorage.setItem(QUALITY_HISTORY_KEY, JSON.stringify(updated))
        } catch {
          // Scoring still works when browser session storage is disabled
        }
        return updated
      })
      return result
    } catch (requestError) {
      if (isCanceledRequest(requestError)) throw requestError
      return null
    }
  }

  const analyze = async ({ file, uploadSurface = 'inline' }) => {
    analysisAbortControllerRef.current?.abort()
    const abortController = new AbortController()
    analysisAbortControllerRef.current = abortController

    setLoading(true)
    setLoadingStep(0)
    setError('')
    setUploadError('')
    setRoleError('')

    try {
      const form = new FormData()
      form.append('resume', file)
      const response = await axios.post(`${PYTHON_API}/api/resumes/analyze-upload`, form, {
        signal: abortController.signal,
      })

      if (abortController.signal.aborted) {
        throw new axios.CanceledError('Resume analysis canceled')
      }

      const extractedAnalysis = response.data.analysis
      const extractedMetadata = response.data.metadata
      const resumeId = makeId('analysis-report')
      const activeRoleId = careerPlanState.activePlan?.targetRoleId

      const [careerResult, qualityResult] = await Promise.all([
        requestCareerMatches(
          extractedAnalysis,
          activeRoleId,
          undefined,
          abortController.signal,
        ).catch(async (requestError) => {
          if (isCanceledRequest(requestError)) throw requestError
          if (!activeRoleId) return null
          return requestCareerMatches(
            extractedAnalysis,
            undefined,
            undefined,
            abortController.signal,
          ).catch((fallbackError) => {
            if (isCanceledRequest(fallbackError)) throw fallbackError
            return null
          })
        }),
        fetchQualityScore(extractedAnalysis, abortController.signal),
      ])

      if (abortController.signal.aborted) {
        throw new axios.CanceledError('Resume analysis canceled')
      }

      const initialRoleId =
        careerResult?.selectedProfile?.roleId ??
        careerResult?.strongestMatches?.[0]?.roleId ??
        'data-analyst'

      saveResumeSessionRecord({
        resumeId,
        reportVersion: 1,
        analysis: extractedAnalysis,
        metadata: extractedMetadata,
        quality: qualityResult,
        career: careerResult,
        selectedRoleId: initialRoleId,
      })

      if (
        activeRoleId &&
        careerResult?.selectedProfile?.roleId === activeRoleId &&
        careerResult?.selectedRoleMatch
      ) {
        persistCareerPlan(buildGoalSelection(careerResult, resumeId, 1))
      }

      setStoreVersion((v) => v + 1)
      setIsUploadModalOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      navigate(`/analysis/${resumeId}`)
      return true
    } catch (requestError) {
      if (isCanceledRequest(requestError) || abortController.signal.aborted) {
        return false
      }
      const errorCode = requestError?.response?.data?.detail?.code
      if (
        ['invalid_resume_file', 'resume_file_too_large'].includes(errorCode)
      ) {
        setUploadError(
          errorCode === 'resume_file_too_large'
            ? RESUME_FILE_SIZE_MESSAGE
            : RESUME_FILE_VALIDATION_MESSAGE,
        )
        if (uploadSurface === 'modal') setIsUploadModalOpen(true)
        return false
      }
      setError(getApiError(requestError))
      return false
    } finally {
      if (analysisAbortControllerRef.current === abortController) {
        analysisAbortControllerRef.current = null
        setLoading(false)
      }
    }
  }

  const handleCancelAnalysis = useCallback(() => {
    analysisAbortControllerRef.current?.abort()
    setLoading(false)
    setLoadingStep(0)
    setError('')
    setRoleError('')
    setIsUploadModalOpen(false)
  }, [])

  const handleSelectAndLoadRole = useCallback(async (resumeId, roleId) => {
    const record = getResumeSessionRecord(resumeId)
    if (!record || !roleId) return
    setRoleError('')

    const cached = record.careerByRoleId?.[roleId]
    if (cached) {
      updateResumeRoleState(resumeId, roleId, {
        selectedRoleId: roleId,
        careerResult: cached,
      })
      setStoreVersion((v) => v + 1)
      return cached
    }

    setRoleLoading(true)
    try {
      const savedEvidence = record.studentEvidenceByRoleId?.[roleId]
      const result = await requestCareerMatches(record.analysis, roleId, savedEvidence)
      if (result.selectedProfile?.roleId !== roleId) {
        throw new Error('Role mismatch')
      }
      updateResumeRoleState(resumeId, roleId, {
        selectedRoleId: roleId,
        careerResult: result,
      })
      setStoreVersion((v) => v + 1)
      return result
    } catch {
      setRoleError('That career role could not be validated. Choose an approved role from the catalogue.')
      return null
    } finally {
      setRoleLoading(false)
    }
  }, [])

  const handleCommitRoleAndNavigate = useCallback(
    async (resumeId, roleId) => {
      const record = getResumeSessionRecord(resumeId)
      if (!record || !roleId) return
      setRoleError('')
      setRoleLoading(true)

      try {
        let validatedCareer = record.careerByRoleId?.[roleId]
        if (!validatedCareer || validatedCareer.selectedProfile?.roleId !== roleId) {
          const savedEvidence = record.studentEvidenceByRoleId?.[roleId]
          validatedCareer = await requestCareerMatches(record.analysis, roleId, savedEvidence)
        }
        if (validatedCareer?.selectedProfile?.roleId !== roleId) {
          throw new Error('Selected role mismatch')
        }

        persistCareerPlan(buildGoalSelection(validatedCareer, resumeId, record.reportVersion ?? 1))
        updateResumeRoleState(resumeId, roleId, {
          selectedRoleId: roleId,
          careerResult: validatedCareer,
        })
        setStoreVersion((v) => v + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        navigate(`/roadmap/${resumeId}/${roleId}`)
      } catch {
        setRoleError('Only approved career roles in the Pathwise catalogue can be selected.')
      } finally {
        setRoleLoading(false)
      }
    },
    [navigate, persistCareerPlan]
  )

  const handleEnsureRoadmapRole = useCallback(
    async (resumeId, roleId) => {
      const record = getResumeSessionRecord(resumeId)
      if (!record || !roleId) return
      if (record.careerByRoleId?.[roleId]?.selectedProfile?.roleId === roleId) {
        return
      }
      setRoleError('')
      setRoleLoading(true)
      try {
        const savedEvidence = record.studentEvidenceByRoleId?.[roleId]
        const validatedCareer = await requestCareerMatches(record.analysis, roleId, savedEvidence)
        if (validatedCareer?.selectedProfile?.roleId !== roleId) {
          throw new Error('Selected role mismatch')
        }
        persistCareerPlan(buildGoalSelection(validatedCareer, resumeId, record.reportVersion ?? 1))
        updateResumeRoleState(resumeId, roleId, {
          selectedRoleId: roleId,
          careerResult: validatedCareer,
        })
        setStoreVersion((v) => v + 1)
      } catch {
        setRoleError('Invalid or unsupported role ID.')
      } finally {
        setRoleLoading(false)
      }
    },
    [persistCareerPlan]
  )

  const handleToggleStepComplete = useCallback((resumeId, roleId, criterionId) => {
    const record = getResumeSessionRecord(resumeId)
    if (!record) return
    const currentList = record.completedStepIdsByRoleId?.[roleId] ?? []
    const exists = currentList.includes(criterionId)
    const nextList = exists
      ? currentList.filter((id) => id !== criterionId)
      : [...currentList, criterionId]

    updateResumeRoleState(resumeId, roleId, {
      completedStepIds: nextList,
    })
    setStoreVersion((v) => v + 1)
  }, [])

  const handleSaveStudentEvidence = useCallback(async (resumeId, roleId, entries) => {
    const record = getResumeSessionRecord(resumeId)
    if (!record) throw new Error('Missing resume session')
    const result = await requestCareerMatches(record.analysis, roleId, entries)
    if (result.selectedProfile?.roleId !== roleId) {
      throw new Error('Selected role mismatch')
    }
    updateResumeRoleState(resumeId, roleId, {
      careerResult: result,
      studentEvidence: entries,
    })
    setStoreVersion((v) => v + 1)
    return result
  }, [])

  const latestStore = readSessionStore()
  const latestRecord = latestStore.latestResumeId
    ? latestStore.records[latestStore.latestResumeId]
    : null

  return (
    <div className={`enhancv-app-shell${loading ? ' is-loading' : ''}`} id="top">
      <Navbar
        activeTargetRole={careerPlanState.activePlan?.targetRoleTitle}
        isAnalyzed={Boolean(latestRecord) && location.pathname !== '/'}
        isLoading={loading}
        latestResumeId={latestRecord?.resumeId}
        activeRoleId={
          careerPlanState.activePlan?.targetRoleId ||
          latestRecord?.selectedRoleId ||
          'data-analyst'
        }
        onNewUpload={() => setIsUploadModalOpen(true)}
        onResetHome={handleResetToHome}
        onCancelAnalysis={handleCancelAnalysis}
      />

      {error && (
        <div className="global-error-banner" role="alert">
          <AlertCircle size={18} />
          <div className="error-copy">
            <strong>Analysis could not be completed</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <main className="enhancv-main-layout">
          <div className="enhancv-loading-container">
            <LoadingOverlay step={loadingStep} />
          </div>
        </main>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <main className="pw-landing-main">
                <UploadHeroSection
                  onAnalyze={analyze}
                  loading={loading}
                  onOpenUpload={() => setIsUploadModalOpen(true)}
                  uploadError={uploadError}
                  onUploadErrorChange={setUploadError}
                />
              </main>
            }
          />
          <Route
            path="/analysis/:resumeId"
            element={
              <AnalysisRouteView
                storeVersion={storeVersion}
                careerPlanState={careerPlanState}
                onOpenUpload={() => setIsUploadModalOpen(true)}
              />
            }
          />
          <Route
            path="/careers/:resumeId"
            element={
              <CareersRouteView
                storeVersion={storeVersion}
                careerPlanState={careerPlanState}
                onSelectAndLoadRole={handleSelectAndLoadRole}
                onCommitRoleAndNavigate={handleCommitRoleAndNavigate}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                roleLoading={roleLoading}
                roleError={roleError}
              />
            }
          />
          <Route
            path="/roadmap/:resumeId/:roleId"
            element={
              <RoadmapRouteView
                storeVersion={storeVersion}
                onEnsureRoadmapRole={handleEnsureRoadmapRole}
                onToggleStepComplete={handleToggleStepComplete}
                onSaveStudentEvidence={handleSaveStudentEvidence}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                roleLoading={roleLoading}
                roleError={roleError}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

      <footer className="pw-footer">
        <div className="pw-container pw-footer-inner">
          <Link to="/" onClick={handleResetToHome} className="pw-footer-brand">
            <span className="brand-icon-wrapper">
              <BookOpen size={15} strokeWidth={2.2} />
            </span>
            <strong>Pathwise</strong>
          </Link>

          <div className="pw-footer-links">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Documentation</span>
            <span>Support</span>
          </div>
        </div>
      </footer>

      <HelpAssistant />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAnalyze={analyze}
        loading={loading}
        uploadError={uploadError}
        onUploadErrorChange={setUploadError}
      />
    </div>
  )
}

export default App
