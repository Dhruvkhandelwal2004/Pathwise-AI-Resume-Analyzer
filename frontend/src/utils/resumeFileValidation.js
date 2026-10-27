export const RESUME_FILE_VALIDATION_MESSAGE =
  'Please upload a valid resume file (PDF, DOC, or DOCX only).'

export const RESUME_FILE_SIZE_MESSAGE = 'Resume files must be 5 MB or smaller.'

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024

const MIME_TYPES_BY_EXTENSION = {
  pdf: new Set(['application/pdf', 'application/x-pdf', 'application/octet-stream']),
  doc: new Set([
    'application/msword',
    'application/vnd.ms-word',
    'application/x-ole-storage',
    'application/cdfv2',
    'application/octet-stream',
  ]),
  docx: new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ]),
}

const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
const OLE_SIGNATURE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
const ZIP_SIGNATURES = [
  new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
  new Uint8Array([0x50, 0x4b, 0x07, 0x08]),
]

function extensionOf(fileName = '') {
  const match = /\.([^.]+)$/.exec(fileName.trim())
  return match?.[1]?.toLowerCase() ?? ''
}

function startsWithBytes(bytes, signature) {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}

function containsBytes(bytes, marker) {
  if (!marker.length || bytes.length < marker.length) return false
  outer: for (let start = 0; start <= bytes.length - marker.length; start += 1) {
    for (let offset = 0; offset < marker.length; offset += 1) {
      if (bytes[start + offset] !== marker[offset]) continue outer
    }
    return true
  }
  return false
}

function asciiBytes(value) {
  return new Uint8Array([...value].map((character) => character.charCodeAt(0)))
}

function utf16LeBytes(value) {
  return new Uint8Array([...value].flatMap((character) => [character.charCodeAt(0), 0]))
}

function hasPdfContent(bytes) {
  return startsWithBytes(bytes, PDF_SIGNATURE)
}

function hasDocContent(bytes) {
  return (
    startsWithBytes(bytes, OLE_SIGNATURE) &&
    containsBytes(bytes, utf16LeBytes('WordDocument'))
  )
}

function hasDocxContent(bytes) {
  return (
    ZIP_SIGNATURES.some((signature) => startsWithBytes(bytes, signature)) &&
    containsBytes(bytes, asciiBytes('[Content_Types].xml')) &&
    containsBytes(bytes, asciiBytes('word/document.xml'))
  )
}

export async function validateResumeFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { valid: false, code: 'invalid_resume_file', message: RESUME_FILE_VALIDATION_MESSAGE }
  }

  const extension = extensionOf(file.name)
  const allowedMimeTypes = MIME_TYPES_BY_EXTENSION[extension]
  const mimeType = String(file.type || '').split(';', 1)[0].trim().toLowerCase()

  if (!allowedMimeTypes || (mimeType && !allowedMimeTypes.has(mimeType))) {
    return { valid: false, code: 'invalid_resume_file', message: RESUME_FILE_VALIDATION_MESSAGE }
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, code: 'invalid_resume_file', message: RESUME_FILE_VALIDATION_MESSAGE }
  }

  if (file.size > MAX_RESUME_FILE_BYTES) {
    return { valid: false, code: 'resume_file_too_large', message: RESUME_FILE_SIZE_MESSAGE }
  }

  let bytes
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    return { valid: false, code: 'invalid_resume_file', message: RESUME_FILE_VALIDATION_MESSAGE }
  }

  const contentIsValid =
    (extension === 'pdf' && hasPdfContent(bytes)) ||
    (extension === 'doc' && hasDocContent(bytes)) ||
    (extension === 'docx' && hasDocxContent(bytes))

  if (!contentIsValid) {
    return { valid: false, code: 'invalid_resume_file', message: RESUME_FILE_VALIDATION_MESSAGE }
  }

  return { valid: true, extension, mimeType }
}

