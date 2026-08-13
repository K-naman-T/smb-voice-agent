"""Agent store — the configurator backend.

Each agent is a JSON profile: business identity + services + pricing +
voice + language + custom rules. The store mints agent ids, persists to
agents_registry.json, and builds system prompts for the LLM.
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime

REGISTRY_PATH = os.getenv("AGENT_REGISTRY", os.path.join(os.path.dirname(__file__), "agents_registry.json"))
DEFAULT_AGENT_ID = "coolair-hvac"

VOICES = {
    "en-US-AriaNeural": "Aria (English, female)",
    "en-US-JennyNeural": "Jenny (English, female)",
    "en-US-GuyNeural": "Guy (English, male)",
    "hi-IN-SwaraNeural": "Swara (Hindi, female)",
    "hi-IN-MadhurNeural": "Madhur (Hindi, male)",
    "en-IN-NeerjaNeural": "Neerja (English-IN, female)",
    "en-IN-PrabhatNeural": "Prabhat (English-IN, male)",
}

LANGUAGES = ["english", "hinglish", "hindi"]

DEFAULT_PROFILE = {
    "id": DEFAULT_AGENT_ID,
    "name": "CoolAir Services",
    "industry": "hvac",
    "tagline": "AI receptionist",
    "services": ["AC Repair", "AC Installation", "AC Servicing", "AC Gas Refilling"],
    "pricing": {"AC Repair": "starting at ₹500", "AC Servicing": "₹1,200 standard, ₹2,500 deep clean"},
    "hours": "8 AM to 8 PM, Monday to Sunday",
    "emergency": "24/7 emergency AC service available",
    "voice": "en-US-AriaNeural",
    "language": "hinglish",
    "greeting": "Hi! You've reached CoolAir Services. How can I help you today?",
    "never_do": [],
    "kb": "",
    "created_at": "2026-08-14T00:00:00Z",
}


def _load() -> dict:
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH) as f:
                data = json.load(f)
            if isinstance(data, dict) and data:
                return data
        except Exception:
            pass
    return {}


def _save(data: dict) -> None:
    with open(REGISTRY_PATH, "w") as f:
        json.dump(data, f, indent=2)


def all_agents() -> dict:
    data = _load()
    if DEFAULT_AGENT_ID not in data:
        data[DEFAULT_AGENT_ID] = DEFAULT_PROFILE
        _save(data)
    return data


def get_agent(agent_id: str) -> dict | None:
    if not agent_id:
        agent_id = DEFAULT_AGENT_ID
    return all_agents().get(agent_id)


def _clean(v: str) -> str:
    return re.sub(r"[\r\n]+", " ", (v or "")).strip()


def create_agent(profile: dict) -> dict:
    data = all_agents()
    agent_id = re.sub(r"[^a-z0-9-]+", "-", (profile.get("id") or profile.get("name", "")).lower().strip())
    agent_id = re.sub(r"-{2,}", "-", agent_id).strip("-") or f"agent-{uuid.uuid4().hex[:8]}"
    if agent_id in data and profile.get("id") != agent_id:
        agent_id = f"{agent_id}-{uuid.uuid4().hex[:4]}"

    services = [s.strip() for s in _clean(profile.get("services", "")).split(",") if s.strip()] or ["General Service"]
    pricing = {}
    for line in _clean(profile.get("pricing", "")).split(";"):
        if ":" in line:
            k, _, v = line.partition(":")
            pricing[k.strip()] = v.strip()

    never_do = [n.strip() for n in _clean(profile.get("never_do", "")).split(";") if n.strip()]

    agent = {
        "id": agent_id,
        "name": _clean(profile.get("name")) or "Local Service Business",
        "industry": _clean(profile.get("industry")) or "general",
        "tagline": _clean(profile.get("tagline")) or "AI receptionist",
        "services": services,
        "pricing": pricing,
        "hours": _clean(profile.get("hours")) or "9 AM to 6 PM, Monday to Saturday",
        "emergency": _clean(profile.get("emergency")) or "24/7 for emergencies",
        "voice": profile.get("voice") if profile.get("voice") in VOICES else "en-US-AriaNeural",
        "language": profile.get("language") if profile.get("language") in LANGUAGES else "hinglish",
        "greeting": _clean(profile.get("greeting")) or DEFAULT_PROFILE["greeting"],
        "never_do": never_do,
        "kb": _clean(profile.get("kb")),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    data[agent_id] = agent
    _save(data)
    return agent


def build_system_prompt(agent: dict) -> str:
    pricing_lines = "".join(f"- {k}: {v}\n" for k, v in agent.get("pricing", {}).items())
    never_lines = "".join(f"- {r}\n" for r in agent.get("never_do", []))
    lang_rule = {
        "english": "Always reply in English.",
        "hinglish": "If the customer speaks Hindi or Hinglish, reply in the same language; otherwise English.",
        "hindi": "Reply in Hindi.",
    }.get(agent.get("language", "hinglish"), "Reply in the customer's language.")

    prompt = f"""You are a professional AI phone assistant for a small business in India.

## Business
- Name: {agent['name']} ({agent['industry']})
- Hours: {agent['hours']}
- Emergency: {agent['emergency']}
- Services: {', '.join(agent['services'])}
{pricing_lines}
## Language
{lang_rule}

## Rules
- Be brief and natural — max 2 sentences per response
- Speak in a warm, professional tone
- Always confirm details before booking
- If the caller is angry or frustrated, apologize and de-escalate
- If you don't know something, be honest and offer to connect to a human
"""
    if never_lines:
        prompt += "\n## Never do\n" + never_lines
    if agent.get("kb"):
        prompt += "\n## Business knowledge\n" + agent["kb"] + "\n"

    prompt += """
## Booking protocol (IMPORTANT)
When the customer asks to book/appoint/schedule, collect service type, preferred
time, and customer name. Then reply with a natural confirmation sentence followed
by a single line exactly like:
[BOOK: service|time|name]
Never invent a phone number. If details are missing, ask for them first.
"""
    return prompt
