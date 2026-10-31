import unittest

from models import Education, ResumeAnalysis, build_education_score


def analysis_payload(projects: list[dict]) -> dict:
    return {
        "name": None,
        "contact": {
            "email": None,
            "phone": None,
            "location": None,
            "linkedin": None,
            "website": None,
        },
        "professionalSummary": None,
        "education": [],
        "experience": [],
        "projects": projects,
        "skills": [],
        "skillProfile": {
            "technical": [],
            "tools": [],
            "domain": [],
            "interpersonal": [],
        },
        "certifications": [],
        "strengths": [],
        "weaknesses": [],
        "improvementSuggestions": [],
        "achievements": [],
        "activities": [],
        "additionalInformation": [],
        "evidenceQuality": {
            "level": "insufficient",
            "summary": "The fixture contains no resume evidence.",
            "evidence": [],
        },
        "uncertainties": [],
    }


class ResumeAnalysisCleanupTests(unittest.TestCase):
    def test_discards_empty_project_placeholders(self):
        empty_project = {
            "name": None,
            "description": None,
            "technologies": [],
            "highlights": [],
            "url": None,
        }

        analysis = ResumeAnalysis.model_validate(
            analysis_payload([empty_project, empty_project])
        )

        self.assertEqual(analysis.projects, [])


class ImprovementSuggestionValidationTests(unittest.TestCase):
    def valid_payload(self) -> dict:
        project = {
            "name": "Resume Analyzer",
            "description": "Built a resume analyzer in Python.",
            "technologies": ["Python"],
            "highlights": [],
            "url": None,
        }
        payload = analysis_payload([project])
        payload["strengths"] = [{
            "point": "Documents project work.",
            "evidence": "Built a resume analyzer in Python.",
            "whyItMatters": "Shows applied technical work.",
        }]
        return payload

    def valid_suggestion(self) -> dict:
        return {
            "observation": "The project has no stated outcome.",
            "evidence": "Built a resume analyzer in Python.",
            "suggestion": "Add a genuine outcome if available.",
            "rationale": "Outcomes clarify project impact.",
            "expectedResult": "The project evidence will be more specific.",
            "priority": "medium",
        }

    def test_accepts_empty_suggestion_list_with_other_valid_evidence(self):
        payload = self.valid_payload()
        payload["improvementSuggestions"] = []

        analysis = ResumeAnalysis.model_validate(payload)

        self.assertEqual(analysis.improvement_suggestions, [])

    def test_accepts_a_valid_suggestion(self):
        payload = self.valid_payload()
        payload["improvementSuggestions"] = [self.valid_suggestion()]

        analysis = ResumeAnalysis.model_validate(payload)

        self.assertEqual(len(analysis.improvement_suggestions), 1)

    def test_still_requires_the_suggestions_field(self):
        payload = self.valid_payload()
        del payload["improvementSuggestions"]

        with self.assertRaises(ValueError):
            ResumeAnalysis.model_validate(payload)

    def test_rejects_malformed_suggestion_objects(self):
        payload = self.valid_payload()
        malformed = self.valid_suggestion()
        del malformed["rationale"]
        payload["improvementSuggestions"] = [malformed]

        with self.assertRaises(ValueError):
            ResumeAnalysis.model_validate(payload)


class EducationScoreTests(unittest.TestCase):
    def test_scores_documented_education_completeness_only(self):
        entry = Education.model_validate(
            {
                "institution": "Example University",
                "degree": "BCA",
                "fieldOfStudy": "Computer Applications",
                "location": None,
                "startDate": "2022",
                "endDate": "2025",
                "details": [],
            }
        )

        result = build_education_score([entry])

        self.assertEqual(result.score, 75)
        self.assertEqual(result.label, "mostly-complete")
        self.assertIn("location", result.missing_information)
        self.assertIn("coursework, result, or relevant detail", result.missing_information)
        self.assertIn("does not rate institutions", result.rationale)

    def test_returns_not_found_without_education_evidence(self):
        result = build_education_score([])

        self.assertEqual(result.score, 0)
        self.assertEqual(result.label, "not-found")


class ProjectEvidenceCleanupTests(unittest.TestCase):

    def test_preserves_project_with_resume_evidence(self):
        project = {
            "name": "Resume Analyzer",
            "description": None,
            "technologies": ["Python"],
            "highlights": [],
            "url": None,
        }

        payload = analysis_payload([project])
        payload["strengths"] = [
            {
                "point": "A project is documented.",
                "evidence": "The Resume Analyzer project lists Python.",
                "whyItMatters": "It connects a skill to applied work.",
            }
        ]
        payload["improvementSuggestions"] = [
            {
                "observation": "The project description is missing.",
                "evidence": "The project has a name and technology only.",
                "suggestion": "Add the objective and personal contribution.",
                "rationale": "Reviewers need context for the listed technology.",
                "expectedResult": "The project evidence will be easier to assess.",
                "priority": "high",
            }
        ]

        analysis = ResumeAnalysis.model_validate(payload)

        self.assertEqual(len(analysis.projects), 1)
        self.assertEqual(analysis.projects[0].name, "Resume Analyzer")

    def test_discards_whitespace_only_project_placeholders(self):
        whitespace_project = {
            "name": "   ",
            "description": "\t",
            "technologies": ["", "   "],
            "highlights": ["\n"],
            "url": "  ",
        }

        analysis = ResumeAnalysis.model_validate(
            analysis_payload([whitespace_project])
        )

        self.assertEqual(analysis.projects, [])


if __name__ == "__main__":
    unittest.main()
