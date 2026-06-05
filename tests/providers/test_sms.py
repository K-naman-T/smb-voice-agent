import pytest
from providers.sms import ConsoleSMS


@pytest.mark.asyncio
async def test_console_sms():
    sms = ConsoleSMS()
    result = await sms.send("+919999999999", "Test message")
    assert result is True


@pytest.mark.asyncio
async def test_console_sms_empty():
    sms = ConsoleSMS()
    result = await sms.send("", "")
    assert result is True
