"""Normalize explicitly labeled resume headings before AI extraction."""

from __future__ import annotations

import re

from models import Certification


_ALIASES = {
    "Skills": (
        "skills", "core skills", "key skills", "professional skills",
        "technical expertise", "areas of expertise", "technologies",
        "core competencies", "tools and technologies", "tools & technologies",
        "programming languages", "tech stack", "skills and expertise",
        "technical skills and tools", "technical skills & tools",
    ),
    "Core Business Skills": ("core business skills",),
    "Soft Skills": ("soft skills",),
    "Technical Skills": (
        "technical skills", "technical + extra skills", "technical and extra skills",
        "technical & extra skills",
    ),
    "Professional Summary": (
        "summary", "professional summary", "career summary", "profile summary",
        "about me", "professional profile", "career objective", "objective", "profile",
        "summary and objective", "professional summary and objective",
    ),
    "Experience": (
        "experience", "work experience", "professional experience",
        "employment history", "work history", "career history", "internship",
        "internships", "professional work experience",
    ),
    "Education": (
        "education", "academic background", "educational qualifications",
        "academic qualifications", "educational details", "educational background",
        "education and qualifications", "education & qualifications",
    ),
    "Projects": (
        "projects", "personal projects", "academic projects", "key projects",
        "project experience", "technical projects", "selected projects",
    ),
    "Certifications": (
        "certifications", "certificates", "professional certifications",
        "courses and certifications", "training and certifications", "courses & certifications",
        "certification and training",
    ),
    "Achievements": ("achievements", "awards", "honors", "honours", "accomplishments"),
    "Publications": ("publications", "research publications"),
    "Activities": (
        "activities", "volunteer experience", "volunteering", "leadership",
        "extracurricular activities", "extracurriculars",
    ),
    "Languages": ("languages", "language skills"),
    "Interests": ("interests", "hobbies and interests", "hobbies"),
    "Declaration": ("declaration",),
}

_HEADING_LOOKUP = {
    re.sub(r"\s+", " ", alias).strip().casefold(): canonical
    for canonical, aliases in _ALIASES.items()
    for alias in aliases
}
_ALIAS_PATTERN = "|".join(
    re.escape(alias)
    for alias in sorted(_HEADING_LOOKUP, key=len, reverse=True)
)
_LEADING_MARKER = re.compile(r"^\s*(?:(?:[-*•▪◦‣#_~`]+|\d{1,2}[.)]|\(\d{1,2}\))\s*)")
_HEADING_TRIM_CHARS = " \t.,;:|#*_~`-/\\()[]{}<>\u2022\u25aa\u25e6\u2023\u2013\u2014"
_SKILL_GROUP_TO_PROFILE = {
    "Skills": "technical",
    "Core Business Skills": "domain",
    "Soft Skills": "interpersonal",
    "Technical Skills": "technical",
}
_OTHER_SECTION_HEADINGS = {
    "Professional Summary", "Experience", "Education", "Projects",
    "Certifications", "Achievements", "Publications", "Activities",
    "Languages", "Interests", "Declaration",
}


def normalize_pdf_skill_columns(text: str) -> str:
    """Stack a spatially aligned multi-column skills block into labeled columns."""
    lines = text.splitlines()
    heading_pattern = re.compile(
        rf"(?P<label>{_ALIAS_PATTERN})",
        flags=re.IGNORECASE,
    )
    output: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        matches = [match for match in heading_pattern.finditer(line)]
        heading_matches = []
        for match in matches:
            alias = re.sub(r"\s+", " ", match.group("label")).strip().casefold()
            canonical = _HEADING_LOOKUP.get(alias)
            if canonical in _SKILL_GROUP_TO_PROFILE:
                heading_matches.append((match.start(), match.end(), canonical))

        if len(heading_matches) < 2:
            output.append(line)
            index += 1
            continue

        heading_matches.sort()
        headings = []
        for start, end, canonical in heading_matches:
            if canonical not in [item[1] for item in headings]:
                headings.append((start, end, canonical))
        if len(headings) < 2:
            output.append(line)
            index += 1
            continue

        starts = [start for start, _, _ in headings]
        columns = [[] for _ in starts]
        for column_index, (_, heading_end, _) in enumerate(headings):
            end = starts[column_index + 1] if column_index + 1 < len(starts) else len(line)
            inline_content = line[heading_end:end].strip(_HEADING_TRIM_CHARS)
            if inline_content:
                columns[column_index].append(inline_content)
        index += 1
        while index < len(lines) and lines[index].strip():
            row = lines[index]
            for column_index, start in enumerate(starts):
                end = starts[column_index + 1] if column_index + 1 < len(starts) else None
                cell = row[start:end].strip() if start < len(row) else ""
                if cell:
                    columns[column_index].append(cell)
            index += 1

        for (_, _, canonical), cells in zip(headings, columns):
            output.append(canonical)
            if cells:
                output.append(" ".join(cells))

    return "\n".join(output)


def _skill_key(value: str) -> str:
    normalized = re.sub(r"\s*&\s*", " and ", value.casefold())
    return re.sub(r"[^\w+#]+", " ", normalized, flags=re.UNICODE).strip()


normalize_skill_key = _skill_key


def _clean_skill(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip(" \t,;|•▪◦‣")
    value = re.sub(r"\s*&\s*", " & ", value)
    return value.strip()


def extract_labeled_skills(text: str) -> dict[str, list[str]]:
    """Extract only comma/list items inside explicitly labeled skills sections."""
    normalized = normalize_section_headings(text)
    current_profile_group = None
    section_text: dict[str, list[str]] = {}
    for line in normalized.splitlines():
        label = line.strip()
        if label in _SKILL_GROUP_TO_PROFILE:
            current_profile_group = _SKILL_GROUP_TO_PROFILE[label]
            section_text.setdefault(current_profile_group, [])
            continue
        if label in _OTHER_SECTION_HEADINGS or label in _SKILL_GROUP_TO_PROFILE:
            current_profile_group = None
            continue
        if not label:
            current_profile_group = None
            continue
        if current_profile_group:
            section_text[current_profile_group].append(label)

    result: dict[str, list[str]] = {"technical": [], "tools": [], "domain": [], "interpersonal": []}
    seen: set[str] = set()
    for group, lines in section_text.items():
        joined = " ".join(lines)
        for part in re.split(r"[,;\n]+", joined):
            skill = _clean_skill(part)
            key = _skill_key(skill)
            if skill and key and key not in seen:
                result[group].append(skill)
                seen.add(key)
    return result


def extract_numbered_certifications(text: str) -> list[str]:
    """Extract numbered names only from a labeled Certificates section."""
    normalized = normalize_section_headings(text)
    lines = normalized.splitlines()
    try:
        start = next(index for index, line in enumerate(lines) if line.strip() == "Certifications")
    except StopIteration:
        return []

    section_lines = []
    for line in lines[start + 1:]:
        label = line.strip()
        if label in _OTHER_SECTION_HEADINGS - {"Certifications"}:
            break
        if label:
            section_lines.append(label)

    section_text = " ".join(section_lines)
    matches = list(re.finditer(r"(?<!\w)\d{1,2}[.)]\s+", section_text))
    names = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(section_text)
        name = re.sub(r"\s+", " ", section_text[match.end():end]).strip(" \t,;|•▪◦‣")
        if name:
            names.append(name)
    return names


def merge_explicit_resume_sections(analysis, text: str):
    """Merge explicitly listed skills and certificates into the existing model."""
    payload = analysis.model_dump(by_alias=True)
    profile = payload["skillProfile"]
    skills = []
    skill_by_key = {}
    for skill in payload["skills"]:
        key = _skill_key(skill)
        if key and key not in skill_by_key:
            skill_by_key[key] = skill
            skills.append(skill)

    for group, values in extract_labeled_skills(text).items():
        for value in values:
            key = _skill_key(value)
            if not key:
                continue
            skill_by_key.setdefault(key, value)
            canonical_value = skill_by_key[key]
            for existing_group in profile:
                profile[existing_group] = [
                    item for item in profile[existing_group]
                    if _skill_key(item) != key or existing_group == group
                ]
            if not any(_skill_key(item) == key for item in profile[group]):
                profile[group].append(canonical_value)

    skills.extend(value for key, value in skill_by_key.items() if value not in skills)
    payload["skills"] = skills
    payload["skillProfile"] = profile

    certificates = [
        Certification.model_validate(item) for item in payload["certifications"]
    ]
    certificate_keys = {
        re.sub(r"\W+", " ", item.name.casefold()).strip()
        for item in certificates if item.name
    }
    for name in extract_numbered_certifications(text):
        key = re.sub(r"\W+", " ", name.casefold()).strip()
        if key and key not in certificate_keys:
            certificates.append(Certification.model_validate({
                "name": name,
                "issuer": None,
                "date": None,
                "credentialId": None,
            }))
            certificate_keys.add(key)

    skill_profile = analysis.skill_profile.model_copy(update=profile)
    return analysis.model_copy(update={
        "skills": skills,
        "skill_profile": skill_profile,
        "certifications": certificates,
    })


def normalize_section_headings(text: str) -> str:
    """Put recognized headings on their own canonical line without deleting text.

    Exact heading lines accept common bullets/numbering and decorative
    punctuation. Inline headings are split only when separated from their
    content by an explicit delimiter, avoiding sentence-level false matches.
    All original content and ordering are retained.
    """
    normalized_lines: list[str] = []
    for original_line in text.split("\n"):
        # PDF text extraction can put both columns on one line separated by a
        # vertical rule. Split only where the next segment starts with a known
        # label, leaving ordinary vertical bars in content untouched.
        line_parts = re.split(
            rf"\s+\|\s+(?=(?:{_ALIAS_PATTERN})\s*[:：|#–—-])",
            original_line,
            flags=re.IGNORECASE,
        )
        for part in line_parts:
            line = part
            heading_source = _LEADING_MARKER.sub("", line)
            candidate = heading_source.strip(_HEADING_TRIM_CHARS)
            key = re.sub(r"\s+", " ", candidate).casefold()
            canonical = _HEADING_LOOKUP.get(key)
            if canonical:
                normalized_lines.append(canonical)
                continue

            match = re.match(
                rf"^\s*({_ALIAS_PATTERN})(?P<separator>\s*[:：|#–—-]\s*|\s+)(.+?)\s*$",
                heading_source,
                flags=re.IGNORECASE,
            )
            if match and (match.group("separator").strip() or match.group(1).isupper()):
                alias = re.sub(r"\s+", " ", match.group(1)).strip().casefold()
                normalized_lines.extend((_HEADING_LOOKUP[alias], match.group(3)))
                continue

            normalized_lines.append(line)

    return "\n".join(normalized_lines)
