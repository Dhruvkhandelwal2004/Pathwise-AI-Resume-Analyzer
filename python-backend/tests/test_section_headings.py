import unittest

from models import ResumeAnalysis
from pipeline import build_cache_identity, normalize_text
from section_headings import (
    extract_labeled_skills,
    extract_numbered_certifications,
    merge_explicit_resume_sections,
    normalize_pdf_skill_columns,
)


MULTI_COLUMN_SKILLS = """              Core Business Skills                            Soft Skills                                    Technical + Extra Skills
              Financial Analysis (basic),                     Communication, Teamwork                        Microsoft Office , Tally Prime,
              Accounting Fundamentals,                        & Collaboration, Time                          Data Entry, Basic Digital
              Business Communication,                         Management, Presentation                       Marketing, Market Resear
              Management&Leadership,                          Skills
"""


def empty_analysis():
    return ResumeAnalysis.model_validate({
        "name": None,
        "contact": {"email": None, "phone": None, "location": None, "linkedin": None, "website": None},
        "professionalSummary": None,
        "education": [], "experience": [], "projects": [], "skills": [],
        "skillProfile": {"technical": [], "tools": [], "domain": [], "interpersonal": []},
        "certifications": [],
        "strengths": [{
            "point": "Explicit skill evidence is listed.",
            "evidence": "Python appears in the labeled Skills section.",
            "whyItMatters": "A labeled skill list supports profile review.",
        }],
        "weaknesses": [],
        "improvementSuggestions": [], "achievements": [], "activities": [],
        "additionalInformation": [],
        "evidenceQuality": {"level": "insufficient", "summary": "No model evidence.", "evidence": []},
        "uncertainties": [],
    })


class ResumeSectionHeadingTests(unittest.TestCase):
    def test_maps_common_section_aliases_to_existing_field_labels(self):
        cases = {
            "Skills": "Skills",
            "Technical Skills": "Technical Skills",
            "Core Skills": "Skills",
            "Key Skills": "Skills",
            "Technical Expertise": "Skills",
            "Areas of Expertise": "Skills",
            "Technologies": "Skills",
            "Professional Summary": "Professional Summary",
            "Career Summary": "Professional Summary",
            "Profile Summary": "Professional Summary",
            "About Me": "Professional Summary",
            "Professional Profile": "Professional Summary",
            "Career Objective": "Professional Summary",
            "Objective": "Professional Summary",
            "Work Experience": "Experience",
            "Professional Experience": "Experience",
            "Employment History": "Experience",
            "Work History": "Experience",
            "Academic Background": "Education",
            "Educational Qualifications": "Education",
            "Academic Qualifications": "Education",
            "Education & Qualifications": "Education",
            "Personal Projects": "Projects",
            "Academic Projects": "Projects",
            "Key Projects": "Projects",
            "Project Experience": "Projects",
            "Certificates": "Certifications",
            "Professional Certifications": "Certifications",
            "Courses and Certifications": "Certifications",
            "Training and Certifications": "Certifications",
            "Certification and Training": "Certifications",
        }
        for source, canonical in cases.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_text(source), canonical)

    def test_normalizes_case_spacing_bullets_numbering_and_heading_punctuation(self):
        source = """1.  tEcHnIcAl   sKiLlS:
- PYTHON, SQL
**Professional Profile**
An aspiring analyst with evidence-backed projects.
"""
        self.assertEqual(
            normalize_text(source),
            "Technical Skills\nPYTHON, SQL\nProfessional Summary\n"
            "An aspiring analyst with evidence-backed projects.",
        )

    def test_splits_inline_headings_and_preserves_their_content(self):
        source = "Skills: Python, SQL\nProfessional Summary — Data analyst with project experience"
        self.assertEqual(
            normalize_text(source),
            "Skills\nPython, SQL\nProfessional Summary\n"
            "Data analyst with project experience",
        )

    def test_splits_uppercase_heading_without_a_colon(self):
        self.assertEqual(normalize_text("SKILLS Python, SQL"), "Skills\nPython, SQL")

    def test_heading_normalization_is_idempotent_and_cache_input_is_stable(self):
        source = "Technical Skills: Python, SQL\nEDUCATION: BSc Computer Science"
        normalized = normalize_text(source)
        self.assertEqual(normalize_text(normalized), normalized)
        self.assertEqual(
            build_cache_identity(source, model_configuration="test"),
            build_cache_identity(normalized, model_configuration="test"),
        )

    def test_handles_reordered_and_two_column_extracted_sections(self):
        source = (
            "EDUCATION: BSc Computer Science | SKILLS: Python, SQL\n"
            "PROJECTS: Student dashboard | EXPERIENCE: Internship, 2024"
        )
        self.assertEqual(
            normalize_text(source),
            "Education\nBSc Computer Science\nSkills\nPython, SQL\n"
            "Projects\nStudent dashboard\nExperience\nInternship, 2024",
        )

    def test_extracts_individual_skills_from_realistic_multicolumn_pdf_layout(self):
        normalized = normalize_text(normalize_pdf_skill_columns(MULTI_COLUMN_SKILLS))
        skills = extract_labeled_skills(normalized)
        self.assertEqual(skills["domain"], [
            "Financial Analysis (basic)", "Accounting Fundamentals",
            "Business Communication", "Management & Leadership",
        ])
        self.assertEqual(skills["interpersonal"], [
            "Communication", "Teamwork & Collaboration", "Time Management",
            "Presentation Skills",
        ])
        self.assertEqual(skills["technical"], [
            "Microsoft Office", "Tally Prime", "Data Entry",
            "Basic Digital Marketing", "Market Resear",
        ])

    def test_extracts_numbered_certificates_only_from_labeled_section(self):
        source = """EXPERIENCE
Having 3 Months Experience working on Tally Prime for a Firm.
CERTIFICATES
1. Introduction to Artificial Intelligence 2. Fundamentals of Corporate Finance
3. AI in Finance
PROFILE
BBA student interested in finance and management.
"""
        self.assertEqual(extract_numbered_certifications(normalize_text(source)), [
            "Introduction to Artificial Intelligence",
            "Fundamentals of Corporate Finance",
            "AI in Finance",
        ])

    def test_merges_source_listed_skills_and_certificates_into_existing_fields(self):
        normalized = normalize_text(
            normalize_pdf_skill_columns(MULTI_COLUMN_SKILLS)
            + "\nCERTIFICATES\n1. Introduction to Artificial Intelligence 2. AI in Finance"
        )
        merged = merge_explicit_resume_sections(empty_analysis(), normalized)
        self.assertIn("Financial Analysis (basic)", merged.skills)
        self.assertIn("Teamwork & Collaboration", merged.skills)
        self.assertIn("Management & Leadership", merged.skill_profile.domain)
        self.assertIn("Teamwork & Collaboration", merged.skill_profile.interpersonal)
        self.assertEqual([item.name for item in merged.certifications], [
            "Introduction to Artificial Intelligence", "AI in Finance",
        ])

    def test_does_not_turn_unlabeled_prose_into_explicit_sections(self):
        source = "I developed skills in Python and completed projects during college."
        self.assertEqual(normalize_text(source), source)

    def test_empty_heading_stays_empty_without_invented_section_content(self):
        self.assertEqual(normalize_text("Skills:\n\nEducation:"), "Skills\n\nEducation")


if __name__ == "__main__":
    unittest.main()
