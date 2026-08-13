import os


def test_faq_prompt_exists():
    path = os.path.join("agents", "instructions", "faq.md")
    assert os.path.exists(path)
    with open(path) as f:
        content = f.read()
    assert len(content) > 0
