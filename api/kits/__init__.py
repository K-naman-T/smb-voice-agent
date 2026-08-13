"""
Industry Kits — Business-specific context for the voice agent.
Each kit provides: services, pricing, hours, greeting, intent handlers.
All 4 industries: HVAC, Plumbing, Electrical, Pest Control.
"""
from abc import ABC, abstractmethod
from typing import Optional
import re


class IndustryKit(ABC):
    """Base class for all industry kits."""
    business_name: str = "Local Service Business"
    industry: str = "general"
    services: list[str] = []
    pricing: dict[str, str] = {}
    hours: str = "9 AM to 6 PM, Monday to Saturday"
    emergency_hours: str = "24/7 for emergencies"
    keywords: dict[str, list[str]] = {}

    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        t = transcript.lower()
        if any(w in t for w in self.keywords.get("emergency", [])):
            return "emergency", {"urgency": "high"}
        if any(w in t for w in self.keywords.get("booking", [])):
            return "booking_request", {}
        if any(w in t for w in self.keywords.get("pricing", [])):
            return "pricing_inquiry", {}
        if any(w in t for w in self.keywords.get("service", [])):
            return "service_request", {}
        return "general_inquiry", {}

    def get_greeting(self) -> str:
        return f"Thanks for calling {self.business_name}. How can I help you today?"

    def format_service(self, service: str) -> str:
        if service in self.pricing:
            return f"{service} — {self.pricing[service]}"
        return service

    def list_services(self) -> str:
        if not self.services:
            return "We offer a variety of services. Can you tell me what you need?"
        service_list = ", ".join(self.services[:5])
        return f"Our services include: {service_list}. Which one did you need help with?"


class HVACKit(IndustryKit):
    business_name = "CoolAir Services"
    industry = "hvac"
    hours = "8 AM to 8 PM, Monday to Sunday"
    emergency_hours = "24/7 emergency AC service available"
    services = [
        "AC Repair", "AC Installation", "AC Servicing", "AC Gas Refilling",
        "Duct Cleaning", "Inverter AC Repair", "Central AC Maintenance",
        "Thermostat Installation", "Annual Maintenance Contract", "Emergency AC Service",
    ]
    pricing = {
        "AC Repair": "starting at ₹500",
        "AC Servicing": "₹1,200 standard, ₹2,500 deep clean",
        "AC Gas Refilling": "₹1,500 to ₹3,500",
        "Inverter AC Repair": "₹800 to ₹3,000",
        "AC Installation": "₹1,500 per indoor unit, ₹2,500 outdoor unit",
        "Annual Maintenance Contract": "₹4,999 to ₹12,000 per year",
    }
    keywords = {
        "emergency": ["emergency", "urgent", "asap", "right now", "immediately", "not cooling", "not working", "ac broken", "ac stopped", "no power", "fire"],
        "booking": ["book", "appointment", "schedule", "available", "when", "tomorrow", "today"],
        "pricing": ["price", "cost", "charge", "how much", "rate", "quotation", "quote", "fees"],
        "service": ["service", "maintenance", "clean", "repair", "fix", "leak", "noise", "vibrating", "dripping"],
    }


class PlumbingKit(IndustryKit):
    business_name = "QuickFix Plumbing"
    industry = "plumbing"
    hours = "7 AM to 9 PM, Monday to Saturday"
    emergency_hours = "24/7 emergency service"
    services = [
        "Leak Repair", "Pipe Unclogging", "Water Heater Repair", "Tap Replacement",
        "Toilet Repair", "Bathroom Installation", "Kitchen Sink Installation",
        "Drain Cleaning", "Sewer Line Service", "Emergency Plumbing",
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
    keywords = {
        "emergency": ["leak", "dripping", "flood", "pipe burst", "water coming", "overflow", "sewage"],
        "booking": ["book", "appointment", "schedule", "available", "when", "tomorrow", "today"],
        "pricing": ["price", "cost", "charge", "how much", "rate", "quotation"],
        "service": ["clog", "blocked", "not draining", "slow drain", "choked", "not working", "broken", "repair", "fix"],
    }


class ElectricianKit(IndustryKit):
    business_name = "PowerPro Electricians"
    industry = "electrical"
    hours = "7 AM to 9 PM, Monday to Sunday"
    emergency_hours = "24/7 for electrical emergencies"
    services = [
        "Wiring Installation", "Wiring Repair", "Switchboard Repair", "Fan Installation",
        "Fan Repair", "Light Fitting", "MCB/Fuse Replacement", "Power Socket Repair",
        "Earthing", "Voltage Stabilizer Installation", "Electrical Safety Inspection",
        "EV Charger Installation",
    ]
    pricing = {
        "Visit Charge": "₹200 to ₹500",
        "Wiring Repair": "₹300 to ₹1,500",
        "Switchboard Repair": "₹200 to ₹800",
        "Fan Installation": "₹300 to ₹500",
        "Fan Repair": "₹200 to ₹600",
        "MCB Replacement": "₹150 to ₹400",
        "Power Socket Repair": "₹150 to ₹500",
        "Full House Rewiring": "₹15,000 to ₹50,000",
    }
    keywords = {
        "emergency": ["short circuit", "spark", "fire", "burning smell", "electrical shock", "power cut", "fallen wire", "exposed wire", "urgent", "immediately"],
        "booking": ["book", "appointment", "schedule", "available", "when", "tomorrow", "today"],
        "pricing": ["price", "cost", "charge", "how much", "rate", "quotation"],
        "service": ["wiring", "switch", "socket", "fan", "light", "mcb", "fuse", "power", "not working", "repair", "fix", "installation", "install"],
    }


class PestControlKit(IndustryKit):
    business_name = "SafeGuard Pest Control"
    industry = "pest_control"
    hours = "8 AM to 7 PM, Monday to Sunday"
    emergency_hours = "Same-day service available"
    services = [
        "Cockroach Treatment", "Ant Treatment", "Bed Bug Treatment", "Termite Control",
        "Rodent Control", "Mosquito Treatment", "Lizard Control", "General Pest Spray",
        "Pre-construction Anti-termite", "Annual Pest Maintenance Contract",
    ]
    pricing = {
        "Cockroach Treatment": "₹999 to ₹2,500 per visit",
        "Bed Bug Treatment": "₹2,500 to ₹6,000",
        "Termite Control": "₹3,000 to ₹12,000",
        "Rodent Control": "₹1,500 to ₹4,000",
        "Mosquito Treatment": "₹999 to ₹2,000",
        "Full Home Treatment": "₹4,999 to ₹12,000",
        "Annual Contract": "₹9,999 to ₹24,999",
    }
    keywords = {
        "emergency": [" infestation", "many cockroaches", "bed bugs", "rats", "termites found", "urgent", "immediately"],
        "booking": ["book", "appointment", "schedule", "available", "when", "tomorrow", "today"],
        "pricing": ["price", "cost", "charge", "how much", "rate", "quotation"],
        "service": ["pest", "cockroach", "ant", "bed bug", "termite", "rat", "rodent", "mosquito", "lizard", "spray", "treatment", "control"],
    }


# Factory
def get_kit(industry: str) -> IndustryKit:
    kits = {
        "hvac": HVACKit(),
        "plumbing": PlumbingKit(),
        "electrical": ElectricianKit(),
        "pest_control": PestControlKit(),
    }
    return kits.get(industry.lower(), HVACKit())
