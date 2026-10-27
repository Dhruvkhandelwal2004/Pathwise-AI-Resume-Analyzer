# Career Scoring and Role Matching

## Purpose

Career scores measure evidence found in a resume against this application's configured role criteria. They do not measure objective ability, predict hiring decisions, or guarantee career suitability.

The engine is deterministic and makes no AI or external API calls. The same validated analysis and configuration always produce the same result.

## Formula

Every role contains weighted criteria totalling exactly 100 points:

```text
role score = sum(weight of each matched criterion)
```

Each criterion is binary and can earn its weight at most once. Repeated mentions and equivalent aliases do not add points. Scores are clamped to the inclusive range 0–100.

| Category | Points |
| --- | ---: |
| Core skills | 45 |
| Supporting skills | 15 |
| Project evidence | 15 |
| Experience evidence | 15 |
| Education and certifications | 10 |
| Total | 100 |

Project and experience criteria measure demonstrated application separately from skill recognition. One evidence item may therefore support a skill criterion and a distinct application criterion, but neither criterion can score more than once.

## Evidence sources

Only these structured fields are eligible:

- `skills`
- project name, description, technologies, and highlights
- experience title and highlights
- education degree, field of study, and details
- certification name and issuer

Contact information, name, professional-summary prose, uncertainties, and AI-generated strengths, weaknesses, and suggestions never affect scores.

Matching uses Unicode and case normalization followed by exact token or phrase boundaries. Known equivalent terms such as `JS` and `JavaScript`, or `React.js` and `React`, belong to one criterion. There is no fuzzy matching, embedding similarity, or hidden model judgment.

## Role criteria

The complete editable configuration is in `config/careerRoles.js`. Each role uses the same category allocation while defining its own criteria and aliases.

- **Data Analyst:** SQL, Python/R, spreadsheets, BI/visualization, statistics, Pandas/NumPy, data cleaning/ETL, databases/modelling, analytics projects and experience, related education and certifications.
- **Java Developer:** Java, OOP, Spring, persistence, REST, build tools, Git, testing, deployment, Java projects and experience, related education and certifications.
- **Web / Full Stack Developer:** JavaScript/TypeScript, frontend frameworks, HTML/CSS, backend development, REST, databases, Git, testing, deployment, web projects and experience, related education and certifications.
- **AI Automation Developer:** Python, LLM/API integration, automation, prompting, REST, AI frameworks, RAG, workflow platforms, deployment, AI automation projects and experience, related education and certifications.
- **Prompt Engineer:** prompt design, LLM platforms, structured output, evaluation, tool/context design, programming, RAG, automation, communication, prompt/LLM projects and experience, related education and certifications.

Configuration validation runs when the module loads and rejects duplicate role IDs, duplicate criterion IDs, invalid evidence sources, duplicate aliases across skill criteria, non-positive weights, or role totals other than 100.

## Ranking and gaps

Roles are sorted by descending score. Ties retain the order in `config/careerRoles.js`, making ranking stable and repeatable.

`foundSkills` contains configured skills supported by explicit resume evidence. `skillsNotFoundInResume` means only that a configured skill was not identified in the supplied resume; it is not evidence that the candidate does not possess that skill. Target-role gaps are ordered by their available point weight and then configuration order.

When no scorable evidence exists, every role receives 0, the evidence level is `insufficient`, and the response includes an explicit warning. Limited evidence is also flagged for cautious interpretation.

## Changing criteria safely

Edit only `config/careerRoles.js`, keep criterion IDs stable where possible, keep equivalent aliases within one skill criterion, and ensure every role still totals exactly 100. Run `npm.cmd test` after every criteria change.
