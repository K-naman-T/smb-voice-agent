"""Tests for agent_schema.models — AgentVersion, checksum, snapshot."""

import pytest

from agent_schema.models import AgentVersion, AgentStatus, ToolSpec, BusinessProfile


class TestAgentVersion:
    def _make(self, **overrides) -> AgentVersion:
        defaults = {
            "id": "agent-1",
            "tenant_id": "tenant-1",
        }
        defaults.update(overrides)
        return AgentVersion(**defaults)

    def test_auto_checksum(self):
        v = self._make()
        assert v.checksum != ""
        assert len(v.checksum) == 64

    def test_checksum_stability(self):
        v1 = self._make()
        v2 = self._make()
        # Same content → same checksum
        assert v1.checksum == v2.checksum

    def test_checksum_changes_on_content_change(self):
        v1 = self._make()
        v2 = self._make(system_prompt="Hello")
        assert v1.checksum != v2.checksum

    def test_verify_checksum(self):
        v = self._make(system_prompt="test prompt")
        assert v.verify_checksum()

    def test_verify_checksum_detects_tamper(self):
        v = self._make()
        # Tamper with checksum directly
        v.checksum = "0" * 64
        assert not v.verify_checksum()

    def test_recompute_checksum(self):
        v = self._make()
        old = v.checksum
        v.system_prompt = "changed"
        new = v.recompute_checksum()
        assert new != old
        assert v.verify_checksum()

    def test_snapshot_includes_checksum(self):
        v = self._make()
        snap = v.snapshot()
        assert "checksum" in snap
        assert snap["checksum"] == v.checksum

    def test_default_status_is_draft(self):
        v = self._make()
        assert v.status == AgentStatus.DRAFT

    def test_with_tools(self):
        v = self._make(tools=[ToolSpec(name="book_appointment", description="Book")])
        assert len(v.tools) == 1
        assert v.tools[0].name == "book_appointment"

    def test_with_business_profile(self):
        v = self._make(
            business_profile=BusinessProfile(
                business_name="ACME HVAC",
                industry="hvac",
                services=["repair", "install"],
                never_do=["discuss pricing before qualification"],
            )
        )
        assert v.business_profile.business_name == "ACME HVAC"
        assert len(v.business_profile.never_do) == 1

    def test_tenant_id_required(self):
        with pytest.raises(Exception):
            AgentVersion(id="v1")

    def test_checksum_independent_of_order(self):
        """Checksum should not depend on field insertion order in the dict."""
        v1 = self._make(system_prompt="hello")
        dump = v1.snapshot()
        # Reconstruct with different key order
        reordered = {"tenant_id": dump["tenant_id"], "id": dump["id"], "system_prompt": dump["system_prompt"]}
        reordered_full = {k: dump[k] for k in ["id", "tenant_id", "system_prompt", "status", "tools", "business_profile", "model_id"]}
        v2 = AgentVersion(**reordered_full)
        assert v1.checksum == v2.checksum
