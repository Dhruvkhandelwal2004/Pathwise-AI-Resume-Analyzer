from __future__ import annotations

import json
import os
import threading
import time
import uuid
from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any, Callable


MEMORY_CACHE_MAX_ENTRIES = 64
MEMORY_CACHE_TTL_SECONDS = 30 * 60
EXTRACTION_LEASE_SECONDS = 90
EXTRACTION_WAIT_SECONDS = 10 * 60


class PersistentCacheUnavailable(RuntimeError):
    """Raised when the persistent cache cannot safely serve a request."""


def stable_json_hash(value: Any) -> str:
    serialized = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return sha256(serialized.encode("utf-8")).hexdigest()


def canonical_score_evidence(payload: dict[str, Any]) -> dict[str, Any]:
    fields = (
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
        "educationScore",
    )
    return {field: deepcopy(payload.get(field)) for field in fields}


class MongoAnalysisCache:
    def __init__(
        self,
        uri: str | None = None,
        database_name: str | None = None,
        *,
        collection=None,
    ):
        self._uri = uri or os.getenv("MONGODB_URI", "").strip()
        self._database_name = (
            database_name or os.getenv("MONGODB_DATABASE", "pathwise")
        ).strip()
        self._collection = collection
        self._client = None
        self._return_document = None
        self._duplicate_key_error = None
        self._memory: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
        self._memory_lock = threading.RLock()

    def _ensure_collection(self):
        if self._collection is not None:
            return self._collection
        if not self._uri:
            raise PersistentCacheUnavailable("MONGODB_URI is not configured.")
        client = None
        try:
            from pymongo import ASCENDING, MongoClient, ReturnDocument
            from pymongo.errors import DuplicateKeyError

            client = MongoClient(
                self._uri,
                serverSelectionTimeoutMS=7_000,
                connectTimeoutMS=5_000,
                socketTimeoutMS=5_000,
                tz_aware=True,
            )
            client.admin.command("ping")
            collection = client[self._database_name]["resume_analysis_cache"]
            collection.create_index(
                [("status", ASCENDING), ("leaseUntil", ASCENDING)]
            )
        except Exception as exc:
            if client is not None:
                client.close()
            raise PersistentCacheUnavailable(
                "The persistent resume cache is unavailable."
            ) from exc
        self._client = client
        self._collection = collection
        self._return_document = ReturnDocument
        self._duplicate_key_error = DuplicateKeyError
        return collection

    def _memory_get(self, key: str) -> dict[str, Any] | None:
        now = time.monotonic()
        with self._memory_lock:
            cached = self._memory.get(key)
            if cached is None:
                return None
            expires_at, value = cached
            if expires_at <= now:
                self._memory.pop(key, None)
                return None
            self._memory.move_to_end(key)
            return deepcopy(value)

    def _memory_put(self, key: str, value: dict[str, Any]) -> None:
        with self._memory_lock:
            self._memory[key] = (
                time.monotonic() + MEMORY_CACHE_TTL_SECONDS,
                deepcopy(value),
            )
            self._memory.move_to_end(key)
            while len(self._memory) > MEMORY_CACHE_MAX_ENTRIES:
                self._memory.popitem(last=False)

    def _memory_remove(self, key: str) -> None:
        with self._memory_lock:
            self._memory.pop(key, None)

    @staticmethod
    def _ready_payload(
        document: dict[str, Any],
        expected_key: str,
        expected_identity: dict[str, Any],
    ) -> dict[str, Any] | None:
        analysis = document.get("analysis")
        identity = document.get("cacheIdentity")
        canonical_evidence = document.get("canonicalEvidence")
        if (
            document.get("status") != "ready"
            or not isinstance(analysis, dict)
            or not isinstance(identity, dict)
            or not isinstance(canonical_evidence, dict)
        ):
            return None
        for field in (
            "extractionKey",
            "contentFingerprint",
            "extractionContractVersion",
            "promptVersion",
            "modelConfiguration",
        ):
            if identity.get(field) != expected_identity.get(field):
                return None
        if identity.get("extractionKey") != expected_key:
            return None
        if identity.get("canonicalAnalysisHash") != stable_json_hash(analysis):
            return None
        return {
            "analysis": analysis,
            "canonicalEvidence": canonical_evidence,
            "model": document.get(
                "actualModel", expected_identity.get("modelConfiguration")
            ),
            "cacheIdentity": identity,
        }

    def _claim_lease(
        self,
        collection,
        key: str,
        identity: dict[str, Any],
        owner: str,
        now: datetime,
    ) -> bool:
        lease_until = now + timedelta(seconds=EXTRACTION_LEASE_SECONDS)
        processing_update = {
            "$set": {
                "status": "processing",
                "owner": owner,
                "leaseUntil": lease_until,
                "cacheIdentity": identity,
                "lastUsedAt": now,
            },
            "$unset": {
                "analysis": "",
                "canonicalEvidence": "",
                "actualModel": "",
                "qualityResult": "",
                "scoringRubricVersion": "",
                "overallScore": "",
                "sectionBreakdown": "",
                "completedAt": "",
                "scoredAt": "",
            },
        }
        document = collection.find_one({"_id": key})
        if document is None:
            try:
                collection.insert_one(
                    {
                        "_id": key,
                        "status": "processing",
                        "owner": owner,
                        "leaseUntil": lease_until,
                        "cacheIdentity": identity,
                        "createdAt": now,
                        "lastUsedAt": now,
                    }
                )
                return True
            except self._duplicate_key_error:
                return False
            except Exception as exc:
                raise PersistentCacheUnavailable(
                    "The persistent resume cache could not reserve analysis."
                ) from exc

        if document.get("status") == "processing":
            current_lease = document.get("leaseUntil")
            if current_lease is not None and current_lease > now:
                return False
            query = {
                "_id": key,
                "status": "processing",
                "owner": document.get("owner"),
            }
            if current_lease is not None:
                query["leaseUntil"] = current_lease
        else:
            query = {"_id": key, "status": document.get("status")}

        try:
            claimed = collection.find_one_and_update(
                query,
                processing_update,
                return_document=self._return_document.AFTER,
            )
        except Exception as exc:
            raise PersistentCacheUnavailable(
                "The persistent resume cache could not reserve analysis."
            ) from exc
        return bool(claimed and claimed.get("owner") == owner)

    @staticmethod
    def _heartbeat(collection, key: str, owner: str) -> tuple[threading.Event, threading.Thread]:
        stop = threading.Event()

        def renew() -> None:
            interval = max(1.0, EXTRACTION_LEASE_SECONDS / 3)
            while not stop.wait(interval):
                renewed_at = datetime.now(timezone.utc)
                try:
                    result = collection.update_one(
                        {"_id": key, "status": "processing", "owner": owner},
                        {
                            "$set": {
                                "leaseUntil": renewed_at
                                + timedelta(seconds=EXTRACTION_LEASE_SECONDS),
                                "lastUsedAt": renewed_at,
                            }
                        },
                    )
                except Exception:
                    return
                if getattr(result, "matched_count", 0) != 1:
                    return

        thread = threading.Thread(
            target=renew,
            name="resume-cache-lease-heartbeat",
            daemon=True,
        )
        thread.start()
        return stop, thread

    def resolve(
        self,
        key: str,
        identity: dict[str, Any],
        producer: Callable[[], dict[str, Any]],
        validator: Callable[[dict[str, Any]], None],
    ) -> tuple[dict[str, Any], str]:
        def validate_ready(value: dict[str, Any]) -> bool:
            try:
                validator(value)
                return True
            except Exception:
                return False

        collection = self._ensure_collection()
        cached = self._memory_get(key)
        if cached is not None:
            if validate_ready(cached):
                try:
                    document = collection.find_one({"_id": key})
                except Exception as exc:
                    raise PersistentCacheUnavailable(
                        "The persistent resume cache could not be read."
                    ) from exc
                ready = (
                    self._ready_payload(document, key, identity)
                    if document is not None
                    else None
                )
                if ready is not None and validate_ready(ready):
                    return cached, "memory"
            self._memory_remove(key)

        deadline = time.monotonic() + EXTRACTION_WAIT_SECONDS
        owner = uuid.uuid4().hex
        owns_lease = False

        while not owns_lease:
            now = datetime.now(timezone.utc)
            try:
                document = collection.find_one({"_id": key})
            except Exception as exc:
                raise PersistentCacheUnavailable(
                    "The persistent resume cache could not be read."
                ) from exc

            if document is not None:
                ready = self._ready_payload(document, key, identity)
                if ready is not None and validate_ready(ready):
                    try:
                        collection.update_one(
                            {"_id": key, "status": "ready"},
                            {"$set": {"lastUsedAt": now}},
                        )
                    except Exception as exc:
                        raise PersistentCacheUnavailable(
                            "The persistent resume cache could not update access time."
                        ) from exc
                    self._memory_put(key, ready)
                    return deepcopy(ready), "persistent"

            owns_lease = self._claim_lease(
                collection, key, identity, owner, now
            )
            if owns_lease:
                break
            if time.monotonic() >= deadline:
                raise PersistentCacheUnavailable(
                    "Timed out waiting for an identical resume analysis."
                )
            time.sleep(0.2)

        heartbeat_stop, heartbeat_thread = self._heartbeat(collection, key, owner)
        try:
            produced = producer()
            analysis = produced.get("analysis")
            canonical_evidence = produced.get("canonicalEvidence")
            if not isinstance(analysis, dict) or not isinstance(canonical_evidence, dict):
                raise ValueError("Only validated analysis may be cached.")
            completed_identity = {
                **identity,
                "canonicalAnalysisHash": stable_json_hash(analysis),
            }
            completed = {
                "analysis": analysis,
                "canonicalEvidence": canonical_evidence,
                "model": produced.get("model"),
                "cacheIdentity": completed_identity,
            }
            if not validate_ready(completed):
                raise ValueError("Analysis did not pass cache validation.")
            completed_at = datetime.now(timezone.utc)
            try:
                result = collection.update_one(
                    {"_id": key, "status": "processing", "owner": owner},
                    {
                        "$set": {
                            "status": "ready",
                            "analysis": analysis,
                            "canonicalEvidence": canonical_evidence,
                            "cacheIdentity": completed_identity,
                            "actualModel": produced.get("model"),
                            "lastUsedAt": completed_at,
                            "completedAt": completed_at,
                        },
                        "$unset": {"owner": "", "leaseUntil": ""},
                    },
                )
            except Exception as exc:
                raise PersistentCacheUnavailable(
                    "The persistent resume cache could not save analysis."
                ) from exc
            if getattr(result, "matched_count", 0) != 1:
                raise PersistentCacheUnavailable(
                    "The resume analysis lease was lost before saving."
                )
            self._memory_put(key, completed)
            return deepcopy(completed), "fresh"
        except Exception:
            try:
                collection.update_one(
                    {"_id": key, "status": "processing", "owner": owner},
                    {
                        "$set": {"status": "failed"},
                        "$unset": {"owner": "", "leaseUntil": ""},
                    },
                )
            except Exception:
                pass
            raise
        finally:
            heartbeat_stop.set()
            heartbeat_thread.join(timeout=1)


_default_cache: MongoAnalysisCache | None = None
_default_cache_lock = threading.Lock()


def get_default_cache() -> MongoAnalysisCache:
    global _default_cache
    with _default_cache_lock:
        if _default_cache is None:
            _default_cache = MongoAnalysisCache()
        return _default_cache
