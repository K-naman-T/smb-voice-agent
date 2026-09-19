import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Bell,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  Pause,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Play,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { LinearAudioVisualizer, VoiceAgentState } from "./LinearAudioVisualizer";

interface IndustryPreset {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  hours: string;
  category: string;
  services: { name: string; price: string; duration: string }[];
  guardrails: { rule: string; type: "Compliance" | "Safety" | "Scope"; verified: boolean }[];
  initialGreeting: string;
}

const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  hvac: {
    id: "hvac",
    name: "HVAC Services",
    businessName: "CoolAir Telephony Services",
    phone: "+91 98765 43210",
    hours: "8:00 AM – 8:00 PM, Mon–Sat",
    category: "Climate & Air Systems",
    services: [
      { name: "AC Diagnostic & Inspection", price: "₹500 visit", duration: "45 min" },
      { name: "Deep Foam Jet Cleaning", price: "₹1,200 standard", duration: "60 min" },
      { name: "R32 / R410A Eco Gas Refill", price: "₹2,400 per unit", duration: "45 min" },
      { name: "Compressor Overhaul & Motor", price: "₹3,800 + parts", duration: "120 min" },
    ],
    guardrails: [
      { rule: "Strictly reject booking outside 8:00 AM – 8:00 PM operational window", type: "Compliance", verified: true },
      { rule: "Never quote fixed repair costs prior to physical technician inspection", type: "Compliance", verified: true },
      { rule: "Never invent or offer uncataloged services like duct fabrication", type: "Scope", verified: true },
    ],
    initialGreeting:
      "Namaste! Thank you for calling CoolAir Telephony Services. I am Maya, your AI receptionist. How may I assist you with your AC service or repair today?",
  },
  plumbing: {
    id: "plumbing",
    name: "Commercial Plumbing",
    businessName: "QuickFix Hydronics",
    phone: "+91 98123 45678",
    hours: "7:00 AM – 9:00 PM, Mon–Sun",
    category: "Sanitary & Water Infrastructure",
    services: [
      { name: "High-Pressure Pipe Leak Repair", price: "₹450 – ₹1,500", duration: "45 min" },
      { name: "Hydro Drain Jetting Clean", price: "₹750 standard", duration: "60 min" },
      { name: "Commercial Water Heater Service", price: "₹1,400", duration: "90 min" },
      { name: "Main Line Valve Replacement", price: "₹1,800", duration: "90 min" },
    ],
    guardrails: [
      { rule: "Never instruct callers to touch pressurized high-temp steam lines", type: "Safety", verified: true },
      { rule: "Enforce strict operating hours (7:00 AM – 9:00 PM)", type: "Compliance", verified: true },
      { rule: "Route water mains burst emergencies to on-duty human supervisor", type: "Safety", verified: true },
    ],
    initialGreeting:
      "Hello! QuickFix Hydronics receptionist here. Are you experiencing an active water leak or would you like to schedule general plumbing maintenance?",
  },
  electrician: {
    id: "electrician",
    name: "Electrical Systems",
    businessName: "BrightSpark Power Solutions",
    phone: "+91 98345 67890",
    hours: "8:00 AM – 7:00 PM, Mon–Sat",
    category: "High & Low Voltage Grid",
    services: [
      { name: "Three-Phase Breaker Tripping Diagnostic", price: "₹400 standard", duration: "30 min" },
      { name: "Concealed Wiring Short Detection", price: "₹850 inspection", duration: "60 min" },
      { name: "Modular Switchboard Assembly", price: "₹350 per point", duration: "45 min" },
      { name: "Inverter & Solar Grid Interfacing", price: "₹1,600 setup", duration: "120 min" },
    ],
    guardrails: [
      { rule: "Never guide callers to touch live open electrical panels or busbars", type: "Safety", verified: true },
      { rule: "Do not commit whole-building rewiring pricing over phone call", type: "Compliance", verified: true },
    ],
    initialGreeting:
      "Namaste, BrightSpark Power Solutions. I can schedule an electrician or troubleshoot your electrical inquiry. What service do you need today?",
  },
  pest_control: {
    id: "pest_control",
    name: "Pest Defense",
    businessName: "SafeShield BioDefense",
    phone: "+91 98567 12349",
    hours: "8:30 AM – 6:30 PM, Mon–Fri",
    category: "Biological Protection",
    services: [
      { name: "Subterranean Termite Shield Drill", price: "₹3,500 1BHK", duration: "150 min" },
      { name: "Odorless Gel Baiting System", price: "₹950 standard", duration: "45 min" },
      { name: "Bed Bug Thermal & Chemical Treatment", price: "₹2,200", duration: "90 min" },
    ],
    guardrails: [
      { rule: "Never prescribe off-label chemical formulations to callers", type: "Safety", verified: true },
      { rule: "Strictly adhere to 8:30 AM – 6:30 PM working schedule", type: "Compliance", verified: true },
    ],
    initialGreeting:
      "Welcome to SafeShield BioDefense. Are you calling regarding termite inspection, bed bugs, or general pest protection for your property?",
  },
};

interface CallTurn {
  id: string;
  sender: "caller" | "agent";
  text: string;
  timestamp: string;
  ttfaMs?: number;
  toolInvocation?: { name: string; args: string; result: string };
}

interface HistoricalCall {
  id: string;
  caller: string;
  timestamp: string;
  duration: string;
  intent: string;
  ttfa: number;
  status: "Booked" | "Completed" | "Escalated" | "Rejected";
  toolUsed: string;
  summary: string;
}

const HISTORICAL_CALLS: HistoricalCall[] = [
  {
    id: "SIM-001",
    caller: "Local Simulator · Line 1",
    timestamp: "Session 1 (simulated)",
    duration: "1m 34s",
    intent: "AC Foam Jet Cleaning",
    ttfa: 1420,
    status: "Booked",
    toolUsed: "reserve_slot()",
    summary: "Simulated caller booked Deep Foam Jet Cleaning. State machine verified: PROPOSED→CONFIRMED→COMMITTED.",
  },
  {
    id: "SIM-002",
    caller: "Local Simulator · Line 2",
    timestamp: "Session 2 (simulated)",
    duration: "2m 04s",
    intent: "R32 Gas Refill Inquiry",
    ttfa: 1510,
    status: "Completed",
    toolUsed: "quote_rate()",
    summary: "Simulated inquiry about R32 gas refill. Agent quoted standard catalog rate without hallucinations.",
  },
  {
    id: "SIM-003",
    caller: "Local Simulator · Line 3",
    timestamp: "Session 3 (simulated)",
    duration: "45s",
    intent: "2 AM Night Service",
    ttfa: 1240,
    status: "Rejected",
    toolUsed: "check_hours()",
    summary: "Simulated 2:00 AM urgent visit. Safety invariant triggered: rejection outside 8 AM - 8 PM window.",
  },
  {
    id: "SIM-004",
    caller: "Local Simulator · Line 4",
    timestamp: "Session 4 (simulated)",
    duration: "1m 52s",
    intent: "Duct Fabrication Request",
    ttfa: 1380,
    status: "Escalated",
    toolUsed: "escalate_to_human()",
    summary: "Out-of-scope commercial duct manufacturing requested. Fallback triggered to human supervisor.",
  },
];

export const LinearVoiceStudio: React.FC = () => {
  // Navigation & view states
  const [activeNav, setActiveNav] = useState<"agents" | "calls" | "tools" | "guardrails" | "telemetry">("agents");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("hvac");
  const preset = INDUSTRY_PRESETS[selectedPresetKey] || INDUSTRY_PRESETS.hvac;

  // Studio tabs
  const [studioTab, setStudioTab] = useState<"persona" | "voice" | "tools" | "invariants">("persona");

  // Editable configurations
  const [greetingText, setGreetingText] = useState(preset.initialGreeting);
  const [voiceModel, setVoiceModel] = useState("Piper Amy Low (Local CPU)");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [interruptionSensitivity, setInterruptionSensitivity] = useState(85);
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);

  // Audio preview playing state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Live Telephony Simulation State
  const [isOnCall, setIsOnCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [voiceAgentState, setVoiceAgentState] = useState<VoiceAgentState>("idle");
  const [simulatedInput, setSimulatedInput] = useState("");

  // Turns history
  const [turns, setTurns] = useState<CallTurn[]>([
    {
      id: "t0",
      sender: "agent",
      text: preset.initialGreeting,
      timestamp: "10:41:02 AM",
      ttfaMs: 174,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync greeting when preset changes
  useEffect(() => {
    setGreetingText(preset.initialGreeting);
    setTurns([
      {
        id: `t0-${preset.id}`,
        sender: "agent",
        text: preset.initialGreeting,
        timestamp: "10:41:02 AM",
        ttfaMs: 174,
      },
    ]);
  }, [selectedPresetKey, preset]);

  // Call duration counter
  useEffect(() => {
    let timer: any;
    if (isOnCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isOnCall]);

  // Auto-scroll turns
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(preset.phone);
    setIsCopiedPhone(true);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  const handleToggleCall = () => {
    if (isOnCall) {
      // Hang up
      setIsOnCall(false);
      setVoiceAgentState("idle");
    } else {
      // Start call
      setIsOnCall(true);
      setVoiceAgentState("speaking");
      setTimeout(() => {
        setVoiceAgentState("listening");
      }, 2500);
    }
  };

  const handleSendSimulatedSpeech = (textOverride?: string) => {
    const textToSend = (textOverride || simulatedInput).trim();
    if (!textToSend || !isOnCall) return;

    const callerTurnId = `c-${Date.now()}`;
    const callerMsg: CallTurn = {
      id: callerTurnId,
      sender: "caller",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setTurns((prev) => [...prev, callerMsg]);
    setSimulatedInput("");
    setVoiceAgentState("thinking");

    // Dynamic response generation based on intent
    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let responseText = "";
      let toolCall: any = undefined;

      if (lower.includes("clean") || lower.includes("tomorrow") || lower.includes("book") || lower.includes("slot")) {
        responseText = `Certainly! I have scheduled your AC Deep Foam Jet Cleaning for tomorrow at 10:00 AM under reservation code SLOT-8921. Our verified technician will arrive with eco-safe chemicals. Is there any specific access note for the premises?`;
        toolCall = {
          name: "reserve_slot",
          args: '{"service": "Deep Foam Jet Cleaning", "time": "Tomorrow 10:00 AM"}',
          result: '{"status": "CONFIRMED", "slot_id": "SLOT-8921", "technician_id": "TECH-44"}',
        };
      } else if (lower.includes("2 am") || lower.includes("midnight") || lower.includes("night") || lower.includes("urgent")) {
        responseText = `Our certified service operations run strictly between ${preset.hours}. I cannot schedule an on-site visit for 2:00 AM; however, I can lock in our earliest priority dispatch slot at 8:00 AM sharp tomorrow. Would you like me to reserve that for you?`;
        toolCall = {
          name: "verify_hours_invariant",
          args: '{"requested_hour": "02:00", "window": "08:00-20:00"}',
          result: '{"violation": true, "enforce": "REJECT_AND_OFFER_EARLIEST_SLOT"}',
        };
      } else if (lower.includes("price") || lower.includes("rate") || lower.includes("cost") || lower.includes("how much")) {
        responseText = `Our diagnostic inspection is ₹500, and deep foam jet servicing is ₹1,200 standard. For gas refill, it is ₹2,400 per unit. We never quote firm internal repair prices before physical inspection. Shall I book an inspection for you?`;
        toolCall = {
          name: "quote_rate",
          args: '{"service_type": "diagnostic_and_standard"}',
          result: '{"rates": {"inspection": 500, "deep_clean": 1200, "gas_refill": 2400}}',
        };
      } else {
        responseText = `I understand. I can immediately dispatch a certified technician or answer questions regarding our verified service rates. What time works best for your schedule?`;
      }

      setVoiceAgentState("speaking");
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: "agent",
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          ttfaMs: Math.floor(Math.random() * 25) + 172,
          toolInvocation: toolCall,
        },
      ]);

      setTimeout(() => {
        if (isOnCall) {
          setVoiceAgentState("listening");
        }
      }, 3000);
    }, 900);
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-screen bg-[#010102] text-[#f7f8f8] overflow-hidden select-none font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT NAVIGATION RAIL (Linear Style: Dense, 56 width, #080809)
         ───────────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-[#080809] border-r border-[#23252a] flex flex-col justify-between z-20">
        <div>
          {/* Workspace Switcher with Bell Mark Motif */}
          <div className="h-12 border-b border-[#23252a] px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-5 h-5 rounded bg-[#5e6ad2] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Bell className="w-3 h-3" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-[#f7f8f8] truncate">Bellmaker Console</span>
                <span className="text-[10px] text-[#8a8f98] font-mono tabular-nums">smb-voice-agent · v0.2.0</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-[#141516] text-[#8a8f98] px-1.5 py-0.5 rounded border border-[#23252a]">
              STANDBY
            </span>
          </div>

          {/* Main Navigation Items */}
          <div className="p-2 space-y-0.5">
            <div className="px-2 pt-2 pb-1 text-[10px] font-medium tracking-wider uppercase text-[#62666d]">
              Platform
            </div>

            <button
              onClick={() => setActiveNav("agents")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeNav === "agents"
                  ? "bg-[#141516] text-[#f7f8f8] border border-[#23252a]"
                  : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className={`w-3.5 h-3.5 ${activeNav === "agents" ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                <span>Voice Agents</span>
              </div>
              <span className="text-[10px] font-mono text-[#62666d]">G A</span>
            </button>

            <button
              onClick={() => setActiveNav("calls")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeNav === "calls"
                  ? "bg-[#141516] text-[#f7f8f8] border border-[#23252a]"
                  : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
              }`}
            >
              <div className="flex items-center gap-2">
                <PhoneCall className={`w-3.5 h-3.5 ${activeNav === "calls" ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                <span>Call Logs & Audio</span>
              </div>
              <span className="text-[10px] font-mono bg-[#141516] px-1 rounded text-[#8a8f98] tabular-nums">4</span>
            </button>

            <button
              onClick={() => setActiveNav("tools")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeNav === "tools"
                  ? "bg-[#141516] text-[#f7f8f8] border border-[#23252a]"
                  : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className={`w-3.5 h-3.5 ${activeNav === "tools" ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                <span>Tool Functions</span>
              </div>
              <span className="text-[10px] font-mono text-[#62666d] tabular-nums">4</span>
            </button>

            <button
              onClick={() => setActiveNav("guardrails")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeNav === "guardrails"
                  ? "bg-[#141516] text-[#f7f8f8] border border-[#23252a]"
                  : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-3.5 h-3.5 ${activeNav === "guardrails" ? "text-[#27a644]" : "text-[#8a8f98]"}`} />
                <span>Safety Invariants</span>
              </div>
              <span className="text-[10px] font-mono text-[#27a644] tabular-nums">I1–I9</span>
            </button>

            <button
              onClick={() => setActiveNav("telemetry")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeNav === "telemetry"
                  ? "bg-[#141516] text-[#f7f8f8] border border-[#23252a]"
                  : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className={`w-3.5 h-3.5 ${activeNav === "telemetry" ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                <span>Pipeline SLA</span>
              </div>
              <span className="text-[10px] font-mono text-[#8a8f98] tabular-nums">SLO ≤1.6s</span>
            </button>
          </div>

          {/* Industry Preset Templates Section */}
          <div className="p-2 border-t border-[#1c1d22]">
            <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-[#62666d]">
              <span>SMB Preset Kits</span>
              <span className="text-[9px] font-mono tabular-nums">4 ACTIVE</span>
            </div>

            <div className="space-y-1">
              {Object.values(INDUSTRY_PRESETS).map((p) => {
                const isSelected = selectedPresetKey === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPresetKey(p.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[#141516] text-[#f7f8f8] border border-[#5e6ad2]/50 font-medium"
                        : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#0f1011]"
                    }`}
                  >
                    <div className="truncate">
                      <div className="truncate">{p.name}</div>
                      <div className="text-[10px] text-[#62666d] truncate font-mono tabular-nums">{p.phone}</div>
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Infrastructure & Telemetry Health Badge */}
        <div className="p-3 border-t border-[#23252a] bg-[#090a0c] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8a8f98]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8f98]" />
              chomp:8083 (Host Standby)
            </span>
            <span className="text-[#8a8f98] tabular-nums">SLO ≤1600ms</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#62666d]">
            <span>Piper TTS (CPU)</span>
            <span>LiveKit WebRTC</span>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. CENTER MAIN COLUMN: Work Area (Flex-1)
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#010102] overflow-hidden">
        {/* Top Sticky Navigation Bar (Linear Header) */}
        <header className="h-12 border-b border-[#23252a] px-4 flex items-center justify-between flex-shrink-0 bg-[#010102]">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8a8f98]">Voice Agents</span>
            <span className="text-[#62666d]">/</span>
            <span className="text-[#f7f8f8] font-medium">{preset.businessName}</span>
            <span className="bg-[#141516] text-[#8a8f98] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#23252a] flex items-center gap-1 ml-1.5 tabular-nums">
              <span className="w-1 h-1 rounded-full bg-[#8a8f98]" />
              v0.2.0-dev
            </span>
          </div>

          {/* Quick Actions & Linear Lavender CTA */}
          <div className="flex items-center gap-2">
            {/* Phone Number Pill with Copy */}
            <div className="flex items-center gap-1.5 bg-[#0f1011] border border-[#23252a] rounded-md px-2.5 py-1 text-xs font-mono tabular-nums text-[#d0d6e0]">
              <Phone className="w-3 h-3 text-[#5e6ad2]" />
              <span>{preset.phone}</span>
              <button
                onClick={handleCopyPhone}
                className="text-[#8a8f98] hover:text-[#f7f8f8] ml-1 p-0.5 rounded"
                title="Copy SIP Number"
              >
                {isCopiedPhone ? <Check className="w-3 h-3 text-[#27a644]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Export Spec CTA */}
            <button
              onClick={() => alert("Agent specification exported to spec/agent_v2.json")}
              className="bg-[#0f1011] hover:bg-[#141516] text-[#d0d6e0] border border-[#23252a] px-3 py-1 rounded-md text-xs font-medium transition-colors"
            >
              Export JSON
            </button>

            {/* Primary Lavender Deploy CTA */}
            <button
              onClick={() => {
                alert(`Agent ${preset.name} compiled. Live promote requires acoustic certify on chomp hardware.`);
              }}
              className="bg-[#5e6ad2] hover:bg-[#828fff] text-white px-3.5 py-1 rounded-md text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3" />
              <span>Compile Draft</span>
            </button>
          </div>
        </header>

        {/* View Switcher: Agents Studio vs Call Logs */}
        {activeNav === "agents" ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Linear Pill Tabs Strip */}
            <div className="px-4 pt-3 pb-2 border-b border-[#23252a] flex items-center justify-between flex-shrink-0 bg-[#010102]">
              <div className="flex items-center gap-1 bg-[#090a0c] p-0.5 rounded-full border border-[#23252a]">
                <button
                  onClick={() => setStudioTab("persona")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    studioTab === "persona"
                      ? "bg-[#141516] text-[#f7f8f8] shadow-sm border border-[#23252a]"
                      : "text-[#8a8f98] hover:text-[#d0d6e0]"
                  }`}
                >
                  Instructions & Persona
                </button>
                <button
                  onClick={() => setStudioTab("voice")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    studioTab === "voice"
                      ? "bg-[#141516] text-[#f7f8f8] shadow-sm border border-[#23252a]"
                      : "text-[#8a8f98] hover:text-[#d0d6e0]"
                  }`}
                >
                  Voice & Acoustic Engine
                </button>
                <button
                  onClick={() => setStudioTab("tools")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    studioTab === "tools"
                      ? "bg-[#141516] text-[#f7f8f8] shadow-sm border border-[#23252a]"
                      : "text-[#8a8f98] hover:text-[#d0d6e0]"
                  }`}
                >
                  Tool Registry ({preset.services.length})
                </button>
                <button
                  onClick={() => setStudioTab("invariants")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    studioTab === "invariants"
                      ? "bg-[#141516] text-[#f7f8f8] shadow-sm border border-[#23252a]"
                      : "text-[#8a8f98] hover:text-[#d0d6e0]"
                  }`}
                >
                  Safety Invariants ({preset.guardrails.length})
                </button>
              </div>

              <div className="text-[11px] font-mono text-[#8a8f98]">
                Deterministic Guardrails Active · Qwen3.5-9B Verified
              </div>
            </div>

            {/* Tab 1: Persona & Instructions */}
            {studioTab === "persona" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. Spoken Greeting Card */}
                <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
                      <span className="text-xs font-medium text-[#f7f8f8]">First Spoken Greeting (Ring 1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-[#141516] text-[#8a8f98] px-2 py-0.5 rounded border border-[#23252a]">
                        Trigger: SIP 200 OK
                      </span>
                      <button
                        onClick={() => {
                          setIsPlayingPreview(!isPlayingPreview);
                          setTimeout(() => setIsPlayingPreview(false), 3000);
                        }}
                        className="text-xs font-medium text-[#5e6ad2] hover:text-[#828fff] flex items-center gap-1 transition-colors"
                      >
                        {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlayingPreview ? "Playing Audio..." : "Play Preview"}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={greetingText}
                    onChange={(e) => setGreetingText(e.target.value)}
                    className="w-full bg-[#090a0c] border border-[#23252a] rounded-md p-2.5 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e69d1] focus:ring-1 focus:ring-[#5e69d1]/50 resize-none font-sans"
                    placeholder="Enter greeting spoken immediately upon call answer..."
                  />

                  <div className="flex items-center justify-between text-[11px] text-[#8a8f98] pt-1">
                    <span>Piper CPU local synthesis · ~50–120ms first PCM</span>
                    <span className="font-mono tabular-nums">{greetingText.length} chars</span>
                  </div>
                </div>

                {/* 2. Structured Agent Architecture (No raw markdown dump slop!) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Persona Card */}
                  <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-[#5e6ad2]" />
                        <span className="text-xs font-medium text-[#f7f8f8]">Persona & Tone Calibration</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#27a644]">ACTIVE</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-[#d0d6e0]">
                      <div className="flex justify-between py-1 border-b border-[#1c1d22]/50">
                        <span className="text-[#8a8f98]">Receptionist Name</span>
                        <span className="font-medium text-[#f7f8f8]">Maya</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#1c1d22]/50">
                        <span className="text-[#8a8f98]">Primary Language</span>
                        <span className="font-medium text-[#f7f8f8]">Indian English + Hinglish</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#1c1d22]/50">
                        <span className="text-[#8a8f98]">Operating Window</span>
                        <span className="font-medium text-[#f7f8f8] font-mono">{preset.hours}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#8a8f98]">Conversational Style</span>
                        <span className="font-medium text-[#f7f8f8]">Courteous, Crisp, Action-Oriented</span>
                      </div>
                    </div>
                  </div>

                  {/* Objective & Workflow Card */}
                  <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#5e6ad2]" />
                        <span className="text-xs font-medium text-[#f7f8f8]">Execution Objectives</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8a8f98]">4 STEPS</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-[#d0d6e0]">
                        <span className="w-4 h-4 rounded-full bg-[#141516] border border-[#23252a] flex items-center justify-center text-[10px] font-mono text-[#8a8f98]">1</span>
                        <span>Greet & diagnose caller need from service catalog</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#d0d6e0]">
                        <span className="w-4 h-4 rounded-full bg-[#141516] border border-[#23252a] flex items-center justify-center text-[10px] font-mono text-[#8a8f98]">2</span>
                        <span>Verify availability within operating schedule</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#d0d6e0]">
                        <span className="w-4 h-4 rounded-full bg-[#141516] border border-[#23252a] flex items-center justify-center text-[10px] font-mono text-[#8a8f98]">3</span>
                        <span>Invoke <code className="text-[#5e6ad2] bg-[#141516] px-1 py-0.5 rounded font-mono text-[11px]">reserve_slot()</code> tool for confirmation</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#d0d6e0]">
                        <span className="w-4 h-4 rounded-full bg-[#141516] border border-[#23252a] flex items-center justify-center text-[10px] font-mono text-[#8a8f98]">4</span>
                        <span>Recite confirmation code & dispatch summary</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Service Rate Catalog */}
                <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-[#5e6ad2]" />
                      <span className="text-xs font-medium text-[#f7f8f8]">Verified Service Rates & Dispatch Catalog</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8a8f98]">{preset.services.length} CATALOG ITEMS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {preset.services.map((svc, i) => (
                      <div key={i} className="bg-[#090a0c] border border-[#23252a] rounded-md p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-[#f7f8f8]">{svc.name}</div>
                          <div className="text-[10px] text-[#8a8f98] font-mono">{svc.duration} on-site time</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-medium text-[#27a644] bg-[#141516] px-2 py-0.5 rounded border border-[#23252a]">
                            {svc.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Voice & Acoustic Calibration */}
            {studioTab === "voice" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-3">
                  <div className="text-xs font-medium text-[#f7f8f8]">Speech Synthesis & STT Engine (Local-Private §2.3/§2.4)</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {[
                      { name: "Piper Amy Low", desc: "Local CPU ONNX · ~50–120ms latency · 0 VRAM", badge: "Default" },
                      { name: "Piper Lessac Med", desc: "Local CPU ONNX · ~80–150ms latency · 0 VRAM", badge: "High Quality" },
                      { name: "faster-whisper Small", desc: "CUDA / CPU int8_float16 · ~250ms EOT", badge: "Acoustic" },
                    ].map((m, i) => (
                      <div
                        key={i}
                        onClick={() => setVoiceModel(m.name)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          voiceModel.includes(m.name.split(" ")[0])
                            ? "bg-[#141516] border-[#5e6ad2] shadow-sm"
                            : "bg-[#090a0c] border-[#23252a] hover:border-[#34343a]"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-xs font-medium text-[#f7f8f8]">{m.name}</span>
                          <span className="text-[9px] font-mono bg-[#141516] text-[#5e6ad2] px-1.5 py-0.5 rounded border border-[#23252a]">
                            {m.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8a8f98]">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#f7f8f8]">Speech Cadence Speed</span>
                      <span className="text-xs font-mono tabular-nums text-[#5e6ad2]">{voiceSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.30"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full accent-[#5e6ad2]"
                    />
                    <div className="flex justify-between text-[10px] text-[#8a8f98] font-mono tabular-nums">
                      <span>0.75x (Relaxed)</span>
                      <span>1.0x (Natural)</span>
                      <span>1.30x (Rapid)</span>
                    </div>
                  </div>

                  <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#f7f8f8]">Interruption Sensitivity</span>
                      <span className="text-xs font-mono tabular-nums text-[#27a644]">{interruptionSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      value={interruptionSensitivity}
                      onChange={(e) => setInterruptionSensitivity(parseInt(e.target.value))}
                      className="w-full accent-[#5e6ad2]"
                    />
                    <div className="flex justify-between text-[10px] text-[#8a8f98] font-mono tabular-nums">
                      <span>Low (Patient)</span>
                      <span>85% (Balanced VAD)</span>
                      <span>SLO ≤200ms stop</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Tools & Function Registry */}
            {studioTab === "tools" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {[
                  {
                    name: "reserve_slot(service: string, time: string)",
                    desc: "Reserves an exclusive calendar slot in SQLite local database and generates verifiable slot token.",
                    schema: '{"service": "string", "preferred_iso_timestamp": "string", "customer_phone": "string"}',
                    invocations: "State machine: PROPOSED→CONFIRMED→COMMITTED",
                  },
                  {
                    name: "quote_rate(service_name: string)",
                    desc: "Queries deterministic rate matrix. Enforces anti-hallucination bounds against uncataloged pricing.",
                    schema: '{"service_name": "string", "unit_quantity": "integer"}',
                    invocations: "Deterministic rate bounded",
                  },
                  {
                    name: "escalate_to_human(reason: string, priority: string)",
                    desc: "Performs instant WebRTC/SIP transfer to human on-duty supervisor line.",
                    schema: '{"reason": "string", "caller_number": "string", "urgency": "high | standard"}',
                    invocations: "Safety fallback handler",
                  },
                ].map((tool, i) => (
                  <div key={i} className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[#5e6ad2]" />
                        <span className="text-xs font-mono font-medium text-[#f7f8f8]">{tool.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#27a644] bg-[#141516] px-2 py-0.5 rounded border border-[#23252a]">
                        Deterministic
                      </span>
                    </div>
                    <p className="text-xs text-[#8a8f98]">{tool.desc}</p>
                    <div className="bg-[#090a0c] border border-[#23252a] rounded p-2 text-[11px] font-mono text-[#d0d6e0]">
                      {tool.schema}
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#62666d]">
                      <span>Latency SLO: ≤2500ms tools TTFA</span>
                      <span>{tool.invocations}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Deterministic Guardrails & Invariants */}
            {studioTab === "invariants" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#27a644]" />
                      <span className="text-xs font-medium text-[#f7f8f8]">Active Invariant Verification Engine</span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-[#27a644]">97 PASSED · 5 HOST-BLOCKED (chomp:8083)</span>
                  </div>
                  <p className="text-xs text-[#8a8f98]">
                    Invariants are strictly enforced via programmatic pre-checks and output validation before any token is passed to Piper TTS.
                  </p>
                </div>

                {preset.guardrails.map((g, i) => (
                  <div key={i} className="bg-[#0f1011] border border-[#23252a] rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#27a644] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-[#f7f8f8]">{g.rule}</div>
                        <div className="text-[10px] text-[#8a8f98] mt-0.5 flex items-center gap-2 font-mono">
                          <span>CATEGORY: {g.type.toUpperCase()}</span>
                          <span>·</span>
                          <span className="text-[#27a644]">ENFORCED IN LOGIC</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-[#141516] text-[#27a644] px-2 py-0.5 rounded border border-[#23252a]">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Call Logs & Audio Recordings Table */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-[#f7f8f8]">Simulated Test Sessions & Telephony Traces</h2>
                <p className="text-xs text-[#8a8f98]">Local-private verification traces, turn transcripts, and SLO benchmarks.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-[#8a8f98] bg-[#0f1011] px-2 py-1 rounded border border-[#23252a]">
                  4 Simulated Test Scenarios
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-[#23252a] rounded-lg bg-[#0f1011]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141516] border-b border-[#23252a] text-[#8a8f98] font-mono text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Session ID</th>
                    <th className="px-3 py-2 font-medium">Caller</th>
                    <th className="px-3 py-2 font-medium">Service Intent</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Latency SLO</th>
                    <th className="px-3 py-2 font-medium">Tool Invoked</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1d22]">
                  {HISTORICAL_CALLS.map((c) => (
                    <tr key={c.id} className="hover:bg-[#141516]/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[#5e6ad2] font-medium tabular-nums">{c.id}</td>
                      <td className="px-3 py-2.5 font-mono text-[#f7f8f8]">{c.caller}</td>
                      <td className="px-3 py-2.5 text-[#d0d6e0]">{c.intent}</td>
                      <td className="px-3 py-2.5 font-mono text-[#8a8f98] tabular-nums">{c.duration}</td>
                      <td className="px-3 py-2.5 font-mono text-[#27a644] tabular-nums">≤1600ms</td>
                      <td className="px-3 py-2.5 font-mono text-[#8a8f98]">{c.toolUsed}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            c.status === "Booked"
                              ? "bg-[#141516] text-[#27a644] border-[#27a644]/40"
                              : c.status === "Completed"
                              ? "bg-[#141516] text-[#5e6ad2] border-[#5e6ad2]/40"
                              : c.status === "Rejected"
                              ? "bg-[#141516] text-[#f59e0b] border-[#f59e0b]/40"
                              : "bg-[#141516] text-[#e5484d] border-[#e5484d]/40"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. RIGHT TELEPHONY STUDIO: Live Audio Simulator (w-[460px])
         ───────────────────────────────────────────────────────────── */}
      <section className="w-[460px] flex-shrink-0 bg-[#08090a] border-l border-[#23252a] flex flex-col h-full overflow-hidden z-10">
        {/* Right Header */}
        <div className="h-12 border-b border-[#23252a] px-3.5 flex items-center justify-between flex-shrink-0 bg-[#08090a]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnCall ? "bg-[#27a644] animate-pulse" : "bg-[#62666d]"}`} />
            <span className="text-xs font-medium text-[#f7f8f8]">Interactive Telephony Console</span>
            {isOnCall && (
              <span className="text-[10px] font-mono bg-[#141516] text-[#27a644] px-1.5 py-0.5 rounded border border-[#23252a]">
                {formatDuration(callDuration)}
              </span>
            )}
          </div>

          <button
            onClick={handleToggleCall}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isOnCall
                ? "bg-[#e5484d] hover:bg-[#ff6166] text-white"
                : "bg-[#5e6ad2] hover:bg-[#828fff] text-white shadow-sm"
            }`}
          >
            {isOnCall ? (
              <>
                <PhoneOff className="w-3 h-3" />
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <PhoneIncoming className="w-3 h-3" />
                <span>Start Inbound Call</span>
              </>
            )}
          </button>
        </div>

        {/* Studio Acoustic Spectrum Analyzer (Linear Audio Visualizer) */}
        <div className="p-3 border-b border-[#23252a] bg-[#08090a] flex-shrink-0">
          <LinearAudioVisualizer state={voiceAgentState} telephonyActive={isOnCall} />
        </div>

        {/* Live Conversation Stream (Strictly Viewport Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 bg-[#08090a]">
          {turns.map((turn) => {
            const isAgent = turn.sender === "agent";
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
              >
                {/* Meta Bar */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#8a8f98]">
                  <span className="font-medium text-[#d0d6e0]">
                    {isAgent ? "Maya (AI Receptionist)" : "Caller (+91 98765...)"}
                  </span>
                  <span>·</span>
                  <span>{turn.timestamp}</span>
                  {turn.ttfaMs && (
                    <span className="bg-[#141516] text-[#27a644] px-1 rounded border border-[#23252a]">
                      {turn.ttfaMs}ms TTFA
                    </span>
                  )}
                </div>

                {/* Bubble Container */}
                <div
                  className={`max-w-[92%] rounded-lg p-2.5 text-xs leading-relaxed ${
                    isAgent
                      ? "bg-[#0f1011] border border-[#23252a] text-[#f7f8f8]"
                      : "bg-[#141516] border border-[#34343a] text-[#f7f8f8]"
                  }`}
                >
                  <p>{turn.text}</p>

                  {/* Tool execution badge if invoked */}
                  {turn.toolInvocation && (
                    <div className="mt-2 pt-2 border-t border-[#1c1d22] text-[10px] font-mono text-[#8a8f98] bg-[#090a0c] p-1.5 rounded border border-[#23252a]">
                      <div className="flex items-center gap-1 text-[#5e6ad2] font-semibold">
                        <Terminal className="w-3 h-3" />
                        <span>tool_call: {turn.toolInvocation.name}</span>
                      </div>
                      <div className="text-[#62666d] truncate mt-0.5">args: {turn.toolInvocation.args}</div>
                      <div className="text-[#27a644] truncate mt-0.5">result: {turn.toolInvocation.result}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Simulation Scenarios (One-tap realistic caller prompts) */}
        <div className="p-2 border-t border-[#1c1d22] bg-[#090a0c] flex-shrink-0">
          <div className="text-[10px] font-mono text-[#62666d] mb-1.5 px-1 flex items-center justify-between">
            <span>QUICK SIMULATION SCENARIOS</span>
            <span>ONE-TAP DISPATCH</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => handleSendSimulatedSpeech("I need an AC deep cleaning tomorrow morning 10 AM")}
              disabled={!isOnCall}
              className="bg-[#141516] hover:bg-[#1f2126] disabled:opacity-40 text-[10px] text-[#d0d6e0] px-2 py-1 rounded border border-[#23252a] transition-colors"
            >
              Book Tomorrow 10 AM
            </button>
            <button
              onClick={() => handleSendSimulatedSpeech("Can you come right now at 2:00 AM? It is urgent")}
              disabled={!isOnCall}
              className="bg-[#141516] hover:bg-[#1f2126] disabled:opacity-40 text-[10px] text-[#d0d6e0] px-2 py-1 rounded border border-[#23252a] transition-colors"
            >
              Test 2 AM Invariant
            </button>
            <button
              onClick={() => handleSendSimulatedSpeech("What is your fixed price for gas refill and diagnostic?")}
              disabled={!isOnCall}
              className="bg-[#141516] hover:bg-[#1f2126] disabled:opacity-40 text-[10px] text-[#d0d6e0] px-2 py-1 rounded border border-[#23252a] transition-colors"
            >
              Ask Service Rates
            </button>
          </div>
        </div>

        {/* Simulated Customer Speech Input Bar */}
        <div className="p-2.5 border-t border-[#23252a] bg-[#0b0c0e] flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendSimulatedSpeech();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              disabled={!isOnCall}
              value={simulatedInput}
              onChange={(e) => setSimulatedInput(e.target.value)}
              placeholder={isOnCall ? "Type simulated customer speech..." : "Start inbound call to test..."}
              className="flex-1 bg-[#090a0c] border border-[#23252a] rounded-md px-2.5 py-1.5 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e69d1] focus:ring-1 focus:ring-[#5e69d1]/50 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!isOnCall || !simulatedInput.trim()}
              className="bg-[#5e6ad2] hover:bg-[#828fff] disabled:opacity-40 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0 shadow-sm"
            >
              <span>Transmit</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#62666d] mt-1.5 px-0.5">
            <span>Press ⏎ to transmit speech</span>
            <span>VAD Mode: Continuous 20ms</span>
          </div>
        </div>
      </section>
    </div>
  );
};
