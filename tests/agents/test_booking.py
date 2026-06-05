import os


def test_booking_prompt_exists():
    path = os.path.join("agents", "instructions", "booking.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
    assert "book_appointment" in content
