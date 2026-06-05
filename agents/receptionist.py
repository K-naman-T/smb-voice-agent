from __future__ import annotations
import os
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent

INDUSTRY_CONTEXT = {
    "hvac": {
        "name": "CoolAir Services",
        "services": ["AC Repair", "AC Installation", "AC Servicing", "AC Gas Refilling"],
        "hours": "8 AM to 8 PM, Monday to Sunday",
    },
    "plumbing": {
        "name": "QuickFix Plumbing",
        "services": ["Leak Repair", "Pipe Unclogging", "Water Heater Repair"],
        "hours": "7 AM to 9 PM, Monday to Saturday",
    },
    "electrical": {
        "name": "PowerPro Electricians",
        "services": ["Wiring", "Fan Installation", "Switchboard Repair"],
        "hours": "7 AM to 9 PM, Monday to Sunday",
    },
    "pest_control": {
        "name": "SafeGuard Pest Control",
        "services": ["Cockroach Treatment", "Termite Control", "Bed Bug Treatment"],
        "hours": "8 AM to 7 PM, Monday to Sunday",
    },
}


class ReceptionistAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict, industry: str = "hvac"):
        prompt_path = os.path.join(os.path.dirname(__file__), "instructions", "receptionist.md")
        with open(prompt_path) as f:
            base_prompt = f.read()
        biz = INDUSTRY_CONTEXT.get(industry, INDUSTRY_CONTEXT["hvac"])
        full_prompt = f"""{base_prompt}

## Business Context
Business Name: {biz['name']}
Industry: {industry}
Services: {', '.join(biz['services'])}
Hours: {biz['hours']}
"""
        super().__init__(ctx, providers, system_prompt=full_prompt)
        self.industry = industry
        self.business = biz

    async def on_enter(self):
        caller_phone = ""
        if self.ctx.room and self.ctx.room.metadata:
            import json
            try:
                meta = json.loads(self.ctx.room.metadata)
                caller_phone = meta.get("caller_phone", "")
            except json.JSONDecodeError:
                pass
        if caller_phone:
            self.current_caller = await self.memory.lookup(caller_phone)

        greeting = ""
        if self.current_caller and self.current_caller.name:
            greeting = f"Welcome back, {self.current_caller.name}! "
        text = f"Thanks for calling {self.business['name']}. {greeting}How can I help you today?"
        audio = await self.tts.synthesize(text)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
