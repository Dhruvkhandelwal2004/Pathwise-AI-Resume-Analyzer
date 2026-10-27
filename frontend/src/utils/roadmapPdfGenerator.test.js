import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  buildRoadmapPdfFilename,
  buildRoadmapDocumentModel,
  normalizeSkillRoadmapItem,
  generateRoadmapPdfBytes,
  downloadRoadmapPdf,
  wrapPdfText,
  measurePdfTextWidth,
} from './roadmapPdfGenerator.js'

const require = createRequire(import.meta.url)
const { scoreCareerMatches } = require('../../../backend/services/careerMatching.js')

const SAMPLE_RESUME_ANALYSIS = {
  name: 'Aarav Sharma',
  contact: {
    email: 'aarav.sharma@example.com',
    phone: '+91-9876543210',
    location: 'Bengaluru, India',
    linkedin: null,
    website: null,
  },
  professionalSummary:
    'Final-year Computer Science student with foundational Python and SQL coursework.',
  skills: ['Python', 'MySQL', 'Git', 'Data Analysis'],
  skillProfile: {
    technical: ['Python', 'MySQL'],
    tools: ['Git'],
    domain: ['Data Analysis'],
    interpersonal: [],
  },
  experience: [],
  projects: [
    {
      name: 'Student Attendance Tracker',
      description: 'Built a simple script using Python and CSV files.',
      technologies: ['Python'],
      highlights: ['Automated attendance logs for 60 students.'],
      url: null,
    },
  ],
  education: [
    {
      institution: 'State Engineering College',
      degree: 'B.Tech',
      fieldOfStudy: 'Computer Science',
      location: 'India',
      startDate: '2022',
      endDate: '2026',
      details: ['Coursework in DBMS and Statistics'],
    },
  ],
  certifications: [],
  strengths: [
    {
      point: 'Foundational Python and SQL skills.',
      evidence: 'Listed Python and MySQL in Skills section.',
      whyItMatters: 'Supports entry-level data and software tasks.',
    },
  ],
  weaknesses: [],
  improvementSuggestions: [
    {
      observation: 'Limited quantified project outcomes.',
      evidence: 'Projects section lists basic attendance script.',
      suggestion: 'Add measurable project outcomes and portfolio links.',
      rationale: 'Helps reviewers verify applied technical depth.',
      expectedResult: 'Stronger project evidence alignment.',
      priority: 'medium',
    },
  ],
  achievements: [],
  activities: [],
  additionalInformation: [],
  evidenceQuality: {
    level: 'mixed',
    summary: 'Foundational skills and academic project documented.',
    evidence: ['Python', 'MySQL'],
  },
  uncertainties: [],
  educationScore: {
    score: 100,
    label: 'complete',
    rationale:
      'Measures completeness of education evidence in this resume only; it does not rate institutions, academic ability, or candidate quality.',
    missingInformation: [],
  },
}

/**
 * Parse every text command (`BT ... ET`) in every page stream of a generated PDF
 * and verify that:
 * 1. All coordinates stay strictly within A4 page margins.
 * 2. No two text items on the same page overlap in 2D bounding box space `[x1, y1, x2, y2]`.
 */
function verifyZeroTextOverlapAndBounds(pdfBytes, label = 'PDF') {
  const pdfString = Buffer.from(pdfBytes).toString('latin1')
  assert.ok(pdfString.startsWith('%PDF-1.4\n'), `${label}: Missing PDF-1.4 header`)
  assert.ok(pdfString.trimEnd().endsWith('%%EOF'), `${label}: Missing %%EOF trailer`)

  const streamRegex = /stream\n([\s\S]*?)\nendstream/g
  let streamMatch
  let pageIndex = 0

  while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
    pageIndex += 1
    const content = streamMatch[1]
    const btRegex = /BT\n\/(F1|F2)\s+([\d.]+)\s+Tf\n[\d.]+\s+[\d.]+\s+[\d.]+\s+rg\n([\d.]+)\s+([\d.]+)\s+Td\n\(([\s\S]*?)\)\s+Tj\nET/g
    const boxes = []
    let btMatch

    while ((btMatch = btRegex.exec(content)) !== null) {
      const font = btMatch[1]
      const fontSize = Number(btMatch[2])
      const x = Number(btMatch[3])
      const y = Number(btMatch[4])
      const rawText = btMatch[5]
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
      const isBold = font === 'F2'
      const width = measurePdfTextWidth(rawText, fontSize, isBold)
      const height = fontSize * 0.85

      // 1. Check A4 horizontal & vertical boundaries
      assert.ok(
        x >= 26 && x + width <= 570,
        `${label} Page ${pageIndex}: Text "${rawText}" overflows horizontal bounds (x=${x}, right=${(x + width).toFixed(1)})`
      )
      assert.ok(
        y >= 16 && y + height <= 832,
        `${label} Page ${pageIndex}: Text "${rawText}" overflows vertical bounds (y=${y})`
      )

      boxes.push({
        text: rawText,
        x1: x,
        y1: y,
        x2: x + width,
        y2: y + height,
      })
    }

    // 2. Pairwise 2D bounding-box overlap check on the page
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]
        const b = boxes[j]
        const horizOverlap = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
        const vertOverlap = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)
        if (horizOverlap > 2 && vertOverlap > 1.5) {
          assert.fail(
            `${label} Page ${pageIndex}: Overlapping text detected between "${a.text}" [${a.x1.toFixed(1)}, ${a.y1.toFixed(1)}..${a.x2.toFixed(1)}] and "${b.text}" [${b.x1.toFixed(1)}, ${b.y1.toFixed(1)}..${b.x2.toFixed(1)}]`
          )
        }
      }
    }
  }

  return pageIndex
}

test('buildRoadmapPdfFilename generates clean role-specific PDF filenames', () => {
  assert.equal(
    buildRoadmapPdfFilename('Data Analyst'),
    'Pathwise_Skills_Roadmap_Data_Analyst.pdf'
  )
  assert.equal(
    buildRoadmapPdfFilename('Web / Full Stack Developer'),
    'Pathwise_Skills_Roadmap_Web_Full_Stack_Developer.pdf'
  )
  assert.equal(
    buildRoadmapPdfFilename(''),
    'Pathwise_Skills_Roadmap_Career_Role.pdf'
  )
})

test('normalizeSkillRoadmapItem distills raw gap data into the 6 concise student-friendly fields', () => {
  const careerResult = scoreCareerMatches(SAMPLE_RESUME_ANALYSIS, 'data-analyst')
  const firstGap = careerResult.targetRoleGap.gaps[0]
  const item = normalizeSkillRoadmapItem(firstGap, 'Data Analyst', new Set(), {}, 0)

  assert.ok(['High', 'Medium', 'Low'].includes(item.priorityLabel))
  assert.ok(item.whatToLearn.length > 15 && item.whatToLearn.length < 220)
  assert.ok(item.actionSteps.length >= 3 && item.actionSteps.length <= 4)
  assert.ok(typeof item.practiceProject === 'string' && item.practiceProject.length > 10)
  assert.ok(item.resource && item.resource.title)
  assert.ok(
    typeof item.completionGoal === 'string' &&
      item.completionGoal.length > 15 &&
      !item.completionGoal.includes('rather than only naming it')
  )
})

test('buildRoadmapDocumentModel organizes roadmap into 3 clear preparation stages', () => {
  const careerResult = scoreCareerMatches(SAMPLE_RESUME_ANALYSIS, 'data-analyst')
  const model = buildRoadmapDocumentModel({
    roleId: 'data-analyst',
    analysis: SAMPLE_RESUME_ANALYSIS,
    career: careerResult,
    completedStepIds: [],
    generatedAt: new Date('2026-10-27T10:00:00Z'),
  })

  assert.equal(model.stages.length, 3)
  assert.equal(model.stages[0].title, 'Stage 1 - Learn the Essentials')
  assert.equal(model.stages[1].title, 'Stage 2 - Practise and Build')
  assert.equal(model.stages[2].title, 'Stage 3 - Prepare for Opportunities')
  assert.ok(model.finalChecklist.length >= 3)
})

test('buildRoadmapDocumentModel and downloadRoadmapPdf throw clear errors when roadmap data is missing', () => {
  assert.throws(
    () => buildRoadmapDocumentModel({ roleId: 'data-analyst', career: null }),
    /Roadmap data is not available/i
  )

  assert.throws(
    () =>
      downloadRoadmapPdf({
        roleId: 'data-analyst',
        career: { targetRoleGap: { role: 'Data Analyst', gaps: [], demonstratedCriteria: [] } },
      }),
    /No roadmap skills or role criteria were found/i
  )
})

test('wrapPdfText wraps long skill names, bullets, and URLs within column width', () => {
  const maxWidth = 403
  const veryLongUrl =
    'https://example-learning-platform.org/courses/data-engineering/modules/advanced-partitioned-window-functions-and-query-execution-plan-optimization?track=data-analyst&cohort=2026'
  const urlLines = wrapPdfText(veryLongUrl, maxWidth, 8.2, false)
  assert.ok(urlLines.length >= 2)
  assert.equal(urlLines.join(''), veryLongUrl)
  for (const uLine of urlLines) {
    assert.ok(measurePdfTextWidth(uLine, 8.2, false) <= maxWidth)
  }
})

test('generateRoadmapPdfBytes produces overlap-free multi-page PDFs across multiple real career roles', () => {
  const roleIds = [
    'data-analyst',
    'java-developer',
    'web-full-stack-developer',
    'ai-automation-developer',
  ]

  for (const roleId of roleIds) {
    const careerResult = scoreCareerMatches(SAMPLE_RESUME_ANALYSIS, roleId)
    const model = buildRoadmapDocumentModel({
      roleId,
      analysis: SAMPLE_RESUME_ANALYSIS,
      career: careerResult,
      completedStepIds: [careerResult.targetRoleGap.gaps[0]?.criterionId].filter(Boolean),
      generatedAt: new Date('2026-10-27T10:00:00Z'),
    })

    const pdfBytes = generateRoadmapPdfBytes(model)
    const pageCount = verifyZeroTextOverlapAndBounds(pdfBytes, `Role:${roleId}`)
    assert.ok(pageCount >= 2, `Expected multi-page PDF for ${roleId}, got ${pageCount}`)

    const pdfString = Buffer.from(pdfBytes).toString('latin1')
    assert.ok(pdfString.includes('Stage 1 - Learn the Essentials'))
    assert.ok(pdfString.includes('Stage 2 - Practise and Build'))
    assert.ok(pdfString.includes('Stage 3 - Prepare for Opportunities'))
    assert.ok(pdfString.includes('What to learn:'))
    assert.ok(pdfString.includes('Action steps:'))
    assert.ok(pdfString.includes('Practice/Project:'))
    assert.ok(pdfString.includes('Resource:'))
    assert.ok(pdfString.includes('Completion goal:'))
    assert.ok(pdfString.includes('FINAL ACTION CHECKLIST'))
    assert.ok(pdfString.includes(`Page 1 of ${pageCount}`))
    assert.ok(pdfString.includes(`Page ${pageCount} of ${pageCount}`))
  }

  // Also verify a short 2-skill roadmap with empty stages renders cleanly without overlap
  const fullDataAnalyst = scoreCareerMatches(SAMPLE_RESUME_ANALYSIS, 'data-analyst')
  const shortCareer = {
    ...fullDataAnalyst,
    targetRoleGap: {
      ...fullDataAnalyst.targetRoleGap,
      gaps: fullDataAnalyst.targetRoleGap.gaps.slice(0, 2),
    },
  }
  const shortModel = buildRoadmapDocumentModel({
    roleId: 'data-analyst',
    analysis: SAMPLE_RESUME_ANALYSIS,
    career: shortCareer,
    completedStepIds: [],
    generatedAt: new Date('2026-10-27T10:00:00Z'),
  })
  const shortPdfBytes = generateRoadmapPdfBytes(shortModel)
  const shortPageCount = verifyZeroTextOverlapAndBounds(shortPdfBytes, 'ShortRoadmap')
  assert.ok(shortPageCount >= 1)
})
