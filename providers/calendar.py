from __future__ import annotations
import httpx
from .base import CalendarProvider, TimeSlot, Booking, CustomerProfile


class CalComProvider(CalendarProvider):
    def __init__(self, api_url: str = "", api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key

    async def get_slots(self, date: str, service: str) -> list[TimeSlot]:
        if not self.api_key or not self.api_url:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.api_url}/slots",
                    params={"date": date, "service": service},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [TimeSlot(start=s["start"], end=s["end"]) for s in data.get("slots", [])]
                return []
        except Exception:
            return []

    async def book(self, slot: TimeSlot, customer: CustomerProfile) -> Booking:
        if not self.api_key or not self.api_url:
            return Booking(status="unavailable")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.api_url}/bookings",
                    json={
                        "start": slot.start, "end": slot.end,
                        "attendee": {"name": customer.name, "email": "", "phone": customer.phone},
                    },
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return Booking(id=data.get("id", ""), time=slot.start, customer_name=customer.name, status="confirmed")
                return Booking(status="failed")
        except Exception:
            return Booking(status="failed")
