"""Tests for agent_schema.checksum — canonical JSON + SHA-256 stability."""

import json

from agent_schema.checksum import canonical_json, sha256_checksum, compute_checksum


class TestCanonicalJson:
    def test_sorted_keys(self):
        result = canonical_json({"z": 1, "a": 2})
        assert result == b'{"a":2,"z":1}'

    def test_nested_sorted_keys(self):
        result = canonical_json({"b": {"z": 1, "a": 2}, "a": 1})
        parsed = json.loads(result)
        assert list(parsed.keys()) == ["a", "b"]
        assert list(parsed["b"].keys()) == ["a", "z"]

    def test_no_whitespace(self):
        result = canonical_json({"key": "value", "num": 42})
        assert b" " not in result
        assert result == b'{"key":"value","num":42}'

    def test_bool_normalization(self):
        result = canonical_json({"t": True, "f": False, "n": None})
        assert b"true" in result
        assert b"false" in result
        assert b"null" in result

    def test_deterministic(self):
        obj = {"tools": [{"name": "book", "params": {"date": "2026-01-01"}}]}
        assert canonical_json(obj) == canonical_json(obj)

    def test_different_objects_produce_different_json(self):
        a = canonical_json({"x": 1})
        b = canonical_json({"x": 2})
        assert a != b


class TestSha256Checksum:
    def test_hex_lowercase(self):
        h = sha256_checksum(b"hello")
        assert len(h) == 64
        assert h == h.lower()
        assert all(c in "0123456789abcdef" for c in h)

    def test_deterministic(self):
        assert sha256_checksum(b"test") == sha256_checksum(b"test")

    def test_different_inputs(self):
        assert sha256_checksum(b"a") != sha256_checksum(b"b")

    def test_known_value(self):
        # SHA-256 of empty string
        h = sha256_checksum(b"")
        assert h == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


class TestComputeChecksum:
    def test_checksum_ignores_existing(self):
        payload = {"id": "v1", "checksum": "old-value"}
        c1 = compute_checksum(payload)
        payload["checksum"] = "different"
        c2 = compute_checksum(payload)
        assert c1 == c2

    def test_checksum_changes_with_payload(self):
        p1 = {"id": "v1"}
        p2 = {"id": "v2"}
        assert compute_checksum(p1) != compute_checksum(p2)

    def test_checksum_is_64_char_hex(self):
        c = compute_checksum({"id": "test"})
        assert len(c) == 64
        assert all(ch in "0123456789abcdef" for ch in c)
