import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RESUME_FILE_VALIDATION_MESSAGE,
  validateResumeFile,
} from './resumeFileValidation.js'

const encoder = new TextEncoder()

function fileLike(name, type, bytes) {
  const data = bytes instanceof Uint8Array ? bytes : encoder.encode(bytes)
  return {
    name,
    type,
    size: data.byteLength,
    async arrayBuffer() {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    },
  }
}

function validDocBytes() {
  const signature = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  const streamName = new Uint8Array(
    [...'WordDocument'].flatMap((character) => [character.charCodeAt(0), 0]),
  )
  const bytes = new Uint8Array(signature.length + 32 + streamName.length)
  bytes.set(signature)
  bytes.set(streamName, signature.length + 32)
  return bytes
}

function validDocxBytes() {
  return encoder.encode(
    `PK\u0003\u0004fixture/[Content_Types].xml/word/document.xml/resume content`,
  )
}

test('accepts PDF, DOC, and DOCX when extension, MIME, and content agree', async () => {
  const fixtures = [
    fileLike('resume.pdf', 'application/pdf', '%PDF-1.7\nresume'),
    fileLike('resume.doc', 'application/msword', validDocBytes()),
    fileLike(
      'resume.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      validDocxBytes(),
    ),
  ]

  for (const fixture of fixtures) {
    const result = await validateResumeFile(fixture)
    assert.equal(result.valid, true, fixture.name)
  }
})

test('rejects image, data, spreadsheet, presentation, archive, and other extensions', async () => {
  const rejected = [
    ['resume.csv', 'text/csv'],
    ['resume.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['resume.ppt', 'application/vnd.ms-powerpoint'],
    ['resume.jpg', 'image/jpeg'],
    ['resume.jpeg', 'image/jpeg'],
    ['resume.svg', 'image/svg+xml'],
    ['resume.webp', 'image/webp'],
    ['resume.png', 'image/png'],
    ['resume.zip', 'application/zip'],
  ]

  for (const [name, type] of rejected) {
    const result = await validateResumeFile(fileLike(name, type, 'unsupported'))
    assert.equal(result.valid, false, name)
    assert.equal(result.message, RESUME_FILE_VALIDATION_MESSAGE)
  }
})

test('rejects MIME mismatches and renamed non-resume content', async () => {
  const rejected = [
    fileLike('resume.pdf', 'image/png', '%PDF-1.7\nresume'),
    fileLike('renamed.pdf', 'application/pdf', '\u0089PNG\r\n'),
    fileLike('renamed.docx', 'application/octet-stream', 'PK\u0003\u0004archive.txt'),
    fileLike(
      'renamed.doc',
      'application/octet-stream',
      new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]),
    ),
  ]

  for (const fixture of rejected) {
    const result = await validateResumeFile(fixture)
    assert.equal(result.valid, false, fixture.name)
    assert.equal(result.message, RESUME_FILE_VALIDATION_MESSAGE)
  }
})

