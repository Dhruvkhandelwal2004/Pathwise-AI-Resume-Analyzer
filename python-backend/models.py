from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class Contact(StrictModel):
    email: str | None
    phone: str | None
    location: str | None
    linkedin: str | None
    website: str | None


class Education(StrictModel):
    institution: str | None
    degree: str | None
    field_of_study: str | None = Field(alias="fieldOfStudy")
    location: str | None
    start_date: str | None = Field(alias="startDate")
    end_date: str | None = Field(alias="endDate")
    details: list[str]


class Experience(StrictModel):
    employer: str | None
    title: str | None
    location: str | None
    start_date: str | None = Field(alias="startDate")
    end_date: str | None = Field(alias="endDate")
    highlights: list[str]


class Project(StrictModel):
    name: str | None
    description: str | None
    technologies: list[str]
    highlights: list[str]
    url: str | None

    @field_validator("technologies", "highlights")
    @classmethod
    def discard_blank_list_values(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]


class Certification(StrictModel):
    name: str | None
    issuer: str | None
    date: str | None
    credential_id: str | None = Field(alias="credentialId")


class EvidenceItem(StrictModel):
    point: str
    evidence: str
    why_it_matters: str = Field(alias="whyItMatters")

    @field_validator("point", "evidence", "why_it_matters")
    @classmethod
    def require_evidence_text(cls, value: str) -> str:
        if not value:
            raise ValueError("Evidence fields must not be blank.")
        return value


class ImprovementSuggestion(StrictModel):
    observation: str
    evidence: str
    suggestion: str
    rationale: str
    expected_result: str = Field(alias="expectedResult")
    priority: Literal["high", "medium", "low"]

    @field_validator(
        "observation",
        "evidence",
        "suggestion",
        "rationale",
        "expected_result",
    )
    @classmethod
    def require_action_text(cls, value: str) -> str:
        if not value:
            raise ValueError("Action fields must not be blank.")
        return value


class SkillProfile(StrictModel):
    technical: list[str]
    tools: list[str]
    domain: list[str]
    interpersonal: list[str]

    @field_validator("technical", "tools", "domain", "interpersonal")
    @classmethod
    def discard_blank_skills(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]


class EvidenceQuality(StrictModel):
    level: Literal["strong", "mixed", "limited", "insufficient"]
    summary: str
    evidence: list[str]

    @field_validator("summary")
    @classmethod
    def require_summary(cls, value: str) -> str:
        if not value:
            raise ValueError("Evidence-quality summary must not be blank.")
        return value


class EducationScore(StrictModel):
    score: int = Field(ge=0, le=100)
    label: Literal[
        "complete",
        "mostly-complete",
        "partial",
        "limited",
        "not-found",
    ]
    rationale: str
    missing_information: list[str] = Field(alias="missingInformation")


class ResumeCoreProfile(StrictModel):
    name: str | None
    contact: Contact
    professional_summary: str | None = Field(alias="professionalSummary")
    education: list[Education]
    experience: list[Experience]
    uncertainties: list[str]

    @field_validator("uncertainties")
    @classmethod
    def discard_blank_uncertainties(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]


class ResumePortfolio(StrictModel):
    projects: list[Project]
    skills: list[str]
    skill_profile: SkillProfile = Field(alias="skillProfile")
    certifications: list[Certification]
    achievements: list[EvidenceItem]
    activities: list[EvidenceItem]
    additional_information: list[EvidenceItem] = Field(alias="additionalInformation")

    @model_validator(mode="before")
    @classmethod
    def derive_flat_skills(cls, data: object) -> object:
        if not isinstance(data, dict) or "skills" in data:
            return data
        skill_profile = data.get("skillProfile")
        if not isinstance(skill_profile, dict):
            return data

        skills: list[str] = []
        seen: set[str] = set()
        for group in ("technical", "tools", "domain", "interpersonal"):
            values = skill_profile.get(group, [])
            if not isinstance(values, list):
                continue
            for value in values:
                if not isinstance(value, str) or not value.strip():
                    continue
                key = value.strip().casefold()
                if key not in seen:
                    seen.add(key)
                    skills.append(value.strip())

        derived = dict(data)
        derived["skills"] = skills
        return derived

    @field_validator("skills")
    @classmethod
    def discard_blank_skills(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]

    @field_validator("projects")
    @classmethod
    def discard_empty_projects(cls, projects: list[Project]) -> list[Project]:
        return [
            project
            for project in projects
            if any((project.name, project.description, project.url))
            or any(project.technologies)
            or any(project.highlights)
        ]

    @model_validator(mode="after")
    def validate_skill_profile_contract(self) -> "ResumePortfolio":
        explicit_skills = {skill.casefold() for skill in self.skills}
        grouped_skills = (
            self.skill_profile.technical
            + self.skill_profile.tools
            + self.skill_profile.domain
            + self.skill_profile.interpersonal
        )
        if any(skill.casefold() not in explicit_skills for skill in grouped_skills):
            raise ValueError("Skill profile must contain only explicit skills.")
        return self


class ResumeProfile(StrictModel):
    name: str | None
    contact: Contact
    professional_summary: str | None = Field(alias="professionalSummary")
    education: list[Education]
    experience: list[Experience]
    projects: list[Project]
    skills: list[str]
    skill_profile: SkillProfile = Field(alias="skillProfile")
    certifications: list[Certification]
    achievements: list[EvidenceItem]
    activities: list[EvidenceItem]
    additional_information: list[EvidenceItem] = Field(alias="additionalInformation")
    uncertainties: list[str]

    @field_validator("skills", "uncertainties")
    @classmethod
    def discard_blank_profile_strings(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]

    @field_validator("projects")
    @classmethod
    def discard_empty_profile_projects(cls, projects: list[Project]) -> list[Project]:
        return [
            project
            for project in projects
            if any((project.name, project.description, project.url))
            or any(project.technologies)
            or any(project.highlights)
        ]

    @model_validator(mode="after")
    def validate_skill_profile_contract(self) -> "ResumeProfile":
        explicit_skills = {skill.casefold() for skill in self.skills}
        grouped_skills = (
            self.skill_profile.technical
            + self.skill_profile.tools
            + self.skill_profile.domain
            + self.skill_profile.interpersonal
        )
        if any(skill.casefold() not in explicit_skills for skill in grouped_skills):
            raise ValueError("Skill profile must contain only explicit skills.")
        return self


class ResumeGuidance(StrictModel):
    strengths: list[EvidenceItem]
    weaknesses: list[EvidenceItem]
    improvement_suggestions: list[ImprovementSuggestion] = Field(
        alias="improvementSuggestions"
    )
    evidence_quality: EvidenceQuality = Field(alias="evidenceQuality")


class ResumeAnalysis(StrictModel):
    name: str | None
    contact: Contact
    professional_summary: str | None = Field(alias="professionalSummary")
    education: list[Education]
    experience: list[Experience]
    projects: list[Project]
    skills: list[str]
    skill_profile: SkillProfile = Field(alias="skillProfile")
    certifications: list[Certification]
    strengths: list[EvidenceItem]
    weaknesses: list[EvidenceItem]
    improvement_suggestions: list[ImprovementSuggestion] = Field(
        alias="improvementSuggestions"
    )
    achievements: list[EvidenceItem]
    activities: list[EvidenceItem]
    additional_information: list[EvidenceItem] = Field(alias="additionalInformation")
    evidence_quality: EvidenceQuality = Field(alias="evidenceQuality")
    uncertainties: list[str]

    @field_validator("skills", "uncertainties")
    @classmethod
    def discard_blank_strings(cls, values: list[str]) -> list[str]:
        return [value for value in values if value]

    @field_validator("projects")
    @classmethod
    def discard_empty_project_placeholders(
        cls, projects: list[Project]
    ) -> list[Project]:
        """Keep only projects backed by at least one extracted resume value."""
        return [
            project
            for project in projects
            if any((project.name, project.description, project.url))
            or any(project.technologies)
            or any(project.highlights)
        ]

    @model_validator(mode="after")
    def validate_evidence_contract(self) -> "ResumeAnalysis":
        explicit_skills = {skill.casefold() for skill in self.skills}
        grouped_skills = (
            self.skill_profile.technical
            + self.skill_profile.tools
            + self.skill_profile.domain
            + self.skill_profile.interpersonal
        )
        if any(skill.casefold() not in explicit_skills for skill in grouped_skills):
            raise ValueError("Skill profile must contain only explicit skills.")

        has_concrete_evidence = any(
            (
                self.education,
                self.experience,
                self.projects,
                self.skills,
                self.certifications,
                self.achievements,
                self.activities,
                self.additional_information,
            )
        )
        if has_concrete_evidence and not self.strengths:
            raise ValueError("Evidence-rich analysis requires a strength.")
        return self


EDUCATION_FIELD_WEIGHTS = {
    "institution": 20,
    "degree": 20,
    "field_of_study": 15,
    "location": 5,
    "start_date": 10,
    "end_date": 10,
    "details": 20,
}
EDUCATION_FIELD_LABELS = {
    "institution": "institution",
    "degree": "degree or qualification",
    "field_of_study": "field of study",
    "location": "location",
    "start_date": "start date",
    "end_date": "end date",
    "details": "coursework, result, or relevant detail",
}


def build_education_score(education: list[Education]) -> EducationScore:
    rationale = (
        "Measures completeness of education evidence in this resume only; "
        "it does not rate institutions, academic ability, or candidate quality."
    )
    if not education:
        return EducationScore(
            score=0,
            label="not-found",
            rationale=rationale,
            missingInformation=list(EDUCATION_FIELD_LABELS.values()),
        )

    earned = 0
    missing: set[str] = set()
    for entry in education:
        for field, weight in EDUCATION_FIELD_WEIGHTS.items():
            value = getattr(entry, field)
            present = bool(value) if isinstance(value, list) else bool(value)
            if present:
                earned += weight
            else:
                missing.add(EDUCATION_FIELD_LABELS[field])

    score = round(earned / len(education))
    if score >= 85:
        label = "complete"
    elif score >= 65:
        label = "mostly-complete"
    elif score >= 35:
        label = "partial"
    elif score > 0:
        label = "limited"
    else:
        label = "not-found"

    return EducationScore(
        score=score,
        label=label,
        rationale=rationale,
        missingInformation=sorted(missing),
    )


NULLABLE_STRING = {"type": ["string", "null"]}
EVIDENCE_ITEM_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "point": {"type": "string", "minLength": 1},
        "evidence": {"type": "string", "minLength": 1},
        "whyItMatters": {"type": "string", "minLength": 1},
    },
    "required": ["point", "evidence", "whyItMatters"],
}
SKILL_PROFILE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "technical": {"type": "array", "items": {"type": "string"}},
        "tools": {"type": "array", "items": {"type": "string"}},
        "domain": {"type": "array", "items": {"type": "string"}},
        "interpersonal": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["technical", "tools", "domain", "interpersonal"],
}
EVIDENCE_QUALITY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "level": {
            "type": "string",
            "enum": ["strong", "mixed", "limited", "insufficient"],
        },
        "summary": {"type": "string", "minLength": 1},
        "evidence": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["level", "summary", "evidence"],
}

RESUME_ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "name": NULLABLE_STRING,
        "contact": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "email": NULLABLE_STRING,
                "phone": NULLABLE_STRING,
                "location": NULLABLE_STRING,
                "linkedin": NULLABLE_STRING,
                "website": NULLABLE_STRING,
            },
            "required": ["email", "phone", "location", "linkedin", "website"],
        },
        "professionalSummary": NULLABLE_STRING,
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "institution": NULLABLE_STRING,
                    "degree": NULLABLE_STRING,
                    "fieldOfStudy": NULLABLE_STRING,
                    "location": NULLABLE_STRING,
                    "startDate": NULLABLE_STRING,
                    "endDate": NULLABLE_STRING,
                    "details": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "institution",
                    "degree",
                    "fieldOfStudy",
                    "location",
                    "startDate",
                    "endDate",
                    "details",
                ],
            },
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "employer": NULLABLE_STRING,
                    "title": NULLABLE_STRING,
                    "location": NULLABLE_STRING,
                    "startDate": NULLABLE_STRING,
                    "endDate": NULLABLE_STRING,
                    "highlights": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "employer",
                    "title",
                    "location",
                    "startDate",
                    "endDate",
                    "highlights",
                ],
            },
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": NULLABLE_STRING,
                    "description": NULLABLE_STRING,
                    "technologies": {"type": "array", "items": {"type": "string"}},
                    "highlights": {"type": "array", "items": {"type": "string"}},
                    "url": NULLABLE_STRING,
                },
                "required": [
                    "name",
                    "description",
                    "technologies",
                    "highlights",
                    "url",
                ],
            },
        },
        "skills": {"type": "array", "items": {"type": "string"}},
        "skillProfile": SKILL_PROFILE_SCHEMA,
        "certifications": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": NULLABLE_STRING,
                    "issuer": NULLABLE_STRING,
                    "date": NULLABLE_STRING,
                    "credentialId": NULLABLE_STRING,
                },
                "required": ["name", "issuer", "date", "credentialId"],
            },
        },
        "strengths": {
            "type": "array",
            "items": EVIDENCE_ITEM_SCHEMA,
        },
        "weaknesses": {
            "type": "array",
            "items": EVIDENCE_ITEM_SCHEMA,
        },
        "improvementSuggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "observation": {"type": "string", "minLength": 1},
                    "evidence": {"type": "string", "minLength": 1},
                    "suggestion": {"type": "string", "minLength": 1},
                    "rationale": {"type": "string", "minLength": 1},
                    "expectedResult": {"type": "string", "minLength": 1},
                    "priority": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                    },
                },
                "required": [
                    "observation",
                    "evidence",
                    "suggestion",
                    "rationale",
                    "expectedResult",
                    "priority",
                ],
            },
        },
        "achievements": {"type": "array", "items": EVIDENCE_ITEM_SCHEMA},
        "activities": {"type": "array", "items": EVIDENCE_ITEM_SCHEMA},
        "additionalInformation": {
            "type": "array",
            "items": EVIDENCE_ITEM_SCHEMA,
        },
        "evidenceQuality": EVIDENCE_QUALITY_SCHEMA,
        "uncertainties": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "name",
        "contact",
        "professionalSummary",
        "education",
        "experience",
        "projects",
        "skills",
        "skillProfile",
        "certifications",
        "strengths",
        "weaknesses",
        "improvementSuggestions",
        "achievements",
        "activities",
        "additionalInformation",
        "evidenceQuality",
        "uncertainties",
    ],
}

PROFILE_SCHEMA_KEYS = [
    "name",
    "contact",
    "professionalSummary",
    "education",
    "experience",
    "projects",
    "skills",
    "skillProfile",
    "certifications",
    "achievements",
    "activities",
    "additionalInformation",
    "uncertainties",
]
CORE_PROFILE_SCHEMA_KEYS = [
    "name",
    "contact",
    "professionalSummary",
    "education",
    "experience",
    "uncertainties",
]
PORTFOLIO_SCHEMA_KEYS = [
    "projects",
    "skillProfile",
    "certifications",
    "achievements",
    "activities",
    "additionalInformation",
]
GUIDANCE_SCHEMA_KEYS = [
    "strengths",
    "weaknesses",
    "improvementSuggestions",
    "evidenceQuality",
]


def _schema_subset(keys: list[str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            key: RESUME_ANALYSIS_SCHEMA["properties"][key] for key in keys
        },
        "required": keys,
    }


RESUME_PROFILE_SCHEMA = _schema_subset(PROFILE_SCHEMA_KEYS)
RESUME_CORE_PROFILE_SCHEMA = _schema_subset(CORE_PROFILE_SCHEMA_KEYS)
RESUME_PORTFOLIO_SCHEMA = _schema_subset(PORTFOLIO_SCHEMA_KEYS)
RESUME_GUIDANCE_SCHEMA = _schema_subset(GUIDANCE_SCHEMA_KEYS)
