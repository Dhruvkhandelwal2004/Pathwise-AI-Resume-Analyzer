import React from 'react'
import { BrainCircuit, Check } from 'lucide-react'

const LOADING_STEPS = [
  'Reading resume safely in memory',
  'Structuring experience, skills, and projects',
  'Executing deterministic scoring & career matching',
]

export function LoadingOverlay({ step = 0 }) {
  const currentStep = Math.min(step, LOADING_STEPS.length - 1)
  const progressPercent = Math.min(95, 25 + currentStep * 35)

  return (
    <div className="enhancv-loading-card card">
      <div className="loading-icon-glow">
        <BrainCircuit size={36} className="pulsing-brain" />
      </div>

      <h2>{LOADING_STEPS[currentStep]}</h2>
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
