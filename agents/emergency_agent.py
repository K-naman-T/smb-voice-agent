from __future__ import annotations
import os
from livekit.agents import JobContext
from agents.base import BaseVoiceAgent


class EmergencyAgent(BaseVoiceAgent):
    def __init__(self, ctx: JobContext, providers: dict):
        prompt_path = os.path.join(os.path.dirname(__file__), "instructions", "emergency.md")
        with open(prompt_path) as f:
            prompt = f.read()
        super().__init__(ctx, providers, system_prompt=prompt)

    async def on_enter(self):
        audio = await self.tts.synthesize(
            "I understand this is urgent. Let me help you right away. "
            "Could you please tell me your name and what the emergency is?"
        )
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)

    async def llm_turn(self, transcript: str):
        response = await self.process_turn(transcript)
        audio = await self.tts.synthesize(response)
        if audio:
            await self.ctx.room.local_participant.publish_data(audio)
        return response
