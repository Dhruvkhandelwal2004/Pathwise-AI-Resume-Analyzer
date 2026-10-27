import React from 'react'
import { X } from 'lucide-react'
import { UploadDropzone } from './UploadSection.jsx'

export function UploadModal({
  isOpen,
  onClose,
  onAnalyze,
  loading,
  uploadError,
  onUploadErrorChange,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="upload-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="upload-modal-header">
          <div>
            <span className="enhancv-section-tag">New Audit</span>
            <h3>Upload or Replace Resume</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="upload-modal-body">
          <UploadDropzone
            onAnalyze={(payload) => {
              const analysisRequest = onAnalyze({ ...payload, uploadSurface: 'modal' })
              onClose()
              return analysisRequest
            }}
            loading={loading}
            validationError={uploadError}
            onValidationErrorChange={onUploadErrorChange}
          />
        </div>
      </div>
    </div>
  )
}
