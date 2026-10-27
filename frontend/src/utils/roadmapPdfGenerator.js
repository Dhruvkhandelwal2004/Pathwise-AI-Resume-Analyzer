/**
 * Pathwise Skills Roadmap — Concise 3-Stage Strategy & Full-Page A4 Vector PDF Generator
 *
 * Transforms raw role-gap data into a short, student-friendly 3-stage preparation
 * strategy (both for the UI and for A4 PDF export) and generates a selectable-text
 * multi-page PDF 1.4 document that utilizes the full A4 width and height with
 * balanced margins and zero overlapping elements.
 */

const PAGE_WIDTH = 595.28 // A4 width in pt
const PAGE_HEIGHT = 841.89 // A4 height in pt
const MARGIN_LEFT = 28 // Balanced 28pt (~9.9mm) left margin
const MARGIN_RIGHT = 28 // Balanced 28pt (~9.9mm) right margin
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT // 539.28pt full content width
const CONTENT_RIGHT_X = PAGE_WIDTH - MARGIN_RIGHT // 567.28pt

const TOP_CONTENT_Y_FIRST_PAGE = PAGE_HEIGHT - 28 // 813.89pt
const TOP_CONTENT_Y_NEXT_PAGE = PAGE_HEIGHT - 42 // 799.89pt (below running header at 819.89..811.89)
const BOTTOM_CONTENT_MIN_Y = 38 // Above footer rule at 31pt and footer text at 20pt

// Two-column skill card geometry spanning the full 539.28pt card width
const LABEL_COL_X = MARGIN_LEFT + 8 // 36pt
const COL_DIVIDER_X = MARGIN_LEFT + 82 // 110pt
const VALUE_COL_X = MARGIN_LEFT + 89 // 117pt
const VALUE_COL_WIDTH = CONTENT_RIGHT_X - 8 - VALUE_COL_X // 442.28pt

// Theme palette (RGB 0..1)
const COLORS = {
  slateDark: [0.059, 0.09, 0.165], // #0f172a
  slateBody: [0.2, 0.255, 0.333], // #334155
  slateMuted: [0.392, 0.455, 0.545], // #64748b
  emerald: [0.059, 0.463, 0.337], // #0f7656
  emeraldDark: [0.047, 0.36, 0.263], // #0c5c43
  mintBg: [0.953, 0.982, 0.969], // #f3faf7
  mintBorder: [0.76, 0.882, 0.827], // #c2e1d3
  cardBg: [0.988, 0.992, 0.99], // #fcfdfd
  labelColBg: [0.976, 0.984, 0.98], // #f9fbfa
  cardBorder: [0.835, 0.875, 0.855], // #d5dfda
  ruleLight: [0.886, 0.91, 0.925], // #e2e8ec
  white: [1, 1, 1],
  highBg: [1.0, 0.945, 0.949], // #fff1f2
  highBorder: [0.996, 0.804, 0.827], // #fecdd3
  highText: [0.745, 0.071, 0.235], // #be123c
  medBg: [0.996, 0.953, 0.78], // #fef3c7
  medBorder: [0.992, 0.902, 0.541], // #fde68a
  medText: [0.706, 0.325, 0.035], // #b45309
  lowBg: [0.902, 0.957, 0.933], // #e6f4ee
  lowBorder: [0.749, 0.878, 0.82], // #bfe0d1
  lowText: [0.059, 0.463, 0.337], // #0f7656
  linkEmerald: [0.059, 0.463, 0.337], // #0f7656
}

// Official Adobe Font Metrics (AFM) character widths (in 1/1000ths of 1pt) for Type1 Helvetica
const HELVETICA_REGULAR_AFM = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
  '@': 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '[': 278,
  '\\': 278, ']': 278, '^': 469, _: 556, '`': 333, a: 556, b: 556, c: 500, d: 556,
  e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556,
  o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500,
  y: 500, z: 500, '{': 334, '|': 260, '}': 334, '~': 584,
}

// Official Adobe Font Metrics (AFM) character widths (in 1/1000ths of 1pt) for Type1 Helvetica-Bold
const HELVETICA_BOLD_AFM = {
  ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, "'": 238,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611,
  '@': 975, A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '[': 333,
  '\\': 278, ']': 333, '^': 584, _: 556, '`': 333, a: 556, b: 611, c: 556, d: 611,
  e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889, n: 611,
  o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556,
  y: 556, z: 500, '{': 389, '|': 280, '}': 389, '~': 584,
}

/**
 * Sanitize role title into a safe, descriptive PDF filename.
 * Example: "Data Analyst" -> "Pathwise_Skills_Roadmap_Data_Analyst.pdf"
 */
export function buildRoadmapPdfFilename(roleTitle) {
  const raw = String(roleTitle || 'Career_Role').trim()
  const cleaned = raw
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  const suffix = cleaned || 'Career_Role'
  return `Pathwise_Skills_Roadmap_${suffix}.pdf`
}

/**
 * Normalize Unicode punctuation into clean printable ASCII / WinAnsi characters
 * so standard PDF Type1 Helvetica renders every character cleanly.
 */
export function sanitizePdfText(input) {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/\u2192/g, '->')
    .replace(/[\u2022\u00B7]/g, '|')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isGenericBoilerplateCompletion(text) {
  const lower = String(text || '').toLowerCase()
  return (
    lower.includes('rather than only naming it') ||
    lower.includes('keep a reviewable artifact such as code') ||
    lower.includes('explain the objective, your own contribution') ||
    lower.includes('do not add metrics or outcomes unless')
  )
}

function buildConciseWhatToLearn(gap, roleTitle) {
  const req = sanitizePdfText(gap?.requirement || 'Core Skill')
  const rawObj = sanitizePdfText(gap?.learningObjective || '')

  let base
  if (
    rawObj &&
    !rawObj.toLowerCase().startsWith('apply ') &&
    !rawObj.toLowerCase().startsWith('produce direct project evidence') &&
    !rawObj.toLowerCase().startsWith('demonstrate the responsibilities')
  ) {
    base = rawObj
  } else if (gap?.kind === 'project') {
    base = `How to structure, build, and document a real ${roleTitle} project demonstrating ${req}.`
  } else if (gap?.kind === 'experience') {
    base = `Practical ${roleTitle} workflows, responsibilities, and problem-solving using ${req}.`
  } else if (gap?.kind === 'education' || gap?.kind === 'certification') {
    base = `Core curriculum concepts and verified credential requirements for ${req}.`
  } else {
    base = `Core concepts, syntax, and practical ${roleTitle} workflows for ${req}.`
  }

  if (gap?.status === 'partially-demonstrated') {
    return `${base} (Partially shown in your resume; strengthen with direct ${gap?.kind || 'project'} evidence.)`
  }
  return base
}

function buildConciseActionSteps(gap, roleTitle) {
  const req = sanitizePdfText(gap?.requirement || 'this skill')
  const rawSteps = Array.isArray(gap?.actionPoints) ? gap.actionPoints : []
  const cleaned = rawSteps
    .map((s) => sanitizePdfText(s))
    .filter(Boolean)
    .slice(0, 4)

  if (cleaned.length >= 3) {
    return cleaned
  }

  const fallback = [
    ...cleaned,
    `Learn the core concepts and everyday workflow of ${req} for ${roleTitle}.`,
    `Practise with a small hands-on exercise and verify your output.`,
    `Document your solution and key takeaways in a clean portfolio note or repository.`,
  ]
  return Array.from(new Set(fallback)).slice(0, 4)
}

function buildConcisePracticeProject(gap, roleTitle) {
  const req = sanitizePdfText(gap?.requirement || 'this skill')
  const miniProj = sanitizePdfText(gap?.practiceTasks?.miniProject || '')
  const guided = sanitizePdfText(gap?.practiceTasks?.guidedLab || '')
  const deliv = sanitizePdfText(gap?.deliverable || '')

  if (miniProj && miniProj.length <= 135) {
    return miniProj
  }
  if (deliv && deliv.length <= 135) {
    return deliv
  }
  if (guided && guided.length <= 135) {
    return guided
  }
  if (miniProj) {
    const firstSentence = miniProj.split(/(?<=\.)\s+/)[0]
    return firstSentence || miniProj
  }
  return `Build and test a small, version-controlled ${roleTitle} mini-project demonstrating ${req}.`
}

function buildConciseResource(gap, roleTitle) {
  const rawList = Array.isArray(gap?.learningResources) ? gap.learningResources : []
  for (const r of rawList) {
    if (!r) continue
    if (typeof r === 'string') {
      const title = sanitizePdfText(r)
      if (title) return { title, provider: '', url: '' }
    } else {
      const title = sanitizePdfText(r.title || r.name || '')
      const provider = sanitizePdfText(r.provider || r.type || '')
      const url = sanitizePdfText(r.url || '')
      if (title) return { title, provider, url }
    }
  }
  const req = sanitizePdfText(gap?.requirement || 'Skill')
  return {
    title: `Official ${req} Documentation & Reference`,
    provider: `${roleTitle} Core Curriculum`,
    url: '',
  }
}

function buildConciseCompletionGoal(gap, roleTitle) {
  const req = sanitizePdfText(gap?.requirement || 'this skill')
  const rawCriteria = Array.isArray(gap?.completionCriteria) ? gap.completionCriteria : []
  const customGoal = rawCriteria
    .map((c) => sanitizePdfText(c))
    .find((c) => c && !isGenericBoilerplateCompletion(c))

  if (customGoal) {
    return customGoal
  }

  if (gap?.kind === 'project') {
    return `You have a published, reviewable ${roleTitle} project repository or case study clearly demonstrating ${req}.`
  }
  if (gap?.kind === 'experience') {
    return `You can explain and show a completed work sample or case study applying ${req} in a ${roleTitle} scenario.`
  }
  if (gap?.kind === 'education' || gap?.kind === 'certification') {
    return `Your completed coursework or verified credential for ${req} is clearly documented with issuer and date.`
  }
  return `You can confidently apply ${req} in a practical ${roleTitle} task and show a working code or analysis sample.`
}

/**
 * Distill a raw gap object into the 6 concise, student-friendly fields.
 * Used by both the Skills Roadmap webpage and the PDF generator.
 */
export function normalizeSkillRoadmapItem(gap, arg2, arg3, arg4, arg5) {
  let roleTitle = 'Target Role'
  let completedSet = new Set()
  let _studentInputs = {}
  let index = 0

  if (typeof arg2 === 'string') {
    roleTitle = arg2 || 'Target Role'
    if (arg3 instanceof Set) completedSet = arg3
    else if (Array.isArray(arg3)) completedSet = new Set(arg3)
    if (arg4 && typeof arg4 === 'object' && !(arg4 instanceof Set)) _studentInputs = arg4
    if (typeof arg5 === 'number') index = arg5
  } else if (typeof arg2 === 'number') {
    index = arg2
    if (typeof arg3 === 'string') roleTitle = arg3 || 'Target Role'
    if (arg4 instanceof Set) completedSet = arg4
    else if (Array.isArray(arg4)) completedSet = new Set(arg4)
    if (arg5 && typeof arg5 === 'object' && !(arg5 instanceof Set)) _studentInputs = arg5
  } else if (arg3 || arg4 || arg5) {
    if (typeof arg3 === 'string') roleTitle = arg3
    if (arg4 instanceof Set) completedSet = arg4
    if (typeof arg5 === 'number') index = arg5
  }

  const id = sanitizePdfText(gap?.criterionId || `skill-${index + 1}`)
  const skillName = sanitizePdfText(gap?.requirement || `Skill ${index + 1}`)
  const rawPriority =
    typeof gap?.priority === 'object' && gap?.priority !== null
      ? gap?.priority?.level
      : gap?.priority
  const priorityLevel =
    rawPriority === 'high' ? 'high' : rawPriority === 'low' ? 'low' : 'medium'
  const priorityLabel =
    priorityLevel === 'high' ? 'High' : priorityLevel === 'low' ? 'Low' : 'Medium'

  const status = gap?.status || 'missing-from-resume'
  const statusLabel =
    status === 'partially-demonstrated' ? 'Partial Evidence in Resume' : 'Not Detected in Resume'

  return {
    id,
    criterionId: id,
    index: index + 1,
    skillName,
    kind: sanitizePdfText(gap?.kind || 'skill'),
    priorityLevel,
    priorityLabel,
    status,
    statusLabel,
    isCompleted: completedSet.has(id),
    whatToLearn: buildConciseWhatToLearn(gap, roleTitle),
    actionSteps: buildConciseActionSteps(gap, roleTitle),
    practiceProject: buildConcisePracticeProject(gap, roleTitle),
    resource: buildConciseResource(gap, roleTitle),
    completionGoal: buildConciseCompletionGoal(gap, roleTitle),
    matchedEvidence: Array.isArray(gap?.matchedEvidence) ? gap.matchedEvidence : [],
    missingEvidence: Array.isArray(gap?.missingEvidence) ? gap.missingEvidence : [],
  }
}

/**
 * Build a validated, role-specific 3-stage roadmap model for both UI and PDF export.
 * Throws a descriptive Error if roadmap data is missing or empty.
 */
export function buildRoadmapDocumentModel({
  roleId,
  roleProfile,
  analysis,
  career,
  completedStepIds = [],
  generatedAt = new Date(),
} = {}) {
  const targetRoleGap = career?.targetRoleGap
  const selectedRoleMatch = career?.selectedRoleMatch

  if (!targetRoleGap && !selectedRoleMatch) {
    throw new Error('Roadmap data is not available for the selected career role.')
  }

  const rawGaps = Array.isArray(targetRoleGap?.gaps) ? targetRoleGap.gaps : []
  const rawDemonstrated = Array.isArray(targetRoleGap?.demonstratedCriteria)
    ? targetRoleGap.demonstratedCriteria
    : []

  if (rawGaps.length === 0 && rawDemonstrated.length === 0) {
    throw new Error('No roadmap skills or role criteria were found to export.')
  }

  const roleTitle = sanitizePdfText(
    targetRoleGap?.role || selectedRoleMatch?.role || roleProfile?.title || roleId || 'Career Role'
  )
  const cleanRoleId = sanitizePdfText(
    targetRoleGap?.roleId || selectedRoleMatch?.roleId || roleId || 'role'
  )
  const candidateName = sanitizePdfText(analysis?.name || 'Student Candidate')

  const roleScore =
    typeof selectedRoleMatch?.score === 'number'
      ? Math.round(selectedRoleMatch.score)
      : typeof targetRoleGap?.currentScore === 'number'
        ? Math.round(targetRoleGap.currentScore)
        : 0

  const completedSet = new Set(Array.isArray(completedStepIds) ? completedStepIds : [])

  const skills = rawGaps.map((gap, index) =>
    normalizeSkillRoadmapItem(gap, index, roleTitle, completedSet)
  )

  const highSkills = skills.filter((s) => s.priorityLevel === 'high')
  const mediumSkills = skills.filter((s) => s.priorityLevel === 'medium')
  const lowSkills = skills.filter((s) => s.priorityLevel === 'low')

  const stages = [
    {
      stageNumber: 1,
      id: 'stage-1',
      title: 'Stage 1 - Learn the Essentials',
      shortTitle: 'Learn the Essentials',
      priorityBadge: 'High Priority',
      priorityLevel: 'high',
      subtitle:
        'Focus on high-priority core skills and prerequisites first to establish a strong foundation.',
      items: highSkills,
      emptyNote:
        'All high-priority core essentials are already demonstrated in your resume. Proceed directly to Stage 2.',
    },
    {
      stageNumber: 2,
      id: 'stage-2',
      title: 'Stage 2 - Practise and Build',
      shortTitle: 'Practise and Build',
      priorityBadge: 'Medium Priority',
      priorityLevel: 'medium',
      subtitle:
        'Apply your knowledge through hands-on exercises, practical workflows, and portfolio mini-projects.',
      items: mediumSkills,
      emptyNote:
        'No medium-priority skill gaps remain for this role. Focus on building and polishing your portfolio.',
    },
    {
      stageNumber: 3,
      id: 'stage-3',
      title: 'Stage 3 - Prepare for Opportunities',
      shortTitle: 'Prepare for Opportunities',
      priorityBadge: 'Low Priority & Readiness',
      priorityLevel: 'low',
      subtitle:
        'Round out optional specializations, polish your GitHub/portfolio links, and prepare for role interviews.',
      items: lowSkills,
      emptyNote:
        'All optional specialization criteria are covered. Focus on final portfolio review and interview practice.',
    },
  ]

  const demonstrated = rawDemonstrated.map((item) => ({
    requirement: sanitizePdfText(item?.requirement || item?.label || 'Demonstrated Skill'),
    kind: sanitizePdfText(item?.kind || 'skill'),
  }))

  const completedCount = skills.filter((s) => s.isCompleted).length

  const dateObj = generatedAt instanceof Date ? generatedAt : new Date(generatedAt)
  const formattedDate = Number.isNaN(dateObj.getTime())
    ? new Date().toISOString().slice(0, 10)
    : dateObj.toISOString().slice(0, 10)

  const careerObjective = sanitizePdfText(
    roleProfile?.shortDescription ||
      `Build job-ready ${roleTitle} skills step by step, close key resume evidence gaps, and prepare a clean project portfolio for technical interviews.`
  )

  const topHighNames = highSkills
    .slice(0, 2)
    .map((s) => s.skillName)
    .join(' and ')
  const topMedNames = mediumSkills
    .slice(0, 2)
    .map((s) => s.skillName)
    .join(' and ')

  const finalChecklist = [
    topHighNames
      ? `Complete Stage 1 essentials first: focus on ${topHighNames}.`
      : `Review your foundational ${roleTitle} concepts and keep core skills sharp.`,
    topMedNames
      ? `Build and push at least one practical project covering ${topMedNames} with a clear README.`
      : `Publish a clean, reproducible ${roleTitle} mini-project on GitHub with setup steps.`,
    `Update your resume with factual bullet points backed by real project or coursework evidence.`,
    `Re-upload your updated resume PDF in Pathwise to verify your improved ${roleTitle} match score.`,
  ]

  return {
    documentTitle: `${roleTitle} - Skills Roadmap`,
    brandName: 'Pathwise',
    brandSubtitle: 'AI Resume Analyzer & Career Guidance',
    roleTitle,
    roleId: cleanRoleId,
    candidateName,
    roleScore,
    careerObjective,
    formattedDate,
    totalSkills: skills.length,
    completedCount,
    demonstrated,
    skills,
    stages,
    priorities: {
      high: highSkills,
      medium: mediumSkills,
      low: lowSkills,
    },
    finalChecklist,
    evidenceDisclaimer:
      'Note: Skills listed below were not detected in your uploaded resume PDF; this does not mean you lack the skill.',
  }
}

/**
 * Exact Adobe Type1 Helvetica / Helvetica-Bold character width lookup.
 */
function charWidthFactor(ch, isBold = false) {
  const table = isBold ? HELVETICA_BOLD_AFM : HELVETICA_REGULAR_AFM
  const w = table[ch]
  if (typeof w === 'number') {
    return w / 1000
  }
  return isBold ? 0.58 : 0.54
}

export function measurePdfTextWidth(text, fontSize, isBold = false) {
  const str = String(text || '')
  let total = 0
  for (let i = 0; i < str.length; i += 1) {
    total += charWidthFactor(str[i], isBold) * fontSize
  }
  return total
}

function splitLongToken(token, maxWidthPt, fontSize, isBold) {
  const chunks = []
  let remaining = token
  while (remaining.length > 0) {
    if (measurePdfTextWidth(remaining, fontSize, isBold) <= maxWidthPt) {
      chunks.push(remaining)
      break
    }
    let low = 1
    let high = remaining.length
    let fit = 1
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const slice = remaining.slice(0, mid)
      if (measurePdfTextWidth(slice, fontSize, isBold) <= maxWidthPt) {
        fit = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }
    let splitAt = fit
    const minBack = Math.max(1, fit - 18)
    for (let i = fit; i >= minBack; i -= 1) {
      const c = remaining[i - 1]
      if ('/-_?&=.:'.includes(c)) {
        splitAt = i
        break
      }
    }
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt)
  }
  return chunks
}

/**
 * Wrap text into lines guaranteed to fit inside `maxWidthPt`.
 */
export function wrapPdfText(text, maxWidthPt, fontSize = 9, isBold = false) {
  const clean = sanitizePdfText(text)
  if (!clean) return []

  const rawWords = clean.split(' ').filter(Boolean)
  const words = []
  for (const w of rawWords) {
    if (measurePdfTextWidth(w, fontSize, isBold) > maxWidthPt) {
      words.push(...splitLongToken(w, maxWidthPt, fontSize, isBold))
    } else {
      words.push(w)
    }
  }

  const lines = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    const candidate = `${current} ${word}`
    if (measurePdfTextWidth(candidate, fontSize, isBold) <= maxWidthPt) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function escapePdfLiteral(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function fmtNum(n) {
  return Number(n).toFixed(2).replace(/\.00$/, '')
}

function rgbFillCmd([r, g, b]) {
  return `${fmtNum(r)} ${fmtNum(g)} ${fmtNum(b)} rg`
}

function rgbStrokeCmd([r, g, b]) {
  return `${fmtNum(r)} ${fmtNum(g)} ${fmtNum(b)} RG`
}

function getPriorityStyle(priorityLevel) {
  if (priorityLevel === 'high') {
    return {
      text: 'Priority: High',
      bg: COLORS.highBg,
      border: COLORS.highBorder,
      fg: COLORS.highText,
    }
  }
  if (priorityLevel === 'low') {
    return {
      text: 'Priority: Low',
      bg: COLORS.lowBg,
      border: COLORS.lowBorder,
      fg: COLORS.lowText,
    }
  }
  return {
    text: 'Priority: Medium',
    bg: COLORS.medBg,
    border: COLORS.medBorder,
    fg: COLORS.medText,
  }
}

class PdfDocumentBuilder {
  constructor(meta) {
    this.meta = meta
    this.pages = []
    this.currentPage = null
    this.cursorY = TOP_CONTENT_Y_FIRST_PAGE
  }

  startNewPage(isFirst = false) {
    const page = {
      commands: [],
      links: [],
      isFirst,
    }
    this.pages.push(page)
    this.currentPage = page
    if (isFirst) {
      this.cursorY = TOP_CONTENT_Y_FIRST_PAGE
    } else {
      this.drawRunningHeader()
      this.cursorY = TOP_CONTENT_Y_NEXT_PAGE
    }
  }

  pushCmd(cmd) {
    this.currentPage.commands.push(cmd)
  }

  drawRect(x, y, width, height, { fill, stroke, lineWidth = 0.7 } = {}) {
    this.pushCmd('q')
    if (fill) this.pushCmd(rgbFillCmd(fill))
    if (stroke) {
      this.pushCmd(rgbStrokeCmd(stroke))
      this.pushCmd(`${fmtNum(lineWidth)} w`)
    }
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S'
    this.pushCmd(`${fmtNum(x)} ${fmtNum(y)} ${fmtNum(width)} ${fmtNum(height)} re ${op}`)
    this.pushCmd('Q')
  }

  drawLine(x1, y1, x2, y2, color = COLORS.ruleLight, lineWidth = 0.7) {
    this.pushCmd('q')
    this.pushCmd(rgbStrokeCmd(color))
    this.pushCmd(`${fmtNum(lineWidth)} w`)
    this.pushCmd(`${fmtNum(x1)} ${fmtNum(y1)} m ${fmtNum(x2)} ${fmtNum(y2)} l S`)
    this.pushCmd('Q')
  }

  drawTextLine(text, x, y, { font = 'F1', size = 8.8, color = COLORS.slateBody } = {}) {
    const clean = sanitizePdfText(text)
    if (!clean) return
    this.pushCmd('BT')
    this.pushCmd(`/${font} ${fmtNum(size)} Tf`)
    this.pushCmd(rgbFillCmd(color))
    this.pushCmd(`${fmtNum(x)} ${fmtNum(y)} Td`)
    this.pushCmd(`(${escapePdfLiteral(clean)}) Tj`)
    this.pushCmd('ET')
  }

  addLinkAnnotation(x, y, width, height, url) {
    if (!url || !/^https?:\/\//i.test(url)) return
    this.currentPage.links.push({
      rect: [x, y, x + width, y + height],
      url: sanitizePdfText(url),
    })
  }

  drawRunningHeader() {
    const headerY = PAGE_HEIGHT - 22
    this.drawTextLine('PATHWISE  |  SKILLS ROADMAP', MARGIN_LEFT, headerY, {
      font: 'F2',
      size: 7.6,
      color: COLORS.emerald,
    })
    const rightText =
      wrapPdfText(
        `${this.meta.roleTitle}  |  Alignment: ${this.meta.roleScore}/100`,
        260,
        7.6,
        false
      )[0] || this.meta.roleTitle
    const rw = measurePdfTextWidth(rightText, 7.6, false)
    this.drawTextLine(rightText, CONTENT_RIGHT_X - rw, headerY, {
      font: 'F1',
      size: 7.6,
      color: COLORS.slateMuted,
    })
    this.drawLine(
      MARGIN_LEFT,
      PAGE_HEIGHT - 28,
      CONTENT_RIGHT_X,
      PAGE_HEIGHT - 28,
      COLORS.cardBorder,
      0.6
    )
  }

  drawAllFooters() {
    const total = this.pages.length
    this.pages.forEach((page, idx) => {
      const prevPage = this.currentPage
      this.currentPage = page
      const footerY = 19
      this.drawLine(MARGIN_LEFT, 30, CONTENT_RIGHT_X, 30, COLORS.cardBorder, 0.6)
      const leftFooter = `Pathwise Career Guidance  |  ${this.meta.roleTitle}  |  ${this.meta.formattedDate}`
      const safeLeft = wrapPdfText(leftFooter, CONTENT_WIDTH - 90, 7.5, false)[0] || leftFooter
      this.drawTextLine(safeLeft, MARGIN_LEFT, footerY, {
        font: 'F1',
        size: 7.5,
        color: COLORS.slateMuted,
      })
      const pageLabel = `Page ${idx + 1} of ${total}`
      const pw = measurePdfTextWidth(pageLabel, 7.5, true)
      this.drawTextLine(pageLabel, CONTENT_RIGHT_X - pw, footerY, {
        font: 'F2',
        size: 7.5,
        color: COLORS.slateDark,
      })
      this.currentPage = prevPage
    })
  }
}

/**
 * Pre-wrap and measure a block under a given layout density preset (`metrics`).
 * This allows us to pack pages efficiently and distribute vertical slack naturally
 * across row padding and inter-card spacing on every page.
 */
function prepareLayoutBlock(rawBlock, model, metrics) {
  const {
    bodySize,
    stepSize,
    lineH,
    stepLineH,
    rowPadY,
    headerBarPadY,
    gapAfterCard,
    gapAfterStage,
  } = metrics

  if (rawBlock.type === 'header_overview') {
    const badgeText = `Alignment: ${model.roleScore}/100  |  ${model.totalSkills} Skills to Build`
    const badgeW = measurePdfTextWidth(badgeText, 8, true) + 18
    const maxTitleW = CONTENT_WIDTH - badgeW - 36
    const titleLines = wrapPdfText(model.documentTitle, maxTitleW, 14.2, true)
    const metaString = `Target Role: ${model.roleTitle}   |   Candidate: ${model.candidateName}   |   Date: ${model.formattedDate}`
    const metaLines = wrapPdfText(metaString, CONTENT_WIDTH - 24, 8.4, false)
    const bannerH = 22 + titleLines.length * 15.5 + metaLines.length * 11.5 + 8

    const innerObjWidth = CONTENT_WIDTH - 20
    const objLines = wrapPdfText(model.careerObjective, innerObjWidth, bodySize, false)
    const progressSummary =
      model.demonstrated.length > 0
        ? `Already in Your Resume (${model.demonstrated.length} matched): ${model.demonstrated.map((d) => d.requirement).join(', ')}.`
        : 'Already in Your Resume: No direct criteria were matched yet in your uploaded PDF - start with Stage 1 below.'
    const demoLines = wrapPdfText(progressSummary, innerObjWidth, 8.4, false)
    const noteLines = wrapPdfText(model.evidenceDisclaimer, innerObjWidth, 7.9, false)

    const objBoxH =
      18 +
      objLines.length * lineH +
      3 +
      demoLines.length * (lineH - 0.4) +
      2 +
      noteLines.length * (lineH - 0.8) +
      8

    return {
      type: 'header_overview',
      bannerH,
      badgeText,
      badgeW,
      titleLines,
      metaLines,
      objBoxH,
      objLines,
      demoLines,
      noteLines,
      rowCount: 2,
      baseHeight: bannerH + 6 + objBoxH,
      gapAfter: gapAfterStage + 2,
    }
  }

  if (rawBlock.type === 'stage_banner') {
    const { stage } = rawBlock
    const countLabel = `${stage.items.length} ${stage.items.length === 1 ? 'Skill' : 'Skills'}  |  ${stage.priorityBadge}`
    const countPillW = measurePdfTextWidth(countLabel, 7.5, true) + 14
    const subLines = wrapPdfText(stage.subtitle, CONTENT_WIDTH - 24, 8.2, false)
    const boxH = 21 + subLines.length * 10.8 + (stage.items.length === 0 ? 16 : 4)
    const emptyLines =
      stage.items.length === 0
        ? wrapPdfText(stage.emptyNote, CONTENT_WIDTH - 24, 8.3, false)
        : []

    return {
      type: 'stage_banner',
      stage,
      countLabel,
      countPillW,
      subLines,
      emptyLines,
      boxH,
      rowCount: 1,
      baseHeight: boxH,
      gapAfter: gapAfterStage,
    }
  }

  if (rawBlock.type === 'skill_card') {
    const { skill, indexInStage } = rawBlock
    const pStyle = getPriorityStyle(skill.priorityLevel)
    const statusSuffix = skill.isCompleted ? '  |  Completed' : ''
    const pillLabel = `${pStyle.text}${statusSuffix}`
    const pillW = measurePdfTextWidth(pillLabel, 7.5, true) + 14

    const maxTitleWidth = CONTENT_WIDTH - pillW - 28
    const fullHeading = `${indexInStage + 1}. ${skill.skillName}`
    const titleLines = wrapPdfText(fullHeading, maxTitleWidth, 9.8, true)
    const headerBarH = Math.max(20, titleLines.length * 12 + headerBarPadY * 2)

    const bulletIndent = 12
    const learnLines = wrapPdfText(skill.whatToLearn || '', VALUE_COL_WIDTH, bodySize, false)
    const stepItems = (skill.actionSteps || []).map((s, idx) => ({
      num: `${idx + 1}.`,
      lines: wrapPdfText(s, VALUE_COL_WIDTH - bulletIndent, stepSize, false),
    }))
    const practiceLines = wrapPdfText(skill.practiceProject || '', VALUE_COL_WIDTH, bodySize, false)

    const rTitle =
      skill.resource && skill.resource.title
        ? skill.resource.provider
          ? `${skill.resource.title} (${skill.resource.provider})`
          : skill.resource.title
        : 'Official Documentation & Reference'
    const resourceTitleLines = wrapPdfText(rTitle, VALUE_COL_WIDTH, stepSize, false)
    const resourceUrlLines =
      skill.resource && skill.resource.url
        ? wrapPdfText(skill.resource.url, VALUE_COL_WIDTH, 8.0, false)
        : []

    const goalLines = wrapPdfText(skill.completionGoal || '', VALUE_COL_WIDTH, bodySize, false)

    const learnRowH = learnLines.length * lineH + rowPadY * 2
    const totalStepLines = stepItems.reduce((acc, it) => acc + it.lines.length, 0)
    const stepsRowH = totalStepLines * stepLineH + rowPadY * 2
    const practiceRowH = practiceLines.length * lineH + rowPadY * 2
    const resourceRowH =
      resourceTitleLines.length * stepLineH + resourceUrlLines.length * 10.4 + rowPadY * 2
    const goalRowH = goalLines.length * lineH + rowPadY * 2

    const bodyH = learnRowH + stepsRowH + practiceRowH + resourceRowH + goalRowH
    const totalCardH = headerBarH + bodyH

    return {
      type: 'skill_card',
      skill,
      indexInStage,
      pStyle,
      pillLabel,
      pillW,
      titleLines,
      headerBarH,
      bulletIndent,
      learnLines,
      stepItems,
      practiceLines,
      resourceTitleLines,
      resourceUrlLines,
      resourceUrl: skill.resource?.url || '',
      goalLines,
      learnRowH,
      stepsRowH,
      practiceRowH,
      resourceRowH,
      goalRowH,
      rowCount: 5,
      baseHeight: totalCardH,
      gapAfter: gapAfterCard,
    }
  }

  if (rawBlock.type === 'checklist') {
    const checkIndent = 18
    const items = (model.finalChecklist || []).map((item, idx) => ({
      num: `[${idx + 1}]`,
      lines: wrapPdfText(item, CONTENT_WIDTH - checkIndent - 18, bodySize, false),
    }))
    const headerBarH = 20
    const totalLines = items.reduce((acc, it) => acc + it.lines.length, 0)
    const bodyH = totalLines * lineH + items.length * 2.5 + rowPadY * 2 + 4
    return {
      type: 'checklist',
      items,
      checkIndent,
      headerBarH,
      bodyH,
      rowCount: Math.max(2, items.length),
      baseHeight: headerBarH + bodyH,
      gapAfter: 0,
    }
  }

  return null
}

/**
 * Group prepared blocks into pages while keeping every stage header attached
 * to its first skill card.
 */
function paginateBlocks(preparedBlocks) {
  const units = []
  let i = 0
  while (i < preparedBlocks.length) {
    const curr = preparedBlocks[i]
    if (
      curr.type === 'stage_banner' &&
      i + 1 < preparedBlocks.length &&
      preparedBlocks[i + 1].type === 'skill_card'
    ) {
      units.push([curr, preparedBlocks[i + 1]])
      i += 2
    } else {
      units.push([curr])
      i += 1
    }
  }

  const pages = []
  let currentBlocks = []
  let isFirstPage = true
  let availH = TOP_CONTENT_Y_FIRST_PAGE - BOTTOM_CONTENT_MIN_Y
  let usedH = 0

  for (const unit of units) {
    const unitHeight = unit.reduce((acc, b, idx) => {
      const gap = idx < unit.length - 1 ? b.gapAfter : 0
      return acc + b.baseHeight + gap
    }, 0)
    const precedingGap =
      currentBlocks.length > 0 ? currentBlocks[currentBlocks.length - 1].gapAfter : 0

    if (currentBlocks.length > 0 && usedH + precedingGap + unitHeight > availH) {
      pages.push({ isFirstPage, availH, blocks: currentBlocks })
      isFirstPage = false
      availH = TOP_CONTENT_Y_NEXT_PAGE - BOTTOM_CONTENT_MIN_Y
      currentBlocks = [...unit]
      usedH = unitHeight
    } else {
      if (currentBlocks.length > 0) {
        usedH += precedingGap
      }
      currentBlocks.push(...unit)
      usedH += unitHeight
    }
  }

  if (currentBlocks.length > 0) {
    pages.push({ isFirstPage, availH, blocks: currentBlocks })
  }

  // Balance the last two pages so content distributes evenly across available page height
  // without leaving an unnecessarily large blank space on the final page.
  if (pages.length >= 2) {
    const lastPage = pages[pages.length - 1]
    const prevPage = pages[pages.length - 2]
    const sumPageHeight = (blks) =>
      blks.reduce(
        (acc, b, idx) => acc + b.baseHeight + (idx < blks.length - 1 ? b.gapAfter : 0),
        0
      )

    let lastH = sumPageHeight(lastPage.blocks)
    let prevH = sumPageHeight(prevPage.blocks)

    while (prevPage.blocks.length >= 3) {
      const candidate = prevPage.blocks[prevPage.blocks.length - 1]
      const beforeCandidate = prevPage.blocks[prevPage.blocks.length - 2]
      // Never detach the first skill card from its stage banner on prevPage unless both move together
      if (beforeCandidate && beforeCandidate.type === 'stage_banner') {
        if (prevPage.blocks.length >= 4) {
          const movePair = prevPage.blocks.slice(-2)
          const pairH = movePair[0].baseHeight + movePair[0].gapAfter + movePair[1].baseHeight
          if (
            lastH + movePair[1].gapAfter + pairH <= lastPage.availH * 0.94 &&
            Math.abs(prevH - pairH - (lastH + pairH)) < Math.abs(prevH - lastH)
          ) {
            prevPage.blocks.splice(-2, 2)
            lastPage.blocks.unshift(...movePair)
            prevH = sumPageHeight(prevPage.blocks)
            lastH = sumPageHeight(lastPage.blocks)
            continue
          }
        }
        break
      }
      const moveH = candidate.baseHeight + candidate.gapAfter
      if (
        lastH + moveH <= lastPage.availH * 0.94 &&
        (lastH < lastPage.availH * 0.65 ||
          Math.abs(prevH - moveH - (lastH + moveH)) < Math.abs(prevH - lastH))
      ) {
        prevPage.blocks.pop()
        lastPage.blocks.unshift(candidate)
        prevH = sumPageHeight(prevPage.blocks)
        lastH = sumPageHeight(lastPage.blocks)
      } else {
        break
      }
    }
  }

  return pages
}

/**
 * Choose the optimal density preset so that content fits cleanly onto N full pages
 * without leaving an almost-empty trailing page, then paginate and distribute vertical slack.
 */
function buildOptimalPagesLayout(rawBlocks, model) {
  const presets = [
    // Standard comfortable preset
    {
      bodySize: 8.75,
      stepSize: 8.6,
      lineH: 11.4,
      stepLineH: 11.1,
      rowPadY: 3.4,
      headerBarPadY: 4.2,
      gapAfterCard: 6,
      gapAfterStage: 5.5,
    },
    // Slightly more compact preset to prevent a tiny overflow onto an extra page
    {
      bodySize: 8.6,
      stepSize: 8.45,
      lineH: 10.8,
      stepLineH: 10.5,
      rowPadY: 2.7,
      headerBarPadY: 3.6,
      gapAfterCard: 4.8,
      gapAfterStage: 4.5,
    },
    // High-efficiency preset when 9-10 skills + checklist can fit cleanly onto 2 full pages
    {
      bodySize: 8.45,
      stepSize: 8.35,
      lineH: 10.3,
      stepLineH: 10.0,
      rowPadY: 2.2,
      headerBarPadY: 3.2,
      gapAfterCard: 4.0,
      gapAfterStage: 3.8,
    },
  ]

  let bestChoice = null
  for (const metrics of presets) {
    const prepared = rawBlocks.map((b) => prepareLayoutBlock(b, model, metrics))
    const pages = paginateBlocks(prepared)
    const lastPage = pages[pages.length - 1]
    const lastH = lastPage.blocks.reduce(
      (acc, b, idx) => acc + b.baseHeight + (idx < lastPage.blocks.length - 1 ? b.gapAfter : 0),
      0
    )
    const lastFillRatio = lastH / lastPage.availH

    if (!bestChoice) {
      bestChoice = { metrics, pages, lastFillRatio }
    } else if (pages.length < bestChoice.pages.length && lastFillRatio >= 0.62) {
      bestChoice = { metrics, pages, lastFillRatio }
    }
  }

  return bestChoice
}

/**
 * Render a single prepared block at `doc.cursorY`, applying adaptive vertical
 * row padding (`extraRowPad`) and line spacing (`extraLineH`) so the page utilizes
 * the full A4 height naturally without enlarging font sizes or stretching text.
 */
function renderPreparedBlock(doc, block, model, metrics, extraRowPad = 0, extraLineH = 0) {
  const lineH = metrics.lineH + extraLineH
  const stepLineH = metrics.stepLineH + extraLineH
  const rowPadY = metrics.rowPadY + extraRowPad

  if (block.type === 'header_overview') {
    const bannerBottomY = doc.cursorY - block.bannerH
    doc.drawRect(MARGIN_LEFT, bannerBottomY, CONTENT_WIDTH, block.bannerH, {
      fill: COLORS.slateDark,
    })
    doc.drawRect(MARGIN_LEFT, doc.cursorY - 3.2, CONTENT_WIDTH, 3.2, {
      fill: COLORS.emerald,
    })

    // Right-aligned alignment summary pill inside the header banner
    const pillX = CONTENT_RIGHT_X - block.badgeW - 10
    const pillY = doc.cursorY - 22
    doc.drawRect(pillX, pillY, block.badgeW, 15, {
      fill: COLORS.emeraldDark,
      stroke: COLORS.emerald,
      lineWidth: 0.6,
    })
    doc.drawTextLine(block.badgeText, pillX + 9, pillY + 4.5, {
      font: 'F2',
      size: 8,
      color: COLORS.white,
    })

    let hCursor = doc.cursorY - 14
    doc.drawTextLine(
      'PATHWISE  |  STUDENT CAREER PREPARATION STRATEGY',
      MARGIN_LEFT + 12,
      hCursor,
      {
        font: 'F2',
        size: 7.4,
        color: [0.62, 0.91, 0.79],
      }
    )
    hCursor -= 15

    for (const tLine of block.titleLines) {
      doc.drawTextLine(tLine, MARGIN_LEFT + 12, hCursor, {
        font: 'F2',
        size: 14.2,
        color: COLORS.white,
      })
      hCursor -= 15.5
    }

    for (const mLine of block.metaLines) {
      doc.drawTextLine(mLine, MARGIN_LEFT + 12, hCursor + 2, {
        font: 'F1',
        size: 8.4,
        color: [0.82, 0.88, 0.94],
      })
      hCursor -= 11.5
    }

    doc.cursorY = bannerBottomY - 6

    // Full-width Career Objective & Starting Point card
    const objBoxH =
      18 +
      block.objLines.length * lineH +
      3 +
      block.demoLines.length * (lineH - 0.4) +
      2 +
      block.noteLines.length * (lineH - 0.8) +
      8 +
      extraRowPad * 2
    const objBottomY = doc.cursorY - objBoxH

    doc.drawRect(MARGIN_LEFT, objBottomY, CONTENT_WIDTH, objBoxH, {
      fill: COLORS.cardBg,
      stroke: COLORS.cardBorder,
      lineWidth: 0.7,
    })
    doc.drawRect(MARGIN_LEFT, objBottomY, 3.5, objBoxH, {
      fill: COLORS.emerald,
    })

    let oCursor = doc.cursorY - 11 - extraRowPad * 0.5
    doc.drawTextLine('CAREER OBJECTIVE & STARTING POINT', MARGIN_LEFT + 10, oCursor, {
      font: 'F2',
      size: 7.8,
      color: COLORS.emerald,
    })
    oCursor -= 11

    for (const line of block.objLines) {
      doc.drawTextLine(line, MARGIN_LEFT + 10, oCursor, {
        font: 'F1',
        size: metrics.bodySize,
        color: COLORS.slateBody,
      })
      oCursor -= lineH
    }
    oCursor -= 1.5

    for (const line of block.demoLines) {
      doc.drawTextLine(line, MARGIN_LEFT + 10, oCursor, {
        font: 'F1',
        size: 8.4,
        color: COLORS.emeraldDark,
      })
      oCursor -= lineH - 0.4
    }
    oCursor -= 1

    for (const line of block.noteLines) {
      doc.drawTextLine(line, MARGIN_LEFT + 10, oCursor, {
        font: 'F1',
        size: 7.9,
        color: COLORS.slateMuted,
      })
      oCursor -= lineH - 0.8
    }

    doc.cursorY = objBottomY
    return
  }

  if (block.type === 'stage_banner') {
    const { stage } = block
    const boxH = block.boxH + extraRowPad * 1.2
    const stageBottomY = doc.cursorY - boxH

    doc.drawRect(MARGIN_LEFT, stageBottomY, CONTENT_WIDTH, boxH, {
      fill: COLORS.cardBg,
      stroke: COLORS.cardBorder,
      lineWidth: 0.8,
    })
    doc.drawRect(MARGIN_LEFT, stageBottomY, 4, boxH, {
      fill: COLORS.emerald,
    })

    // Right-aligned stage skill count & priority pill
    const pillX = CONTENT_RIGHT_X - block.countPillW - 8
    const pillY = doc.cursorY - 16.5
    doc.drawRect(pillX, pillY, block.countPillW, 13, {
      fill: COLORS.mintBg,
      stroke: COLORS.mintBorder,
      lineWidth: 0.6,
    })
    doc.drawTextLine(block.countLabel, pillX + 7, pillY + 3.8, {
      font: 'F2',
      size: 7.5,
      color: COLORS.emeraldDark,
    })

    doc.drawTextLine(stage.title, MARGIN_LEFT + 11, doc.cursorY - 13, {
      font: 'F2',
      size: 10.8,
      color: COLORS.slateDark,
    })

    let subY = doc.cursorY - 24
    for (const sLine of block.subLines) {
      doc.drawTextLine(sLine, MARGIN_LEFT + 11, subY, {
        font: 'F1',
        size: 8.2,
        color: COLORS.slateMuted,
      })
      subY -= 10.8
    }

    for (const eLine of block.emptyLines) {
      doc.drawTextLine(eLine, MARGIN_LEFT + 11, subY - 1, {
        font: 'F1',
        size: 8.3,
        color: COLORS.emeraldDark,
      })
      subY -= 11
    }

    doc.cursorY = stageBottomY
    return
  }

  if (block.type === 'skill_card') {
    const learnRowH = block.learnLines.length * lineH + rowPadY * 2
    const totalStepLines = block.stepItems.reduce((acc, it) => acc + it.lines.length, 0)
    const stepsRowH = totalStepLines * stepLineH + rowPadY * 2
    const practiceRowH = block.practiceLines.length * lineH + rowPadY * 2
    const resourceRowH =
      block.resourceTitleLines.length * stepLineH +
      block.resourceUrlLines.length * 10.4 +
      rowPadY * 2
    const goalRowH = block.goalLines.length * lineH + rowPadY * 2

    const bodyH = learnRowH + stepsRowH + practiceRowH + resourceRowH + goalRowH
    const totalCardH = block.headerBarH + bodyH
    const cardTopY = doc.cursorY
    const cardBottomY = cardTopY - totalCardH
    const headerBottomY = cardTopY - block.headerBarH

    // 1. Full-width outer card background and left label column tint
    doc.drawRect(MARGIN_LEFT, cardBottomY, CONTENT_WIDTH, bodyH, {
      fill: COLORS.white,
    })
    doc.drawRect(MARGIN_LEFT, cardBottomY, COL_DIVIDER_X - MARGIN_LEFT, bodyH, {
      fill: COLORS.labelColBg,
    })

    // 2. Full-width skill header bar
    doc.drawRect(MARGIN_LEFT, headerBottomY, CONTENT_WIDTH, block.headerBarH, {
      fill: COLORS.mintBg,
      stroke: COLORS.mintBorder,
      lineWidth: 0.7,
    })

    // Priority pill on top-right of skill header bar
    const pillX = CONTENT_RIGHT_X - block.pillW - 8
    const pillY = cardTopY - (block.headerBarH + 13) / 2
    doc.drawRect(pillX, pillY, block.pillW, 13, {
      fill: block.pStyle.bg,
      stroke: block.pStyle.border,
      lineWidth: 0.6,
    })
    doc.drawTextLine(block.pillLabel, pillX + 7, pillY + 3.8, {
      font: 'F2',
      size: 7.5,
      color: block.pStyle.fg,
    })

    // Skill heading on top-left of skill header bar
    let titleY = cardTopY - metrics.headerBarPadY - 9.2
    for (const tLine of block.titleLines) {
      doc.drawTextLine(tLine, LABEL_COL_X, titleY, {
        font: 'F2',
        size: 9.8,
        color: COLORS.slateDark,
      })
      titleY -= 12
    }

    // Vertical divider between Label Column and Value Column
    doc.drawLine(COL_DIVIDER_X, headerBottomY, COL_DIVIDER_X, cardBottomY, COLORS.ruleLight, 0.6)

    // Helper to render a standard 2-column row inside the bordered skill card
    let rowTopY = headerBottomY
    const drawGridTextRow = (label, lines, rowH, textColor = COLORS.slateBody, drawBottomRule = true) => {
      const firstLineY = rowTopY - rowPadY - (lineH - 2.4)
      doc.drawTextLine(label, LABEL_COL_X, firstLineY, {
        font: 'F2',
        size: 8.3,
        color: COLORS.slateDark,
      })
      let lineY = firstLineY
      for (const l of lines) {
        doc.drawTextLine(l, VALUE_COL_X, lineY, {
          font: 'F1',
          size: metrics.bodySize,
          color: textColor,
        })
        lineY -= lineH
      }
      rowTopY -= rowH
      if (drawBottomRule) {
        doc.drawLine(MARGIN_LEFT, rowTopY, CONTENT_RIGHT_X, rowTopY, COLORS.ruleLight, 0.55)
      }
    }

    // Row 1: What to learn
    drawGridTextRow('What to learn:', block.learnLines, learnRowH, COLORS.slateBody, true)

    // Row 2: Action steps
    {
      const firstLineY = rowTopY - rowPadY - (stepLineH - 2.3)
      doc.drawTextLine('Action steps:', LABEL_COL_X, firstLineY, {
        font: 'F2',
        size: 8.3,
        color: COLORS.slateDark,
      })
      let lineY = firstLineY
      for (const stepItem of block.stepItems) {
        doc.drawTextLine(stepItem.num, VALUE_COL_X, lineY, {
          font: 'F2',
          size: 8.3,
          color: COLORS.emerald,
        })
        for (const sLine of stepItem.lines) {
          doc.drawTextLine(sLine, VALUE_COL_X + block.bulletIndent, lineY, {
            font: 'F1',
            size: metrics.stepSize,
            color: COLORS.slateBody,
          })
          lineY -= stepLineH
        }
      }
      rowTopY -= stepsRowH
      doc.drawLine(MARGIN_LEFT, rowTopY, CONTENT_RIGHT_X, rowTopY, COLORS.ruleLight, 0.55)
    }

    // Row 3: Practice/Project
    drawGridTextRow('Practice/Project:', block.practiceLines, practiceRowH, COLORS.slateBody, true)

    // Row 4: Resource
    {
      const firstLineY = rowTopY - rowPadY - (stepLineH - 2.3)
      doc.drawTextLine('Resource:', LABEL_COL_X, firstLineY, {
        font: 'F2',
        size: 8.3,
        color: COLORS.slateDark,
      })
      let lineY = firstLineY
      for (const rLine of block.resourceTitleLines) {
        doc.drawTextLine(rLine, VALUE_COL_X, lineY, {
          font: 'F1',
          size: metrics.stepSize,
          color: COLORS.slateBody,
        })
        lineY -= stepLineH
      }
      for (const uLine of block.resourceUrlLines) {
        doc.drawTextLine(uLine, VALUE_COL_X, lineY, {
          font: 'F1',
          size: 8.0,
          color: COLORS.linkEmerald,
        })
        const w = measurePdfTextWidth(uLine, 8.0, false)
        doc.addLinkAnnotation(VALUE_COL_X, lineY - 2, w, 9.5, block.resourceUrl)
        lineY -= 10.4
      }
      rowTopY -= resourceRowH
      doc.drawLine(MARGIN_LEFT, rowTopY, CONTENT_RIGHT_X, rowTopY, COLORS.ruleLight, 0.55)
    }

    // Row 5: Completion goal
    drawGridTextRow('Completion goal:', block.goalLines, goalRowH, COLORS.emeraldDark, false)

    // Outer card border framing the full 539.28pt width
    doc.drawRect(MARGIN_LEFT, cardBottomY, CONTENT_WIDTH, totalCardH, {
      stroke: COLORS.cardBorder,
      lineWidth: 0.75,
    })

    doc.cursorY = cardBottomY
    return
  }

  if (block.type === 'checklist') {
    const totalLines = block.items.reduce((acc, it) => acc + it.lines.length, 0)
    const itemGap = 2.5 + extraRowPad * 0.6
    const bodyH = totalLines * lineH + block.items.length * itemGap + rowPadY * 2 + 2
    const totalBoxH = block.headerBarH + bodyH
    const topY = doc.cursorY
    const bottomY = topY - totalBoxH
    const headerBottomY = topY - block.headerBarH

    doc.drawRect(MARGIN_LEFT, bottomY, CONTENT_WIDTH, totalBoxH, {
      fill: COLORS.cardBg,
      stroke: COLORS.cardBorder,
      lineWidth: 0.75,
    })
    doc.drawRect(MARGIN_LEFT, headerBottomY, CONTENT_WIDTH, block.headerBarH, {
      fill: COLORS.mintBg,
      stroke: COLORS.mintBorder,
      lineWidth: 0.7,
    })

    doc.drawTextLine('FINAL ACTION CHECKLIST', LABEL_COL_X, topY - 13.5, {
      font: 'F2',
      size: 9.6,
      color: COLORS.slateDark,
    })
    const rightSummary = 'Step-by-Step Completion Plan'
    const rsw = measurePdfTextWidth(rightSummary, 7.6, false)
    doc.drawTextLine(rightSummary, CONTENT_RIGHT_X - rsw - 8, topY - 13.2, {
      font: 'F1',
      size: 7.6,
      color: COLORS.emeraldDark,
    })

    let cY = headerBottomY - rowPadY - (lineH - 2.2)
    for (const item of block.items) {
      doc.drawTextLine(item.num, LABEL_COL_X, cY, {
        font: 'F2',
        size: 8.4,
        color: COLORS.emerald,
      })
      for (const l of item.lines) {
        doc.drawTextLine(l, LABEL_COL_X + block.checkIndent, cY, {
          font: 'F1',
          size: metrics.bodySize,
          color: COLORS.slateBody,
        })
        cY -= lineH
      }
      cY -= itemGap
    }

    doc.cursorY = bottomY
  }
}

/**
 * Compile the normalized 3-stage roadmap model into a binary PDF-1.4 Uint8Array
 * that utilizes the full A4 width and height cleanly.
 */
export function generateRoadmapPdfBytes(model) {
  const doc = new PdfDocumentBuilder(model)

  // 1. Build ordered logical blocks for the document
  const rawBlocks = [{ type: 'header_overview' }]
  for (const stage of model.stages) {
    rawBlocks.push({ type: 'stage_banner', stage })
    stage.items.forEach((skill, idx) => {
      rawBlocks.push({ type: 'skill_card', skill, indexInStage: idx })
    })
  }
  rawBlocks.push({ type: 'checklist' })

  // 2. Select optimal density preset and paginate with balanced page loads
  const { metrics, pages } = buildOptimalPagesLayout(rawBlocks, model)

  // 3. Render each page, distributing any unused vertical slack across row padding & card spacing
  pages.forEach((pageSpec, pageIdx) => {
    doc.startNewPage(pageIdx === 0)
    const blocks = pageSpec.blocks
    const baseContentH = blocks.reduce(
      (acc, b, idx) => acc + b.baseHeight + (idx < blocks.length - 1 ? b.gapAfter : 0),
      0
    )
    const slack = Math.max(0, pageSpec.availH - baseContentH)

    const totalRows = blocks.reduce((acc, b) => acc + (b.rowCount || 1), 0)
    const totalGaps = Math.max(1, blocks.length - 1)

    // Distribute vertical slack naturally across internal row padding, line height, and inter-block gaps
    // so the page breathes and utilizes the full A4 height without enlarging font sizes or stretching text.
    const extraRowPad = Math.min(4.2, (slack * 0.45) / Math.max(1, totalRows * 2))
    const extraLineH = Math.min(1.6, (slack * 0.18) / Math.max(1, totalRows * 3))
    const usedByRows =
      blocks.reduce((acc, b) => {
        if (b.type === 'skill_card') {
          const lineCount =
            b.learnLines.length +
            b.stepItems.reduce((s, it) => s + it.lines.length, 0) +
            b.practiceLines.length +
            b.resourceTitleLines.length +
            b.goalLines.length
          return acc + 10 * extraRowPad + lineCount * extraLineH
        }
        if (b.type === 'header_overview') {
          const lineCount = b.objLines.length + b.demoLines.length + b.noteLines.length
          return acc + 2 * extraRowPad + lineCount * extraLineH
        }
        if (b.type === 'stage_banner') {
          return acc + 1.2 * extraRowPad
        }
        if (b.type === 'checklist') {
          const lineCount = b.items.reduce((s, it) => s + it.lines.length, 0)
          return acc + (2 + b.items.length * 0.6) * extraRowPad + lineCount * extraLineH
        }
        return acc
      }, 0)

    const remainingSlack = Math.max(0, slack - usedByRows - 6)
    const extraGap = blocks.length > 1 ? Math.min(42, remainingSlack / totalGaps) : 0

    blocks.forEach((block, idx) => {
      renderPreparedBlock(doc, block, model, metrics, extraRowPad, extraLineH)
      if (idx < blocks.length - 1) {
        doc.cursorY -= block.gapAfter + extraGap
      }
    })
  })

  // Draw footers with Page X of Y on every page
  doc.drawAllFooters()

  // =========================================================================
  // ASSEMBLE BINARY PDF 1.4 OBJECT STREAM
  // =========================================================================
  const objects = []
  const addObject = (body) => {
    objects.push(body)
    return objects.length
  }

  const catalogId = addObject('')
  const pagesRootId = addObject('')
  const fontRegularId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  )
  const fontBoldId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  )

  const pageObjectIds = []

  for (const page of doc.pages) {
    const streamContent = page.commands.join('\n')
    const contentId = addObject(
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
    )

    const annotIds = page.links.map((lnk) => {
      const [x1, y1, x2, y2] = lnk.rect.map(fmtNum)
      return addObject(
        `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /Type /Action /S /URI /URI (${escapePdfLiteral(lnk.url)}) >> >>`
      )
    })

    const annotsEntry =
      annotIds.length > 0
        ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(' ')}]`
        : ''

    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${fmtNum(PAGE_WIDTH)} ${fmtNum(PAGE_HEIGHT)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R${annotsEntry} >>`
    )
    pageObjectIds.push(pageId)
  }

  const infoId = addObject(
    `<< /Title (${escapePdfLiteral(`${model.brandName} Skills Roadmap - ${model.roleTitle}`)}) /Author (${escapePdfLiteral(model.brandName)}) /Creator (${escapePdfLiteral(model.brandSubtitle)}) /Producer (Pathwise PDF Engine) >>`
  )

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`
  objects[pagesRootId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  let pdfText = '%PDF-1.4\n'
  const offsets = [0]

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdfText.length)
    pdfText += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefOffset = pdfText.length
  pdfText += `xref\n0 ${objects.length + 1}\n`
  pdfText += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    pdfText += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }

  pdfText += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  const bytes = new Uint8Array(pdfText.length)
  for (let i = 0; i < pdfText.length; i += 1) {
    bytes[i] = pdfText.charCodeAt(i) & 0xff
  }
  return bytes
}

/**
 * Generate and immediately trigger browser download of the Skills Roadmap PDF.
 */
export function downloadRoadmapPdf(options = {}) {
  const model = buildRoadmapDocumentModel(options)
  const pdfBytes = generateRoadmapPdfBytes(model)
  if (!pdfBytes || pdfBytes.byteLength < 200) {
    throw new Error('Generated PDF was empty or incomplete. Please try again.')
  }

  const filename = buildRoadmapPdfFilename(model.roleTitle)

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 1000)
  }

  return {
    filename,
    byteLength: pdfBytes.byteLength,
    totalSkills: model.totalSkills,
  }
}
