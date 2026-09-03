"""Agent Compiler (§1.4, §4 P6).

Compiles a BusinessProfile and IndustryKit into an immutable AgentVersion:
  - Assembles prompt adhering strictly to prompt budget and voice guidelines.
  - Attaches standard tool specifications (book_appointment, etc.).
  - Binds hard never_do constraints into prompt and structured profile.
  - Automatically computes canonical SHA-256 checksum.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from agent_schema.models import AgentStatus, AgentVersion, BusinessProfile, ToolSpec
from agent_compiler.kits import IndustryKit, get_industry_kit


def generate_system_prompt(profile: BusinessProfile, kit: IndustryKit) -> str:
    """Generate concise voice-first system prompt."""
    name = profile.business_name or kit.business_name
    hours = profile.hours or kit.hours
    services_list = ", ".join(profile.services or kit.services)
    pricing_lines = "\n".join(f"- {k}: {v}" for k, v in kit.pricing.items())
    never_do_lines = "\n".join(f"- {rule}" for rule in (profile.never_do or kit.never_do))

    return f"""You are the friendly, professional phone assistant for {name}.
Operating Hours: {hours}
Services Offered: {services_list}
Estimated Pricing:
{pricing_lines}
Emergency Protocol: {kit.emergency_policy}

VOICE RULES (CRITICAL FOR AUDIO QUALITY):
1. Speak in natural, concise sentences (maximum 2 sentences per turn).
2. Never recite long lists; ask clarifying questions.
3. When the customer wants to book a service, extract their name, preferred date/time, and service type, then call the book_appointment tool.
4. Never confirm a booking until the tool returns a confirmation.
5. In case of urgent hazards, advise immediate safety measures per Emergency Protocol.

STRICT RESTRICTIONS (NEVER DO):
{never_do_lines}
"""


def build_default_tools() -> List[ToolSpec]:
    """Build standard tool definitions for service businesses."""
    return [
        ToolSpec(
            name="book_appointment",
            description="Book or schedule a customer service appointment.",
            parameters={
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "Full name of the caller/customer",
                    },
                    "customer_phone": {
                        "type": "string",
                        "description": "Caller phone number with country/area code",
                    },
                    "service_type": {
                        "type": "string",
                        "description": "The exact service requested (e.g. AC Repair)",
                    },
                    "scheduled_time": {
                        "type": "string",
                        "description": "Preferred appointment date and time in ISO or clear spoken format",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Specific issue description or special instructions",
                    },
                },
                "required": ["customer_name", "service_type", "scheduled_time"],
            },
        ),
        ToolSpec(
            name="check_availability",
            description="Check available appointment slots for a given date.",
            parameters={
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Date to query availability (YYYY-MM-DD)",
                    }
                },
                "required": ["date"],
            },
        ),
        ToolSpec(
            name="route_emergency",
            description="Escalate and route an urgent hazard or emergency call to the on-call technician.",
            parameters={
                "type": "object",
                "properties": {
                    "emergency_type": {
                        "type": "string",
                        "description": "Nature of emergency (e.g. gas leak, electrical spark)",
                    },
                    "customer_phone": {
                        "type": "string",
                        "description": "Callback phone number",
                    },
                },
                "required": ["emergency_type", "customer_phone"],
            },
        ),
    ]


def compile_agent_version(
    agent_id: str,
    tenant_id: str,
    profile: Optional[BusinessProfile] = None,
    industry: str = "hvac",
    model_id: str = "Qwen3.5-9B-Q4_K_M.gguf",
    version_num: int = 1,
) -> AgentVersion:
    """Compile structured business profile into an immutable AgentVersion."""
    kit = get_industry_kit(industry)

    if profile is None:
        profile = BusinessProfile(
            business_name=kit.business_name,
            industry=kit.industry,
            hours=kit.hours,
            services=list(kit.services),
            never_do=list(kit.never_do),
        )

    system_prompt = generate_system_prompt(profile, kit)
    tools = build_default_tools()
    version_id = f"ver_{uuid.uuid4().hex[:12]}"

    return AgentVersion(
        id=version_id,
        tenant_id=tenant_id,
        version=version_num,
        status=AgentStatus.DRAFT,
        system_prompt=system_prompt,
        tools=tools,
        business_profile=profile,
        model_id=model_id,
    )
