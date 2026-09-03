"""Industry Kits for Small Business Verticals (§2.6, §4 P6).

Provides verified baseline profiles for:
  - HVAC (CoolAir Services)
  - Plumbing (QuickFix Plumbing)
  - Electrical (BrightSpark Electric)
  - Pest Control (SafeShield Pest Control)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class IndustryKit:
    business_name: str
    industry: str
    hours: str
    services: List[str]
    pricing: Dict[str, str]
    never_do: List[str]
    emergency_policy: str


HVAC_KIT = IndustryKit(
    business_name="CoolAir Services",
    industry="hvac",
    hours="8:00 AM - 8:00 PM, Monday through Saturday",
    services=[
        "AC Repair",
        "AC Servicing & Deep Cleaning",
        "AC Installation",
        "Gas Refilling & Leak Detection",
        "Thermostat Installation",
        "Annual Maintenance Contract (AMC)"
    ],
    pricing={
        "AC Repair": "Starting at ₹500 diagnostic visit",
        "AC Servicing": "₹1,200 standard, ₹2,500 deep foam clean",
        "Gas Refilling": "₹1,500 to ₹3,500 based on refrigerant type",
        "AC Installation": "₹1,500 split unit indoor/outdoor",
    },
    never_do=[
        "Never schedule appointments outside operating hours without operator approval",
        "Never quote fixed repair prices without diagnostic inspection",
        "Never guarantee parts warranty on customer-provided spare parts",
        "Never invent services not listed in the official catalog"
    ],
    emergency_policy="For gas leaks, electrical burning smells, or water flooding, advise immediate power cutoff and dispatch emergency line."
)

PLUMBING_KIT = IndustryKit(
    business_name="QuickFix Plumbing",
    industry="plumbing",
    hours="7:00 AM - 9:00 PM, Monday through Sunday",
    services=[
        "Pipe Leak Repair",
        "Drain Unclogging & Cleaning",
        "Water Heater Repair & Replacement",
        "Tap & Faucet Replacement",
        "Toilet & Flush Repair",
        "Full Bathroom Plumbing"
    ],
    pricing={
        "Pipe Leak Repair": "₹300 to ₹1,500 depending on pipe access",
        "Drain Cleaning": "₹500 to ₹2,000",
        "Water Heater Service": "₹800 to ₹3,000",
        "Tap Replacement": "₹250 plus parts",
    },
    never_do=[
        "Never advise DIY pipe cutting or soldering over the phone",
        "Never book slots outside 7 AM - 9 PM",
        "Never quote subterranean sewer excavations without onsite survey"
    ],
    emergency_policy="Advise caller to shut off the main water valve immediately."
)

ELECTRICIAN_KIT = IndustryKit(
    business_name="BrightSpark Electrical",
    industry="electrician",
    hours="8:00 AM - 7:00 PM, Monday through Saturday",
    services=[
        "Short Circuit & Tripping Breaker Repair",
        "Wiring & Rewiring",
        "Ceiling Fan & Light Fixture Installation",
        "Switchboard Repair & Upgrade",
        "MCB & Distribution Box Replacement"
    ],
    pricing={
        "Tripping Breaker Diagnosis": "Starting at ₹400",
        "Fan/Light Installation": "₹200 to ₹500 per fixture",
        "Switchboard Replacement": "₹350 plus switchboard cost",
    },
    never_do=[
        "Never instruct customer to touch an active electrical panel or breaker box",
        "Never book outside operating hours"
    ],
    emergency_policy="Advise caller to keep hands dry, avoid touching sparking wires, and turn off main MCB if accessible."
)

PEST_CONTROL_KIT = IndustryKit(
    business_name="SafeShield Pest Control",
    industry="pest_control",
    hours="9:00 AM - 6:00 PM, Monday through Saturday",
    services=[
        "Cockroach & Ant Gel Treatment",
        "Bed Bug Eradication (2-treatment cycle)",
        "Termite Protection & Piping Injection",
        "Rodent Baiting & Trapping",
        "General Pest Management (Annual Contract)"
    ],
    pricing={
        "Cockroach Gel Treatment (2BHK)": "₹1,200",
        "Bed Bug Treatment": "₹2,500 (includes 15-day follow-up)",
        "Termite Treatment": "₹4,500 to ₹15,000 based on area",
    },
    never_do=[
        "Never promise 100% single-day eradication for bed bugs without follow-up cycle",
        "Never recommend chemical application in baby or pet areas without pre-treatment clearing"
    ],
    emergency_policy="For severe wasp nests or snake sightings, route directly to local municipal wildlife rescue."
)

KITS_BY_INDUSTRY: Dict[str, IndustryKit] = {
    "hvac": HVAC_KIT,
    "plumbing": PLUMBING_KIT,
    "electrician": ELECTRICIAN_KIT,
    "pest_control": PEST_CONTROL_KIT,
}


def get_industry_kit(industry: str) -> IndustryKit:
    """Retrieve industry kit, defaulting to HVAC if unspecified."""
    return KITS_BY_INDUSTRY.get(industry.lower().strip(), HVAC_KIT)
