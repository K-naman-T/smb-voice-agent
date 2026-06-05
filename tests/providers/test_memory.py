import pytest
from providers.memory import SQLiteVecMemory


@pytest.mark.asyncio
async def test_memory_lookup_empty():
    mem = SQLiteVecMemory(db_path=":memory:")
    profile = await mem.lookup("+919999999999")
    assert profile is None


@pytest.mark.asyncio
async def test_memory_store_and_lookup():
    mem = SQLiteVecMemory(db_path=":memory:")
    await mem.store_conversation("+919999999999", "Hi, I need AC repair", "Customer needs AC repair service")
    profile = await mem.lookup("+919999999999")
    assert profile is not None
    assert profile.phone == "+919999999999"
    assert profile.total_calls >= 1


@pytest.mark.asyncio
async def test_memory_search():
    mem = SQLiteVecMemory(db_path=":memory:")
    await mem.store_conversation("+919999999999", "I need AC repair urgently", "Urgent AC repair request")
    results = await mem.search("urgent AC repair", limit=5)
    assert isinstance(results, list)
    assert len(results) >= 1
