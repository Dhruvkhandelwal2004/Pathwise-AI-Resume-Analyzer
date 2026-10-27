import unittest
from unittest.mock import patch

from models import (
    RESUME_CORE_PROFILE_SCHEMA,
    RESUME_GUIDANCE_SCHEMA,
    RESUME_PORTFOLIO_SCHEMA,
    RESUME_PROFILE_SCHEMA,
)
from pipeline import (
    GUIDANCE_TASK,
    _create_json_completion,
    _is_retryable_structured_output_error,
    _max_completion_tokens,
    _max_retries,
    _model_candidates,
)


class CompletionStub:
    def __init__(self):
        self.request = None
        self.chat = self
        self.completions = self

    def create(self, **kwargs):
        self.request = kwargs
        return object()


class StubStatusError:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body


class StructuredOutputRetryTests(unittest.TestCase):
    def test_retries_failed_generation_without_reading_its_value(self):
        error = StubStatusError(
            400,
            {"error": {"type": "invalid_request_error", "failed_generation": "private"}},
        )
        self.assertTrue(_is_retryable_structured_output_error(error))

    def test_retries_allowlisted_validation_code(self):
        error = StubStatusError(
            400,
            {"error": {"type": "invalid_request_error", "code": "json_validate_failed"}},
        )
        self.assertTrue(_is_retryable_structured_output_error(error))

    def test_does_not_retry_ordinary_bad_request_or_server_error(self):
        bad_request = StubStatusError(
            400,
            {"error": {"type": "invalid_request_error", "code": "invalid_json_schema"}},
        )
        server_error = StubStatusError(500, {"error": {"code": "server_error"}})
        self.assertFalse(_is_retryable_structured_output_error(bad_request))
        self.assertFalse(_is_retryable_structured_output_error(server_error))

    def test_profile_request_uses_strict_schema_without_invented_metrics(self):
        client = CompletionStub()

        _create_json_completion(client, "test-model", "Student resume text")

        request = client.request
        self.assertEqual(
            request["response_format"],
            {
                "type": "json_schema",
                "json_schema": {
                    "name": "resume_analysis_part",
                    "strict": True,
                    "schema": RESUME_PROFILE_SCHEMA,
                },
            },
        )
        self.assertEqual(request["temperature"], 0)
        self.assertEqual(request["max_completion_tokens"], 2_048)
        self.assertEqual(request["reasoning_effort"], "low")
        prompt = request["messages"][0]["content"]
        self.assertIn("Never create a metric", prompt)
        self.assertIn("expected result", prompt)
        self.assertIn("skillProfile", request["messages"][1]["content"])
        self.assertNotIn("evidenceQuality", request["messages"][1]["content"])

    def test_guidance_prompt_uses_smaller_guidance_schema(self):
        client = CompletionStub()

        _create_json_completion(
            client,
            "test-model",
            "Student resume text",
            RESUME_GUIDANCE_SCHEMA,
            GUIDANCE_TASK,
        )

        prompt = client.request["messages"][1]["content"]
        self.assertIn("evidenceQuality", prompt)
        self.assertIn("improvementSuggestions", prompt)
        self.assertNotIn('"education"', prompt)

    def test_qwen_fallback_uses_compact_non_reasoning_budget(self):
        client = CompletionStub()

        _create_json_completion(
            client,
            "qwen/qwen3.8-27b",
            "Student resume text",
        )

        self.assertEqual(client.request["max_completion_tokens"], 900)
        self.assertEqual(client.request["reasoning_effort"], "none")

    def test_two_pass_schemas_preserve_all_final_analysis_fields(self):
        all_keys = set(RESUME_PROFILE_SCHEMA["required"]) | set(
            RESUME_GUIDANCE_SCHEMA["required"]
        )
        self.assertEqual(len(all_keys), 17)
        self.assertTrue(
            set(RESUME_PROFILE_SCHEMA["required"]).isdisjoint(
                RESUME_GUIDANCE_SCHEMA["required"]
            )
        )

    def test_runtime_extraction_schemas_partition_the_profile(self):
        core_keys = set(RESUME_CORE_PROFILE_SCHEMA["required"])
        portfolio_keys = set(RESUME_PORTFOLIO_SCHEMA["required"])
        self.assertTrue(core_keys.isdisjoint(portfolio_keys))
        self.assertEqual(
            core_keys | portfolio_keys | {"skills"},
            set(RESUME_PROFILE_SCHEMA["required"]),
        )


class ProviderRetryConfigurationTests(unittest.TestCase):
    def test_uses_two_provider_retries_by_default(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(_max_retries(), 2)

    def test_accepts_bounded_retry_override(self):
        with patch.dict("os.environ", {"GROQ_MAX_RETRIES": "4"}, clear=True):
            self.assertEqual(_max_retries(), 4)

    def test_rejects_invalid_or_unbounded_retry_override(self):
        for value in ("invalid", "-1", "6"):
            with self.subTest(value=value):
                with patch.dict("os.environ", {"GROQ_MAX_RETRIES": value}, clear=True):
                    self.assertEqual(_max_retries(), 2)

    def test_uses_bounded_completion_budget(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(_max_completion_tokens(), 2_048)
        with patch.dict(
            "os.environ",
            {"GROQ_MAX_COMPLETION_TOKENS": "6000"},
            clear=True,
        ):
            self.assertEqual(_max_completion_tokens(), 6_000)
        for value in ("invalid", "1024", "9000"):
            with self.subTest(value=value):
                with patch.dict(
                    "os.environ",
                    {"GROQ_MAX_COMPLETION_TOKENS": value},
                    clear=True,
                ):
                    self.assertEqual(_max_completion_tokens(), 2_048)

    def test_adds_default_fallback_when_primary_is_different(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(
                _model_candidates("openai/gpt-oss-120b"),
                ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
            )

    def test_does_not_repeat_same_fallback_model(self):
        with patch.dict(
            "os.environ",
            {"GROQ_FALLBACK_MODEL": "openai/gpt-oss-120b"},
            clear=True,
        ):
            self.assertEqual(
                _model_candidates("openai/gpt-oss-120b"),
                ["openai/gpt-oss-120b"],
            )


if __name__ == "__main__":
    unittest.main()
