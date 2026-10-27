# Resume Quality Scoring

## Purpose

The resume-quality score measures the clarity, completeness, and supporting evidence present in one validated resume. It does not measure candidate ability, predict hiring outcomes, verify claims, or replace the separate career role-match score.

The engine is deterministic and makes no AI or external API calls. Identical validated analysis and rubric configuration produce identical scoring output.

## Rubric version 1.0.0

| Criterion | Weight |
| --- | ---: |
| Skills clarity and evidence | 20 |
| Projects and portfolio evidence | 25 |
| Experience or practical application | 20 |
| Education and learning evidence | 15 |
| Structure, text clarity, and completeness | 20 |
| **Total** | **100** |

The final score is the sum of earned subcriterion points. Each criterion's configured rules total its weight, and all criterion weights total exactly 100.

### Skills clarity and evidence — 20

- Explicit skills: 4
- Organized skill profile: 4
- Skills linked to project, experience, education, or certification evidence: 8
- Clear, normalized, non-duplicated labels: 4

Skill relevance means relevance to supporting resume evidence, not relevance to a selected role.

### Projects and portfolio evidence — 25

- Named projects: 3
- Objectives or problem descriptions: 6
- Technologies actually used: 4
- Personal contribution highlights: 6
- Documented result, completed output, or genuine outcome: 4
- Supporting link or additional implementation evidence: 2

For project rules, coverage is calculated as:

```text
earned = round(rule points × qualifying projects ÷ documented projects)
```

No project metric is required unless genuine evidence exists. A factual qualitative result can qualify.

### Experience or practical application — 20

- Practical evidence source: 4
- Role, organization, activity, or project context: 4
- Contributions or responsibilities: 6
- Completed work or outcomes: 4
- Dates, scope, or technologies: 2

Formal employment is not required. Projects, internships, volunteering, relevant activities, and other documented practical work can satisfy these rules.

### Education and learning evidence — 15

- Institution and qualification context: 6
- Dates and useful education details: 5
- Supporting education detail or credential evidence: 4

The engine scores whether a grade or education detail is documented, never whether the grade or institution is good. Certifications are optional because meaningful education details can earn the supporting-learning points.

### Structure, text clarity, and completeness — 20

- Candidate identity and contact method: 4
- Professional summary or objective: 3
- Complete identifying context for section entries: 5
- Substantive, concise descriptions or bullets: 4
- Clear information with limited unresolved uncertainty: 4

## Actions and priorities

Every unmet or partially met rule returns its lost points, relevant section, explanation, specific action, checklist, and verification steps. Actions are ordered by points available and then rubric order. Priority is `high` for five or more available points, `medium` for three or four, and `low` otherwise.

The system never adds unsupported claims. Missing evidence means only that the information was not found in the resume.

## Reassessment

Analyzing an updated PDF runs the same versioned rubric again. The browser keeps score-only snapshots for the current tab session so the latest score can be compared with the previous result. PDFs, extracted text, contact information, and evidence quotations are not placed in score history or stored by this service.

## Limitations

- The scorer uses validated structured text. It cannot assess fonts, colors, margins, visual alignment, or rendered ATS behavior.
- Outcome signals indicate documented resume evidence; the application does not independently verify the truth of a claim.
- Groq performs extraction, so a materially different validated extraction can produce a different score. Once the validated input is fixed, scoring is deterministic.
- Resume quality is role-independent. Career-role scoring remains a separate endpoint and configuration.

## ATS Compatibility Section Breakdown (`atsCompatibility` v1.0.0)

In addition to the 5 core criteria (which sum to 100), `scoreResumeQuality` returns a deterministic `atsCompatibility` object for the ATS Analysis report view:

- `ratingLabel`: `EXCELLENT` (`>=85`), `GOOD` (`>=70`), `FAIR` (`>=50`), or `NEEDS WORK` (`<50`).
- `distortionRisk`: Derived from extracted text availability and `uncertainties` count (`No Distortion (Excellent)` when `uncertainties` is empty and scorable evidence exists).
- `globalStandards`: Deterministic checks for `Contact & Email Format`, `Date Format`, `Language & Text Support`, and an explicit `Unavailable (Text-Only)` status for `Visual PDF Layout`.
- `sectionBreakdown`: Ten 0–100 section indicators (`CONTACT INFO`, `SUMMARY`, `EXPERIENCE`, `SKILLS`, `EDUCATION`, `KEYWORDS`, `FORMATTING`, `ACHIEVEMENTS`, `READABILITY`, `ACTION VERBS`) computed directly from the validated resume fields and subcriterion rules without double-penalizing missing items.
