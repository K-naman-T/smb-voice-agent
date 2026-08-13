from __future__ import annotations
from typing import Optional
from livekit.agents import Agent as LiveKitAgent, JobContext
from providers.base import (
    LLMProvider, STTProvider, TTSProvider,
    CalendarProvider, SMSProvider, MemoryProvider,
    Message,
)


class BaseVoiceAgent:
    def __init__(self, ctx: JobContext, providers: dict, system_prompt: str = ""):
        self.ctx = ctx
        self.llm: LLMProvider = providers["llm"]
        self.stt: STTProvider = providers["stt"]
        self.tts: TTSProvider = providers["tts"]
        self.calendar: Optional[CalendarProvider] = providers.get("calendar")
        self.sms: SMSProvider = providers["sms"]
        self.memory: MemoryProvider = providers["memory"]
        self.system_prompt = system_prompt
        self.conversation_history: list[Message] = []

    async def process_turn(self, transcript: str) -> str:
        self.conversation_history.append(Message(role="user", content=transcript))
        messages = [Message(role="system", content=self.system_prompt)]
        messages.extend(self.conversation_history[-10:])

        tools = self._get_tools()
        result = await self.llm.chat(messages, tools=tools)

        if result.tool_calls:
            for tc in result.tool_calls:
                await self._execute_tool(tc)

        if result.content:
            self.conversation_history.append(Message(role="assistant", content=result.content))
        return result.content

    def _get_tools(self) -> list[dict]:
        tools = []
        if self.calendar:
            tools.extend([
                {
                    "type": "function",
                    "function": {
                        "name": "book_appointment",
                        "description": "Book a service appointment",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "service": {"type": "string"},
                                "time": {"type": "string"},
                                "customer_name": {"type": "string"},
                            },
                            "required": ["service", "time", "customer_name"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_available_slots",
                        "description": "Get available appointment slots",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string"},
                                "service": {"type": "string"},
                            },
                            "required": ["date", "service"],
                        },
                    },
                },
            ])
        return tools

    async def _execute_tool(self, tc):
        name = tc.name
        args = tc.arguments
        if name == "book_appointment" and self.calendar:
            from providers.base import TimeSlot, CustomerProfile
            slot = TimeSlot(start=args.get("time", ""), end="")
            customer = CustomerProfile(name=args.get("customer_name", ""))
            booking = await self.calendar.book(slot, customer)
            if booking.status == "confirmed":
                await self.sms.send(customer.phone, f"Confirmed: {args.get('service')} at {args.get('time')}")
        elif name == "get_available_slots" and self.calendar:
            await self.calendar.get_slots(args.get("date", ""), args.get("service", ""))
