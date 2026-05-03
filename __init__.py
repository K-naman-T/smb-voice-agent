"""
Industry Kits — Business-specific context for the voice agent.
Each kit provides: services, pricing, hours, greeting, intent handlers.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IndustryKit(ABC):
    """Base class for all industry kits."""

    business_name: str = "Local Service Business"
    industry: str = "general"
    services: list[str] = []
    pricing: dict[str, str] = {}
    hours: str = "9 AM to 6 PM, Monday to Saturday"
    emergency_hours: str = "24/7 for emergencies"

    def list_services(self) -> str:
        if not self.services:
            return "We offer a variety of services. Can you tell me what you need?"
        service_list = ", ".join(self.services)
        return f"Our services include: {service_list}. Which one did you need help with?"

    @abstractmethod
    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        """Classify the caller's intent from transcript."""
        pass


# ─────────────────────────────────────────────────────────────────────────────
# HVAC — Heating, Ventilation, Air Conditioning
# ─────────────────────────────────────────────────────────────────────────────

class HVACKit(IndustryKit):
    business_name = "CoolAir Services"
    industry = "hvac"

    services = [
        "AC Repair",
        "AC Installation",
        "AC Servicing",
        "AC Gas Refilling",
        "Duct Cleaning",
        "Inverter AC Repair",
        "Central AC Maintenance",
        "Thermostat Installation",
        "Annual Maintenance Contract",
        "Emergency AC Service",
    ]

    pricing = {
        "AC Repair": "starting at ₹500",
        "AC Servicing": "₹1,200 for standard, ₹2,500 for deep clean",
        "AC Gas Refilling": "₹1,500 to ₹3,500 depending on gas type",
        "Inverter AC Repair": "₹800 to ₹3,000",
        "Installation": "₹1,500 per indoor unit, ₹2,500 per outdoor unit",
        "Annual Maintenance Contract": "₹4,999 to ₹12,000 per year",
    }

    hours = "8 AM to 8 PM, Monday to Sunday"
    emergency_hours = "24/7 emergency service available"

    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        t = transcript.lower()

        if any(w in t for w in ["not cooling", "not working", "ac broken", "ac stopped",
                                  "stopped working", "not turning on", "no power", "ac is dead"]):
            return "service_request", {"issue": "ac_not_working", "urgency": "high"}
        elif any(w in t for w in ["noise", "sounds", "vibrating", "leaking", "water dripping",
                                   "strange sound", "making noise"]):
            return "service_request", {"issue": "ac_noise_or_leak", "urgency": "medium"}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate",
                                   "quotation", "quote", "charges"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available", "when",
                                   "slot", "time"]):
            return "booking_request", {}
        elif any(w in t for w in ["emergency", "urgent", "asap", "right now", "immediately",
                                   "it's not working", "very hot"]):
            return "emergency", {"urgency": "high"}
        elif any(w in t for w in ["service", "maintenance", "clean", "repair", "fix",
                                   "annual", "amc"]):
            return "service_request", {"issue": "general_service"}
        elif any(w in t for w in ["complaint", "not happy", "worst", "terrible", "didn't fix"]):
            return "complaint", {}
        else:
            return "general_inquiry", {}


# ─────────────────────────────────────────────────────────────────────────────
# PLUMBING
# ─────────────────────────────────────────────────────────────────────────────

class PlumberKit(IndustryKit):
    business_name = "QuickFix Plumbing"
    industry = "plumbing"

    services = [
        "Leak Repair",
        "Pipe Unclogging",
        "Water Heater Repair",
        "Tap Replacement",
        "Toilet Repair",
        "Bathroom Installation",
        "Kitchen Sink Installation",
        "Drain Cleaning",
        "Sewer Line Service",
        "Emergency Plumbing",
    ]

    pricing = {
        "Leak Repair": "₹300 to ₹1,500",
        "Pipe Unclogging": "₹500 to ₹2,000",
        "Water Heater Repair": "₹800 to ₹3,000",
        "Tap Replacement": "₹200 to ₹800 plus parts",
        "Toilet Repair": "₹400 to ₹1,500",
        "Drain Cleaning": "₹600 to ₹1,500",
        "Emergency Callout": "₹500 extra",
    }

    hours = "7 AM to 9 PM, Monday to Saturday"
    emergency_hours = "24/7 emergency service"

    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        t = transcript.lower()

        if any(w in t for w in ["leak", "dripping", "water coming", "pipe burst",
                                   "flood", "overflowing", "water everywhere"]):
            return "emergency", {"issue": "leak_or_flood", "urgency": "high"}
        elif any(w in t for w in ["clog", "blocked", "not draining", "slow drain",
                                   "choked", "clogged", "backup"]):
            return "service_request", {"issue": "clogged_drain", "urgency": "medium"}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate", "charges"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available", "when", "slot"]):
            return "booking_request", {}
        elif any(w in t for w in ["not working", "broken", "repair", "fix", "installation"]):
            return "service_request", {"issue": "general_repair"}
        else:
            return "general_inquiry", {}


# ─────────────────────────────────────────────────────────────────────────────
# ELECTRICAL
# ─────────────────────────────────────────────────────────────────────────────

class ElectricianKit(IndustryKit):
    business_name = "PowerPro Electricians"
    industry = "electrical"

    services = [
        "Wiring Repair",
        "Switchboard Installation",
        "Fan Installation",
        "Light Fitting",
        "MCB/Fuse Replacement",
        "Power Socket Repair",
        "Full House Rewiring",
        "Electric Panel Upgrade",
        "Solar Panel Installation",
        "Emergency Electrician",
    ]

    pricing = {
        "Wiring Repair": "₹400 to ₹2,000",
        "Switchboard Installation": "₹200 to ₹600 per point",
        "Fan Installation": "₹250 to ₹500",
        "Light Fitting": "₹100 to ₹400 per light",
        "MCB Replacement": "₹200 to ₹800",
        "Power Socket Repair": "₹150 to ₹500",
        "Full House Rewiring": "₹15,000 to ₹80,000 depending on size",
        "Emergency Callout": "₹500 to ₹1,000 extra",
    }

    hours = "8 AM to 8 PM, Monday to Sunday"
    emergency_hours = "24/7 emergency electrician available"

    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        t = transcript.lower()

        if any(w in t for w in ["short circuit", "spark", "smoke", "burning smell",
                                   "electrical fire", "wire burning", "shock"]):
            return "emergency", {"issue": "electrical_hazard", "urgency": "critical"}
        elif any(w in t for w in ["power cut", "no electricity", "power failure",
                                   "fuse blown", "mcb trips", "breaker trips"]):
            return "service_request", {"issue": "power_outage", "urgency": "high"}
        elif any(w in t for w in ["light not working", "socket not working", "switch not working",
                                   "fan not working", "not working"]):
            return "service_request", {"issue": "point_not_working", "urgency": "medium"}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate", "charges",
                                   "quotation"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available", "when", "slot"]):
            return "booking_request", {}
        elif any(w in t for w in ["install", "new", "installation", "new construction"]):
            return "service_request", {"issue": "installation"}
        else:
            return "general_inquiry", {}


# ─────────────────────────────────────────────────────────────────────────────
# PEST CONTROL
# ─────────────────────────────────────────────────────────────────────────────

class PestControlKit(IndustryKit):
    business_name = "SafeGuard Pest Control"
    industry = "pest_control"

    services = [
        "Cockroach Treatment",
        "Ant Treatment",
        "Termite Control",
        "Rodent/Rat Control",
        "Bed Bug Treatment",
        "Mosquito Control",
        " lizard Control",
        "Full Home Fumigation",
        "Commercial Pest Management",
        "Annual Maintenance Contract",
    ]

    pricing = {
        "Cockroach Treatment": "₹800 to ₹1,500 per session",
        "Ant Treatment": "₹600 to ₹1,200 per session",
        "Termite Control": "₹3,000 to ₹15,000 (full treatment)",
        "Rodent Control": "₹1,500 to ₹4,000",
        "Bed Bug Treatment": "₹2,000 to ₹8,000 per room",
        "Mosquito Control": "₹500 to ₹1,200 per session",
        "Full Home Fumigation": "₹5,000 to ₹20,000",
        "Annual Maintenance Contract": "₹8,000 to ₹25,000 per year",
    }

    hours = "8 AM to 7 PM, Monday to Saturday"
    emergency_hours = "Same-day service available"

    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        t = transcript.lower()

        if any(w in t for w in ["cockroach", "cockroaches", "roaches", "ants", "ant", "bed bug",
                                   "bed bugs", "termite", "termites", "rat", "rats", "rodent",
                                   "rodents", "mice", "lizard", "lizards", "pest", "pests"]):
            # Identify the pest type
            if any(p in t for p in ["cockroach", "roach", "ant"]):
                pest = "general_insect"
            elif "termite" in t:
                pest = "termite"
            elif any(p in t for p in ["bed bug", "bedbug"]):
                pest = "bed_bug"
            elif any(p in t for p in ["rat", "rodent", "mice"]):
                pest = "rodent"
            else:
                pest = "general_pest"
            return "service_request", {"issue": pest, "pest_type": pest}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate", "charges"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available", "when", "slot",
                                   "treatment"]):
            return "booking_request", {}
        elif any(w in t for w in ["annual", "amc", "yearly", "maintenance", "contract"]):
            return "service_request", {"issue": "amc_inquiry"}
        else:
            return "general_inquiry", {}


# ─────────────────────────────────────────────────────────────────────────────
# FACTORY
# ─────────────────────────────────────────────────────────────────────────────

_kits = {
    "hvac": HVACKit,
    "plumbing": PlumberKit,
    "electrician": ElectricianKit,
    "pest_control": PestControlKit,
}


def get_kit(industry: str) -> IndustryKit:
    """Get the industry kit for a given industry name."""
    kit_class = _kits.get(industry.lower(), HVACKit)
    return kit_class()


def list_industries() -> list[str]:
    """List all available industries."""
    return list(_kits.keys())
