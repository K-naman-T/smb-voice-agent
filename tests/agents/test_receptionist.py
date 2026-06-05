from agents.receptionist import INDUSTRY_CONTEXT


def test_industry_context_loaded():
    assert "hvac" in INDUSTRY_CONTEXT
    assert INDUSTRY_CONTEXT["hvac"]["name"] == "CoolAir Services"


def test_all_industries_present():
    expected = {"hvac", "plumbing", "electrical", "pest_control"}
    assert set(INDUSTRY_CONTEXT.keys()) == expected


def test_each_industry_has_required_fields():
    for ind, ctx in INDUSTRY_CONTEXT.items():
        assert "name" in ctx
        assert "services" in ctx
        assert "hours" in ctx
        assert len(ctx["services"]) > 0
