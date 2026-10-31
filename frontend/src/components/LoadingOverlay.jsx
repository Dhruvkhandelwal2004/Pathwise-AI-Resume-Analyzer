import React, { useEffect, useState } from 'react'
import { BrainCircuit, Check } from 'lucide-react'
import { getAnalysisProgressPercent } from '../utils/analysisLoading.js'

const LOADING_STEPS = [
  'Reading resume safely in memory',
  'Structuring experience, skills, and projects',
  'Executing deterministic scoring & career matching',
]

export function LoadingOverlay({ step = 0, startedAt }) {
  const [progressPercent, setProgressPercent] = useState(0)
  const [dotCount, setDotCount] = useState(1)
  const currentStep = Math.min(step, LOADING_STEPS.length - 1)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDotCount((currentCount) => (currentCount >= 3 ? 1 : currentCount + 1))
    }, 400)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (startedAt == null) return undefined
    const updateProgress = () => {
      const nextProgress = getAnalysisProgressPercent(Date.now() - startedAt)
      setProgressPercent((currentProgress) => Math.max(currentProgress, nextProgress))
    }
    const interval = window.setInterval(updateProgress, 50)
    return () => window.clearInterval(interval)
  }, [startedAt])

  return (
    <div className="enhancv-loading-card card">
      <div className="loading-icon-glow">
        <BrainCircuit size={36} className="pulsing-brain" />
      </div>

      <h2 aria-label="Analysing your resume...">
        Analysing your resume<span aria-hidden="true">{'.'.repeat(dotCount)}</span>
      </h2>
      <p className="loading-subtext">
        Analyzing explicit resume evidence with AI and deterministic rubrics. Please hold on.
      </p>

      <div className="loading-progress-track">
        <div
          className="loading-progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="loading-steps-pills">
        {LOADING_STEPS.map((label, idx) => {
          const isDone = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div
              key={label}
              className={`loading-step-item ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              <span className="step-circle">
                {isDone ? <Check size={12} /> : idx + 1}
              </span>
              <span className="step-label">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
