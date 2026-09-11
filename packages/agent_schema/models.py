"""AgentVersion data model.

§1.2 I2: Immutable once live; checksum server-computed.
§2.22: checksum = sha256(canonical_json(payload without checksum)).
§2.9  I6: Tool state machine PROPOSED→CONFIRMED→COMMITTED.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator

from agent_schema.checksum import compute_checksum
from agent_schema.lifecycle import AgentStatus


class ToolSpec(BaseModel):
    """Definition of a single tool available to the agent."""

    name: str
    description: str = ""
    parameters: dict[str, Any] = Field(default_factory=dict)


class BusinessProfile(BaseModel):
    """Structured business profile — §1.4 GUI edit input."""

    business_name: str = ""
    industry: str = ""
    hours: str = ""
    services: list[str] = Field(default_factory=list)
    never_do: list[str] = Field(default_factory=list)
    kb_entries: list[dict[str, Any]] = Field(default_factory=list)


class AgentVersion(BaseModel):
    """Immutable agent blueprint.

    On creation/checksum(), the `checksum` field is set to
    sha256(canonical_json(all other fields)).
    """

    id: str
    tenant_id: str
    version: int = 1
    status: AgentStatus = AgentStatus.DRAFT
    system_prompt: str = ""
    tools: list[ToolSpec] = Field(default_factory=list)
    business_profile: BusinessProfile = Field(default_factory=BusinessProfile)
    model_id: str = "llm.chomp.fast"
    stt_model_id: str = "stt.whisper.small"
    tts_model_id: str = "tts.kokoro.en"
    pipeline_mode: str = "cascaded"
    paralinguistic_tags: bool = False
    autonomous_recovery: bool = True
    checksum: str = ""

    @model_validator(mode="after")
    def _set_checksum(self) -> "AgentVersion":
        """Compute and set checksum if empty."""
        if not self.checksum:
            self.checksum = self._compute()
        return self

    def _compute(self) -> str:
        return compute_checksum(self.model_dump(exclude={"checksum"}))

    def verify_checksum(self) -> bool:
        """Return True if stored checksum matches recomputed value."""
        return self.checksum == self._compute()

    def recompute_checksum(self) -> str:
        """Recompute and store checksum. Returns new value."""
        self.checksum = self._compute()
        return self.checksum

    def snapshot(self) -> dict[str, Any]:
        """Export as plain dict with checksum included."""
        return self.model_dump()
