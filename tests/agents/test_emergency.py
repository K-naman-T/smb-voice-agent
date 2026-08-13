import os


def test_emergency_prompt_exists():
    path = os.path.join("agents", "instructions", "emergency.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
    assert "emergency" in content.lower()
