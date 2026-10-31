import threading
import time
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

from models import ResumeAnalysis
from persistent_cache import MongoAnalysisCache, PersistentCacheUnavailable
from pipeline import (
    EXTRACTION_CONTRACT_VERSION,
    PROMPT_VERSION,
    PipelineError,
    _analyze_extracted_document,
    build_cache_identity,
)


class DuplicateKeyError(Exception):
    pass


def matches(document, query):
    return all(document.get(key) == value for key, value in query.items())


class FakeCollection:
    def __init__(self):
        self.documents = {}
        self.lock = threading.RLock()

    def find_one(self, query):
        with self.lock:
            document = self.documents.get(query.get("_id"))
            return deepcopy(document) if document else None

    def insert_one(self, document):
        with self.lock:
            if document["_id"] in self.documents:
                raise DuplicateKeyError()
            self.documents[document["_id"]] = deepcopy(document)

    def find_one_and_update(self, query, update, return_document=None):
        with self.lock:
            document = self.documents.get(query.get("_id"))
            if not document or not matches(document, query):
                return None
            for key, value in update.get("$set", {}).items():
                document[key] = value
            for key in update.get("$unset", {}):
                document.pop(key, None)
            return deepcopy(document)

    def update_one(self, query, update):
        with self.lock:
            document = self.documents.get(query.get("_id"))
            if not document or not matches(document, query):
                return SimpleNamespace(matched_count=0, modified_count=0)
            for key, value in update.get("$set", {}).items():
                document[key] = value
            for key in update.get("$unset", {}):
                document.pop(key, None)
            return SimpleNamespace(matched_count=1, modified_count=1)


def make_cache(collection):
    cache = MongoAnalysisCache(uri="mongodb://mock", collection=collection)
    cache._return_document = SimpleNamespace(AFTER=True)
    cache._duplicate_key_error = DuplicateKeyError
    return cache


def analysis_model():
    return ResumeAnalysis.model_validate({
        "name": "Jane Doe",
        "contact": {
            "email": None, "phone": None, "location": None,
            "linkedin": None, "website": None,
        },
        "professionalSummary": None,
        "education": [],
        "experience": [],
        "projects": [{
            "name": "Resume Analyzer",
            "description": "Built a resume analyzer in Python.",
            "technologies": ["Python"],
            "highlights": ["Built a resume analyzer in Python."],
            "url": None,
        }],
        "skills": ["Python"],
        "skillProfile": {
            "technical": ["Python"], "tools": [], "domain": [], "interpersonal": [],
        },
        "certifications": [],
        "strengths": [{
            "point": "A project is documented.",
            "evidence": "Built a resume analyzer in Python.",
            "whyItMatters": "The resume links Python with an applied project.",
        }],
        "weaknesses": [],
        "improvementSuggestions": [{
            "observation": "The project has no documented outcome.",
            "evidence": "Built a resume analyzer in Python.",
            "suggestion": "Add a genuine outcome if one is available.",
            "rationale": "Supported outcomes clarify project impact.",
            "expectedResult": "The project evidence will be more specific.",
            "priority": "medium",
        }],
        "achievements": [],
        "activities": [],
        "additionalInformation": [],
        "evidenceQuality": {
            "level": "mixed",
            "summary": "The resume includes project evidence.",
            "evidence": ["Built a resume analyzer in Python."],
        },
        "uncertainties": [],
    })


SOURCE = """Jane Doe
PROJECTS
Resume Analyzer
Built a resume analyzer in Python.
SKILLS
Python
"""


class FingerprintTests(unittest.TestCase):
    def test_fingerprint_is_stable_for_normalized_whitespace(self):
        first = build_cache_identity("Jane Doe\nSkills: Python", model_configuration="test")
        second = build_cache_identity("Jane Doe\r\nSkills:   Python", model_configuration="test")
        self.assertEqual(first["contentFingerprint"], second["contentFingerprint"])
        self.assertEqual(first["extractionKey"], second["extractionKey"])

    def test_modified_content_and_processing_versions_change_the_key(self):
        first = build_cache_identity("Jane Doe\nSkills: Python", model_configuration="test")
        changed_content = build_cache_identity("Jane Doe\nSkills: Python, SQL", model_configuration="test")
        changed_prompt = build_cache_identity(
            "Jane Doe\nSkills: Python", model_configuration="test", prompt_version="future-prompt"
        )
        self.assertNotEqual(first["extractionKey"], changed_content["extractionKey"])
        self.assertNotEqual(first["extractionKey"], changed_prompt["extractionKey"])
        self.assertEqual(first["extractionContractVersion"], EXTRACTION_CONTRACT_VERSION)
        self.assertEqual(first["promptVersion"], PROMPT_VERSION)


class PersistentCacheTests(unittest.TestCase):
    def setUp(self):
        self.collection = FakeCollection()
        self.identity = build_cache_identity(SOURCE, model_configuration="test-model")

    def producer(self, calls, delay=0):
        def produce():
            calls.append("called")
            if delay:
                time.sleep(delay)
            model = analysis_model()
            analysis = model.model_dump(by_alias=True)
            from persistent_cache import canonical_score_evidence
            return {
                "analysis": analysis,
                "canonicalEvidence": canonical_score_evidence(analysis),
                "model": "test-model",
            }
        return produce

    @staticmethod
    def validate(value):
        ResumeAnalysis.model_validate(value["analysis"])

    def test_first_upload_stores_only_validated_analysis_and_repeats_without_ai(self):
        calls = []
        cache = make_cache(self.collection)
        first, first_status = cache.resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )
        second, second_status = cache.resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )

        self.assertEqual(first_status, "fresh")
        self.assertEqual(second_status, "memory")
        self.assertEqual(len(calls), 1)
        self.assertEqual(first["analysis"], second["analysis"])
        document = self.collection.documents[self.identity["extractionKey"]]
        self.assertEqual(document["status"], "ready")
        self.assertNotIn("resumeText", document)
        self.assertNotIn("documentBytes", document)

    def test_memory_entry_is_discarded_when_atlas_record_was_cleared(self):
        calls = []
        cache = make_cache(self.collection)
        first, first_status = cache.resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )
        self.collection.documents.pop(self.identity["extractionKey"])

        second, second_status = cache.resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )

        self.assertEqual(first_status, "fresh")
        self.assertEqual(second_status, "fresh")
        self.assertEqual(first["analysis"], second["analysis"])
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.collection.documents[self.identity["extractionKey"]]["status"], "ready")

    def test_restart_and_cross_student_reuse_saved_atlas_analysis(self):
        calls = []
        first, status = make_cache(self.collection).resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )
        # A new cache object models a new Python process or another student's upload.
        second, second_status = make_cache(self.collection).resolve(
            self.identity["extractionKey"], self.identity, self.producer(calls), self.validate
        )
        self.assertEqual(status, "fresh")
        self.assertEqual(second_status, "persistent")
        self.assertEqual(first, second)
        self.assertEqual(len(calls), 1)

    def test_modified_resume_uses_a_new_record_and_runs_fresh_analysis(self):
        calls = []
        cache = make_cache(self.collection)
        cache.resolve(self.identity["extractionKey"], self.identity, self.producer(calls), self.validate)
        changed = build_cache_identity(SOURCE + "SQL\n", model_configuration="test-model")
        cache.resolve(changed["extractionKey"], changed, self.producer(calls), self.validate)
        self.assertNotEqual(self.identity["contentFingerprint"], changed["contentFingerprint"])
        self.assertEqual(len(calls), 2)
        self.assertEqual(len(self.collection.documents), 2)

    def test_concurrent_identical_uploads_share_one_producer(self):
        calls = []
        caches = [make_cache(self.collection) for _ in range(8)]
        barrier = threading.Barrier(len(caches))
        results = []
        errors = []

        def run(cache):
            try:
                barrier.wait()
                results.append(cache.resolve(
                    self.identity["extractionKey"],
                    self.identity,
                    self.producer(calls, delay=0.04),
                    self.validate,
                )[0])
            except Exception as exc:
                errors.append(exc)

        workers = [threading.Thread(target=run, args=(cache,)) for cache in caches]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join(timeout=5)

        self.assertEqual(errors, [])
        self.assertEqual(len(results), len(caches))
        self.assertEqual(len(calls), 1)
        self.assertTrue(all(result == results[0] for result in results))

    def test_atlas_failure_stops_before_the_analysis_producer(self):
        calls = []
        cache = MongoAnalysisCache(uri="mongodb://unavailable")
        with patch.object(cache, "_ensure_collection", side_effect=PersistentCacheUnavailable("offline")):
            with self.assertRaises(PersistentCacheUnavailable):
                cache.resolve(
                    self.identity["extractionKey"],
                    self.identity,
                    self.producer(calls),
                    self.validate,
                )
        self.assertEqual(calls, [])

    def test_invalid_analysis_is_not_marked_ready(self):
        def invalid_producer():
            return {"analysis": {"private": "incomplete"}, "canonicalEvidence": {}, "model": "mock"}
        cache = make_cache(self.collection)
        with self.assertRaises(Exception):
            cache.resolve(self.identity["extractionKey"], self.identity, invalid_producer, self.validate)
        self.assertEqual(self.collection.documents[self.identity["extractionKey"]]["status"], "failed")


class PipelineCacheFlowTests(unittest.TestCase):
    def test_cache_hit_skips_analysis_and_returns_same_validated_result(self):
        collection = FakeCollection()
        calls = []
        cache1 = make_cache(collection)
        cache2 = make_cache(collection)
        with patch("pipeline.extract_document_text", return_value=(SOURCE, 1)), patch(
            "pipeline.analyze_resume_text", side_effect=lambda text: (analysis_model(), "mock-model")
        ) as mocked_analysis:
            first = _analyze_extracted_document(b"pdf", "upload", "pdf", cache=cache1)
            second = _analyze_extracted_document(b"pdf", "upload", "pdf", cache=cache2)

        self.assertEqual(first["metadata"]["cacheStatus"], "fresh")
        self.assertEqual(second["metadata"]["cacheStatus"], "persistent")
        self.assertEqual(first["analysis"], second["analysis"])
        self.assertEqual(first["metadata"]["cacheIdentity"], second["metadata"]["cacheIdentity"])
        self.assertEqual(mocked_analysis.call_count, 1)

    def test_atlas_failure_is_a_clear_error_not_a_groq_fallback(self):
        class FailedCache:
            def resolve(self, *_args, **_kwargs):
                raise PersistentCacheUnavailable("offline")

        with patch("pipeline.extract_document_text", return_value=(SOURCE, 1)), patch(
            "pipeline.analyze_resume_text"
        ) as mocked_analysis:
            with self.assertRaises(PipelineError) as caught:
                _analyze_extracted_document(b"pdf", "upload", "pdf", cache=FailedCache())
        self.assertEqual(caught.exception.code, "persistent_cache_unavailable")
        mocked_analysis.assert_not_called()


if __name__ == "__main__":
    unittest.main()
