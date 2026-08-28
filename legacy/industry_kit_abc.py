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
    response_greeting: str = "Thanks for calling {business_name}."
    
    def get_greeting(self) -> str:
        return f"Thanks for calling {self.business_name}. How can I help you today?"
    
    def get_emergency_routing(self) -> str:
        return ("For emergencies, please call our emergency line directly. "
                "Otherwise, can I help you with something else?")
    
    def format_service(self, service: str) -> str:
        if service in self.pricing:
            return f"{service} — {self.pricing[service]}"
        return service
    
    def list_services(self) -> str:
        if not self.services:
            return "We offer a variety of services. Can you tell me what you need?"
        service_list = ", ".join(self.services)
        return f"Our services include: {service_list}. Which one did you need help with?"
    
    @abstractmethod
    def classify_intent(self, transcript: str) -> tuple[str, Optional[dict]]:
        """Classify the caller's intent from transcript."""
        pass
    
    @abstractmethod
    def handle_service_request(self, transcript: str) -> str:
        """Generate response for a service request."""
        pass
    
    @abstractmethod
    def handle_pricing(self, service: Optional[str]) -> str:
        """Generate response for pricing inquiry."""
        pass


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
        
        if any(w in t for w in ["not cooling", "not working", "ac broken", "ac stopped", "stopped working", "not turning on", "no power"]):
            return "service_request", {"issue": "ac_not_working", "urgency": "high"}
        elif any(w in t for w in ["noise", "sounds", "vibrating", "leaking", "water dripping", "strange sound"]):
            return "service_request", {"issue": "ac_noise_or_leak", "urgency": "medium"}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate", "quotation", "quote"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available", "when"]):
            return "booking_request", {}
        elif any(w in t for w in ["emergency", "urgent", "asap", "right now", "immediately"]):
            return "emergency", {"urgency": "high"}
        elif any(w in t for w in ["service", "maintenance", "clean", "repair", "fix"]):
            return "service_request", {"issue": "general_service"}
        else:
            return "general_inquiry", {}
    
    def handle_service_request(self, transcript: str) -> str:
        intent, data = self.classify_intent(transcript)
        
        if intent == "emergency":
            return (f"I understand this is urgent. "
                    f"We offer 24/7 emergency AC service. "
                    f"I'll connect you with our emergency technician right away. "
                    f"Please stay on the line.")
        
        if data.get("issue") == "ac_not_working":
            return ("I'm sorry to hear your AC isn't working. "
                    "We offer same-day AC repair service. "
                    "Can I book a technician to take a look? "
                    "Our visit charge is ₹500 which is adjustable against repair costs.")
        
        if data.get("issue") == "ac_noise_or_leak":
            return ("That's concerning. Strange noises or leaks can indicate different issues. "
                    "I'd recommend having a technician take a look. "
                    "We can send someone within 2-4 hours. Shall I schedule a visit?")
        
        return ("I'd be happy to help with your AC needs. "
                "We offer repair, service, and installation. "
                "What specific issue are you experiencing?")
    
    def handle_pricing(self, service: Optional[str]) -> str:
        if service and service in self.pricing:
            return f"For {service}, the pricing is {self.pricing[service]}. Would you like to book a service?"
        return (f"Our main services are priced as follows: "
                f"AC Repair starting at ₹500, "
                f"AC Servicing from ₹1,200, "
                f"Inverter AC Repair from ₹800. "
                f"Would you like to book a service or need a specific quote?")


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
        
        if any(w in t for w in ["leak", "dripping", "water coming", "pipe burst", "flood"]):
            return "emergency", {"issue": "leak_or_flood", "urgency": "high"}
        elif any(w in t for w in ["clog", "blocked", "not draining", "slow drain", "choked"]):
            return "service_request", {"issue": "clogged_drain"}
        elif any(w in t for w in ["price", "cost", "charge", "how much", "rate"]):
            return "pricing_inquiry", {}
        elif any(w in t for w in ["book", "appointment", "schedule", "available"]):
            return "booking_request", {}
        elif any(w in t for w in ["not working", "broken", "repair", "fix"]):
            return "service_request", {"issue": "general_repair"}
        else:
            return "general_inquiry", {}
    
    def handle_service_request(self, transcript: str) -> str:
        intent, data = self.classify_intent(transcript)
        
        if intent == "emergency":
            return ("I understand this is urgent. Please turn off your main water supply if safe to do so. "
                    "We have emergency plumbers available 24/7. I'll connect you now. Stay on the line.")
        
        if data.get("issue") == "clogged_drain":
            return ("Blocked drains can escalate if not addressed. "
                    "We use professional equipment to clear clogs without damaging pipes. "
                    "Can I schedule a technician to take a look today?")
        
        return ("We handle all types of plumbing work. "
                "What specific problem are you facing? "
                "Leaks, clogs, installations, or something else?")
    
    def handle_pricing(self, service: Optional[str]) -> str:
        if service and service in self.pricing:
            return f"For {service}, typical costs are {self.pricing[service]}. Final price depends on parts needed."
        return (f"Our common services: "
                f"Leak Repair from ₹300, "
                f"Pipe Unclogging from ₹500, "
                f"Water Heater Repair from ₹800. "
                f"What do you need help with?")


# Factory
def get_kit(industry: str) -> IndustryKit:
    kits = {
        "hvac": HVACKit(),
        "plumbing": PlumberKit(),
    }
    return kits.get(industry, IndustryKit())
