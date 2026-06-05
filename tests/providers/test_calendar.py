import pytest
from providers.base import TimeSlot, CustomerProfile
from providers.calendar import CalComProvider


@pytest.mark.asyncio
async def test_cal_com_no_api_key():
    cal = CalComProvider(api_url="", api_key="")
    slots = await cal.get_slots("2026-06-10", "AC Repair")
    assert isinstance(slots, list)
    assert len(slots) == 0


@pytest.mark.asyncio
async def test_cal_com_book_no_api():
    cal = CalComProvider(api_url="", api_key="")
    slot = TimeSlot(start="2026-06-10T10:00:00", end="2026-06-10T11:00:00")
    cust = CustomerProfile(phone="+919999999999", name="Test User")
    booking = await cal.book(slot, cust)
    assert booking.status == "unavailable"
