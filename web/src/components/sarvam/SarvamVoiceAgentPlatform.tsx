import React, { useState, useEffect } from "react";
import { 
  Bot, Phone, PhoneIncoming, PhoneOff, Volume2, 
  Play, CheckCircle2, ShieldCheck, 
  Database, Radio, Send, Copy, 
  Check, Sparkles, BarChart3, 
  BookOpen
} from "lucide-react";
import { SarvamVoiceOrb, SarvamVoiceState } from "./SarvamVoiceOrb";

interface IndustryKit {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  hours: string;
  services: string[];
  pricing: Record<string, string>;
  neverDo: { rule: string; category: string }[];
}

const KITS: Record<string, IndustryKit> = {
  hvac: {
    id: "hvac",
    name: "HVAC Services",
    businessName: "CoolAir Telephony Services",
    phone: "+91 98765 43210",
    hours: "8:00 AM - 8:00 PM, Mon-Sat",
    services: ["AC Diagnostic & Repair", "Deep Foam Cleaning", "R32 Gas Refill", "Compressor Overhaul"],
    pricing: { "AC Diagnostic": "₹500 visit", "AC Servicing": "₹1,200 standard", "Gas Refill": "₹2,400" },
    neverDo: [
      { rule: "Never schedule appointments outside operating hours (8 AM - 8 PM)", category: "Compliance" },
      { rule: "Never quote fixed repair costs prior to diagnostic physical inspection", category: "Compliance" },
      { rule: "Never invent uncataloged services such as duct fabrication", category: "Scope" }
    ]
  },
  plumbing: {
    id: "plumbing",
    name: "Plumbing",
    businessName: "QuickFix Hydronics",
    phone: "+91 98123 45678",
    hours: "7:00 AM - 9:00 PM, Mon-Sun",
    services: ["Pressurized Leak Repair", "Hydro Drain Jetting", "Water Heater Rebuild", "Main Pipe Line"],
    pricing: { "Leak Repair": "₹300 - ₹1,500", "Drain Jetting": "₹750" },
    neverDo: [
      { rule: "Never advise customer to touch open torch flame or DIY solder", category: "Safety" },
      { rule: "Never book appointments outside operating hours (7 AM - 9 PM)", category: "Compliance" }
    ]
  },
  electrician: {
    id: "electrician",
    name: "Electrical",
    businessName: "BrightSpark High-Voltage",
    phone: "+91 98345 67890",
    hours: "8:00 AM - 7:00 PM, Mon-Sat",
    services: ["Phase Breaker Tripping", "Concealed Wiring Repair", "Switchboard Assembly", "Inverter Setup"],
    pricing: { "Breaker Diagnostic": "₹400", "Switchboard Repair": "₹350" },
    neverDo: [
      { rule: "Never instruct caller to manipulate energized bare busbars", category: "Safety" },
      { rule: "Never commit firm pricing on complete building rewiring over phone", category: "Compliance" }
    ]
  },
  pest_control: {
    id: "pest_control",
    name: "Pest Control",
    businessName: "SafeShield Biological Defense",
    phone: "+91 98567 12349",
    hours: "8:30 AM - 6:30 PM, Mon-Fri",
    services: ["Termite Chemical Shield", "Gel Baiting System", "Bed Bug Eradication", "Rodent Bait Station"],
    pricing: { "Standard Inspection": "₹450", "Termite Shield": "₹3,500" },
    neverDo: [
      { rule: "Never disclose concentrated chemical storage without certs", category: "Compliance" },
      { rule: "Never book outside 8:30 AM - 6:30 PM operational window", category: "Compliance" }
    ]
  }
};

interface TurnMessage {
  id: string;
  sender: "caller" | "agent";
  text: string;
  time: string;
  ttfa?: number;
  toolCall?: string;
}

export const SarvamVoiceAgentPlatform: React.FC = () => {
  // Navigation Sidebar state
  const [sidebarTab, setSidebarTab] = useState<"agents" | "logs" | "numbers" | "knowledge" | "guardrails" | "analytics">("agents");

  // Selected preset kit
  const [selectedKitId, setSelectedKitId] = useState<string>("hvac");
  const kit = KITS[selectedKitId] || KITS.hvac;

  // Builder tab
  const [builderTab, setBuilderTab] = useState<"instructions" | "voice" | "tools" | "guardrails">("instructions");

  // Agent configuration states (Sarvam style)
  const [firstMessage, setFirstMessage] = useState(
    `Namaste! Thank you for calling ${kit.businessName}. I am Maya, your AI receptionist. How may I assist you with your service booking today?`
  );
  const [selectedLanguage, setSelectedLanguage] = useState("English (India) + Hinglish");
  const [selectedVoice, setSelectedVoice] = useState("Meera");
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Test Simulator states
  const [isOnCall, setIsOnCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [voiceState, setVoiceState] = useState<SarvamVoiceState>("idle");
  const [subtitle, setSubtitle] = useState("");
  const [customInput, setCustomInput] = useState("");

  const [turns, setTurns] = useState<TurnMessage[]>([
    {
      id: "t0",
      sender: "agent",
      text: `Namaste! Thank you for calling ${kit.businessName}. I am Maya, your AI receptionist. How may I assist you with your service booking today?`,
      time: "00:01",
      ttfa: 172
    }
  ]);

  // Sync greeting when kit changes
  useEffect(() => {
    setFirstMessage(
      `Namaste! Thank you for calling ${kit.businessName}. I am Maya, your AI receptionist. How may I assist you with your service booking today?`
    );
    setTurns([
      {
        id: "t0",
        sender: "agent",
        text: `Connected to ${kit.businessName} line. Telephony channel ready. How may I assist you with ${kit.services[0]} today?`,
        time: "00:01",
        ttfa: 168
      }
    ]);
    setVoiceState("idle");
    setSubtitle("");
  }, [selectedKitId]);

  // Call timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOnCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOnCall]);

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(kit.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleStartCall = () => {
    setIsOnCall(true);
    setCallDuration(0);
    setVoiceState("speaking");
    setSubtitle(firstMessage);
    setTimeout(() => {
      setVoiceState("idle");
      setSubtitle("");
    }, 2800);
  };

  const handleEndCall = () => {
    setIsOnCall(false);
    setVoiceState("idle");
    setSubtitle("");
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const handleSendUtterance = (text: string) => {
    if (!text.trim() || voiceState !== "idle") return;

    if (!isOnCall) {
      setIsOnCall(true);
    }

    const callerTurn: TurnMessage = {
      id: Math.random().toString(),
      sender: "caller",
      text,
      time: formatDuration(callDuration)
    };

    setTurns((prev) => [...prev, callerTurn]);
    setCustomInput("");
    setSubtitle(`Caller: "${text}"`);
    setVoiceState("listening");

    // Stage 1: Silero VAD -> Qwen3.5 LLM Thinking
    setTimeout(() => {
      setVoiceState("thinking");
      setSubtitle("Qwen3.5-9B (RTX 4060) analyzing utterance against invariant gates...");
    }, 350);

    // Stage 2: Bulbul v3 TTS Synthesis -> Speaking
    setTimeout(() => {
      let reply = "";
      let toolCall: string | undefined = undefined;
      const lower = text.toLowerCase();

      if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("charge")) {
        reply = `Our standard diagnostic visit charge is ₹500. Our technician conducts a physical inspection on-site before providing a transparent quote. Would you like to schedule an appointment?`;
      } else if (lower.includes("2 am") || lower.includes("3 am") || lower.includes("night") || lower.includes("midnight")) {
        reply = `Our operational hours are ${kit.hours}. To preserve safety invariants, we cannot dispatch overnight, but I can lock in the earliest priority slot tomorrow at 8:00 AM. Shall I reserve that for you?`;
      } else if (lower.includes("override") || lower.includes("sql") || lower.includes("bypass")) {
        reply = `Safety invariant gate triggered: direct state manipulation is strictly rejected. I can only coordinate verified appointments within business hours.`;
      } else if (lower.includes("book") || lower.includes("repair") || lower.includes("diagnostic") || lower.includes("tomorrow")) {
        toolCall = `reserve_slot(service="${kit.services[0]}", time="Tomorrow 10:00 AM")`;
        reply = `Technician availability verified for tomorrow at 10:00 AM for ${kit.businessName}. I have confirmed your appointment under reservation code APT-83B4F1. Have a wonderful day!`;
      } else {
        reply = `I can certainly help you with that. We specialize in ${kit.services.slice(0, 2).join(" and ")}. What day and time work best for you?`;
      }

      const agentTurn: TurnMessage = {
        id: Math.random().toString(),
        sender: "agent",
        text: reply,
        time: formatDuration(callDuration + 2),
        ttfa: Math.floor(Math.random() * 25) + 165,
        toolCall
      };

      setTurns((prev) => [...prev, agentTurn]);
      setVoiceState("speaking");
      setSubtitle(`Maya: "${reply}"`);

      setTimeout(() => {
        setVoiceState("idle");
        setSubtitle("");
      }, 3400);
    }, 1100);
  };

  return (
    <div className="h-screen max-h-screen w-screen max-w-full flex bg-[#090d16] text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. SARVAM LEFT NAVIGATION RAIL (w-60, fits strictly in viewport) */}
      <aside className="w-60 h-full bg-[#070a11] border-r border-white/[0.08] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Sarvam Logo & Workspace Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Saffron Gradient Flame / Sun Mark */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ea580c] via-[#f97316] to-[#fde047] flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
                <Radio size={17} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-tight">sarvam.ai</span>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-orange-400 font-semibold">
                  Voice Agents
                </div>
              </div>
            </div>
          </div>

          {/* Workspace label */}
          <div className="px-4 pt-3 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase text-slate-500">
            <span>Workspace</span>
            <span className="text-slate-400 font-semibold">PROD-IN</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 text-xs font-medium">
            <button
              onClick={() => setSidebarTab("agents")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "agents"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Bot size={16} className={sidebarTab === "agents" ? "text-orange-400" : "text-slate-500"} />
              <span>Voice Agents</span>
            </button>

            <button
              onClick={() => setSidebarTab("logs")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "logs"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen size={16} className={sidebarTab === "logs" ? "text-orange-400" : "text-slate-500"} />
                <span>Call Logs & Audio</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-orange-500/20 text-orange-300">
                4
              </span>
            </button>

            <button
              onClick={() => setSidebarTab("numbers")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "numbers"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Phone size={16} className={sidebarTab === "numbers" ? "text-orange-400" : "text-slate-500"} />
              <span>Phone Numbers</span>
            </button>

            <button
              onClick={() => setSidebarTab("knowledge")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "knowledge"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Database size={16} className={sidebarTab === "knowledge" ? "text-orange-400" : "text-slate-500"} />
              <span>Catalog & Rates</span>
            </button>

            <button
              onClick={() => setSidebarTab("guardrails")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "guardrails"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <ShieldCheck size={16} className={sidebarTab === "guardrails" ? "text-orange-400" : "text-slate-500"} />
              <span>Safety Guardrails</span>
            </button>

            <button
              onClick={() => setSidebarTab("analytics")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                sidebarTab === "analytics"
                  ? "bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-300 border border-orange-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <BarChart3 size={16} className={sidebarTab === "analytics" ? "text-orange-400" : "text-slate-500"} />
              <span>Analytics & SLA</span>
            </button>
          </nav>
        </div>

        {/* Bottom Tenant Selector & Compute Engine */}
        <div className="p-3 border-t border-white/[0.06] bg-[#05070d] space-y-2">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Industry Kit Preset</span>
            <select
              value={selectedKitId}
              onChange={(e) => setSelectedKitId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-orange-500"
            >
              <option value="hvac">HVAC (CoolAir Telephony)</option>
              <option value="plumbing">Plumbing (QuickFix)</option>
              <option value="electrician">Electrical (BrightSpark)</option>
              <option value="pest_control">Pest Control (SafeShield)</option>
            </select>
          </div>

          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>chomp:8083</span>
            </span>
            <span className="text-orange-400 font-bold">182ms TTFA</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE (strictly fits viewport: flex-1 flex flex-col overflow-hidden) */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-[#0a0e17]">
        {/* TOP AGENT COMMAND HEADER (54px) */}
        <header className="h-[54px] shrink-0 px-6 border-b border-white/[0.08] bg-[#0c101b] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Voice Agents /</span>
              <span className="font-bold text-white tracking-tight">{kit.businessName}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Published v2.1
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 text-xs">
            {/* Phone Number Pill */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg font-mono text-[11px]">
              <Phone size={12} className="text-orange-400" />
              <span className="text-slate-200 font-semibold">{kit.phone}</span>
              <button onClick={handleCopyPhone} className="text-slate-400 hover:text-white p-0.5" title="Copy Number">
                {copiedPhone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Save Draft button */}
            <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors">
              Save Draft
            </button>

            {/* Saffron Publish CTA */}
            <button 
              onClick={() => setIsPublished(!isPublished)}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs shadow-md shadow-orange-500/25 transition-all"
            >
              Deploy Agent
            </button>
          </div>
        </header>

        {/* 3. SPLIT WORKSPACE: CENTER CANVAS (7 COLS) + RIGHT TEST AGENT (5 COLS) */}
        <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
          {/* CENTER CANVAS: CONFIGURATION & BUILDER (Col 7 / 12) */}
          <div className="col-span-7 h-full flex flex-col border-r border-white/[0.08] bg-[#0c101a] overflow-hidden">
            {sidebarTab === "agents" && (
              <>
                {/* Canvas Navigation Tabs */}
                <div className="h-11 px-6 border-b border-white/[0.06] bg-[#090d16] flex items-center gap-2 shrink-0 text-xs">
                  <button
                    onClick={() => setBuilderTab("instructions")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                      builderTab === "instructions"
                        ? "bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Instructions & Persona
                  </button>
                  <button
                    onClick={() => setBuilderTab("voice")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
                      builderTab === "voice"
                        ? "bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Voice & Speech</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-orange-500/20 text-orange-300">
                      Bulbul v3
                    </span>
                  </button>
                  <button
                    onClick={() => setBuilderTab("tools")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                      builderTab === "tools"
                        ? "bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Tools & Actions
                  </button>
                  <button
                    onClick={() => setBuilderTab("guardrails")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                      builderTab === "guardrails"
                        ? "bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Safety Invariants
                  </button>
                </div>

                {/* Canvas Scrollable Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                  {/* TAB 1: INSTRUCTIONS & PERSONA */}
                  {builderTab === "instructions" && (
                    <div className="space-y-4">
                      {/* First Message (Greeting) */}
                      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-white flex items-center gap-2">
                            <Sparkles size={14} className="text-orange-400" />
                            <span>First Message (Spoken on Ring 1)</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-400">Greeting Trigger</span>
                        </div>
                        <textarea
                          rows={2}
                          value={firstMessage}
                          onChange={(e) => setFirstMessage(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-orange-500 transition-colors leading-relaxed font-sans"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Instant greeting for prompt customer reassurance</span>
                          <button 
                            onClick={() => {
                              setVoiceState("speaking");
                              setSubtitle(firstMessage);
                              setTimeout(() => { setVoiceState("idle"); setSubtitle(""); }, 3000);
                            }}
                            className="text-orange-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Play size={11} /> Play Preview
                          </button>
                        </div>
                      </div>

                      {/* System Prompt / Instructions */}
                      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-white flex items-center gap-2">
                            <BookOpen size={14} className="text-orange-400" />
                            <span>Agent Instructions & Conversation Flow</span>
                          </label>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Qwen3.5-9B Verified
                          </span>
                        </div>

                        <div className="bg-slate-950 border border-white/10 rounded-lg p-3.5 font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
                          <div>
                            <span className="text-orange-400 font-bold"># PERSONA & IDENTITY</span>
                            <p className="text-slate-400 mt-0.5">
                              You are Maya, the expert voice receptionist for {kit.businessName}. You speak in polite, professional Indian English with natural Hindi greetings (Namaste).
                            </p>
                          </div>

                          <div>
                            <span className="text-orange-400 font-bold"># OBJECTIVE</span>
                            <p className="text-slate-400 mt-0.5">
                              Diagnose customer service inquiries ({kit.services.slice(0, 3).join(", ")}), verify availability, quote verified rate schedule, and execute appointment bookings.
                            </p>
                          </div>

                          <div>
                            <span className="text-orange-400 font-bold"># OPERATING HOURS & SAFETY INVARIANTS</span>
                            <p className="text-slate-400 mt-0.5">
                              Operational window is strictly {kit.hours}. Reject overnight requests politely and re-schedule to earliest morning slot (8:00 AM). Never quote fixed prices before diagnostic inspection.
                            </p>
                          </div>

                          <div>
                            <span className="text-orange-400 font-bold"># CONFIRMATION PROTOCOL</span>
                            <p className="text-slate-400 mt-0.5">
                              Trigger tool `reserve_slot(service, date_time)` upon affirmative confirmation and recite slot code to caller.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: VOICE & SPEECH */}
                  {builderTab === "voice" && (
                    <div className="space-y-4">
                      {/* Language Selection */}
                      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-4 space-y-3">
                        <label className="text-xs font-semibold text-white block">
                          Spoken Language & Accent Model
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "en-in", name: "English (India) + Hinglish", sub: "Optimized for Indian SMB callers" },
                            { id: "hi", name: "Hindi (हिन्दी)", sub: "Pure Hindi conversational flow" },
                            { id: "ta", name: "Tamil (தமிழ்)", sub: "Chennai & Tamil Nadu regional" },
                            { id: "te", name: "Telugu (తెలుగు)", sub: "Hyderabad & Andhra regional" }
                          ].map((lang) => (
                            <div
                              key={lang.id}
                              onClick={() => setSelectedLanguage(lang.name)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedLanguage.includes(lang.id) || selectedLanguage === lang.name
                                  ? "bg-orange-500/10 border-orange-500/50 text-white"
                                  : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/10"
                              }`}
                            >
                              <div className="font-semibold text-xs">{lang.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{lang.sub}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bulbul v3 Voices */}
                      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Volume2 size={14} className="text-orange-400" />
                            <span>Bulbul v3 Voice Personas (Sarvam Native TTS)</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-400">110ms Synthesized</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { id: "Meera", name: "Meera (Bulbul v3)", gender: "Female", desc: "Warm, professional, customer support" },
                            { id: "Kabir", name: "Kabir (Bulbul v3)", gender: "Male", desc: "Confident, crisp, dispatch coordinator" },
                            { id: "Pooja", name: "Pooja (Bulbul v3)", gender: "Female", desc: "Friendly, empathetic, conversational" },
                            { id: "Rohan", name: "Rohan (Bulbul v3)", gender: "Male", desc: "Energetic, clear, technical support" }
                          ].map((v) => (
                            <div
                              key={v.id}
                              onClick={() => setSelectedVoice(v.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                selectedVoice === v.id
                                  ? "bg-orange-500/10 border-orange-500 text-white shadow-sm"
                                  : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/10"
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-xs text-white">{v.name}</div>
                                <div className="text-[10px] text-slate-500">{v.desc}</div>
                              </div>
                              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                selectedVoice === v.id ? "border-orange-500 bg-orange-500" : "border-slate-600"
                              }`} />
                            </div>
                          ))}
                        </div>

                        {/* Speech Tuning Sliders */}
                        <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-400">
                              <span>Speaking Speed</span>
                              <span className="text-orange-400 font-bold">{speechSpeed.toFixed(1)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.8"
                              max="1.3"
                              step="0.1"
                              value={speechSpeed}
                              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                              className="w-full accent-orange-500 bg-slate-950"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-400">
                              <span>Pitch Adjustment</span>
                              <span className="text-orange-400 font-bold">{speechPitch > 0 ? `+${speechPitch}%` : `${speechPitch}%`}</span>
                            </div>
                            <input
                              type="range"
                              min="-10"
                              max="10"
                              step="1"
                              value={speechPitch}
                              onChange={(e) => setSpeechPitch(parseInt(e.target.value))}
                              className="w-full accent-orange-500 bg-slate-950"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TOOLS & ACTIONS */}
                  {builderTab === "tools" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-white">Whitelisted Telephony Function Schemas</h3>
                          <p className="text-[11px] text-slate-400">Deterministic functions the agent can execute during real-time call</p>
                        </div>
                      </div>

                      {[
                        {
                          fn: "reserve_slot(service: str, date_time: str)",
                          desc: "Locks appointment into SQLite database with ACID transaction and generates SMS confirmation code.",
                          returns: "AppointmentConfirmation(code='APT-83B4F1', status='COMMITTED')"
                        },
                        {
                          fn: "quote_rate(service_name: str)",
                          desc: "Queries strictly whitelisted pricing catalog. Never hallucinates uncataloged services.",
                          returns: "QuoteResult(service='AC Diagnostic', rate='₹500 visit')"
                        },
                        {
                          fn: "check_operating_hours(requested_time: str)",
                          desc: "Deterministic safety invariant boundary gate. Rejects dispatch outside 8 AM - 8 PM.",
                          returns: "OperatingCheck(allowed=False, reason='Outside window 8:00 AM - 8:00 PM')"
                        }
                      ].map((tool, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-orange-400">{tool.fn}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active Gate
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{tool.desc}</p>
                          <div className="bg-slate-950 p-2 rounded-lg font-mono text-[10px] text-cyan-300">
                            returns: {tool.returns}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 4: SAFETY INVARIANTS */}
                  {builderTab === "guardrails" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-white">Verified Business Invariant Rules</h3>
                          <p className="text-[11px] text-slate-400">Never-Do constraints mathematically enforced in the turn machine</p>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Zero-Hallucination Active
                        </span>
                      </div>

                      {kit.neverDo.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-start gap-3 text-xs">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{item.rule}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Tested across 3 adversarial seeds. Invariant violation probability: 0.00%.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {sidebarTab === "logs" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Call Logs & Telephony Recordings</h2>
                    <p className="text-xs text-slate-400">Verbatim transcripts with audio playback</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    4 Calls Handled Today
                  </span>
                </div>

                {[
                  { id: "c1", name: "Amit Sharma", phone: "+91 98201 12345", duration: "1m 08s", intent: "AC Diagnostic Visit", outcome: "Booked", time: "14m ago", waves: [20, 70, 45, 90, 100, 60, 40, 80, 50] },
                  { id: "c2", name: "Priya Mehta", phone: "+91 98450 99821", duration: "42s", intent: "Deep Foam Cleaning Pricing", outcome: "Inquired", time: "52m ago", waves: [30, 60, 80, 40, 70, 30] },
                  { id: "c3", name: "Vikram Singh", phone: "+91 97110 54321", duration: "54s", intent: "Late Night Emergency", outcome: "After-Hours Gate", time: "Yesterday", waves: [40, 80, 50, 90, 70, 40] },
                  { id: "c4", name: "Sunita Rao", phone: "+91 99001 22334", duration: "1m 15s", intent: "R32 Gas Refill", outcome: "Booked", time: "Yesterday", waves: [20, 50, 90, 70, 100, 40, 80] }
                ].map((call) => (
                  <div key={call.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white text-sm">{call.name}</span>
                        <span className="text-slate-400 font-mono ml-2">{call.phone}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                        call.outcome === "Booked" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                        call.outcome === "After-Hours Gate" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                        "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                      }`}>
                        {call.outcome}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-white/5">
                      <button className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center hover:bg-orange-500/30 transition-colors">
                        <Play size={12} className="ml-0.5" />
                      </button>
                      <div className="flex-1 flex items-center gap-1 h-6">
                        {call.waves.map((h, i) => (
                          <div key={i} className="flex-1 bg-orange-500/60 hover:bg-orange-400 rounded-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{call.duration}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{call.intent}</span>
                      <span className="font-mono text-[10px]">{call.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sidebarTab === "numbers" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                <h2 className="text-sm font-bold text-white">Inbound Phone Number Management</h2>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-base font-mono">{kit.phone}</div>
                        <div className="text-xs text-slate-400">Primary Inbound SIP Trunk • Opus 24kHz</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="divide-y divide-white/5 text-xs font-mono pt-2">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Assigned Agent:</span>
                      <span className="text-white font-semibold">{kit.businessName}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Ring Latency:</span>
                      <span className="text-emerald-400">Direct Answer on Ring 1</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Operating Window:</span>
                      <span className="text-slate-200">{kit.hours}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === "knowledge" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Service Catalog & Verified Rates</h2>
                  <span className="text-xs text-emerald-400 font-mono">100% Rate Verified</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(kit.pricing).map(([service, price], i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{service}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Whitelisted diagnostic catalog</div>
                      </div>
                      <span className="text-emerald-400 font-mono font-bold text-sm">{price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === "guardrails" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Deterministic Invariant Boundary Rules</h2>
                <div className="space-y-3">
                  {kit.neverDo.map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-start gap-3 text-xs">
                      <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white">{item.rule}</div>
                        <div className="text-slate-400 text-[11px] mt-1">Category: {item.category} • Violations: 0</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === "analytics" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                <h2 className="text-sm font-bold text-white">Telephony Analytics & Turn Performance</h2>
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08]">
                    <span className="text-slate-400 text-[10px] block">Calls Today</span>
                    <span className="text-2xl font-bold text-white mt-1 block">48</span>
                    <span className="text-emerald-400 text-[10px]">100% Answered</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08]">
                    <span className="text-slate-400 text-[10px] block">Average TTFA</span>
                    <span className="text-2xl font-bold text-orange-400 mt-1 block">182ms</span>
                    <span className="text-slate-400 text-[10px]">Budget: 2800ms</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08]">
                    <span className="text-slate-400 text-[10px] block">Pipeline Yield</span>
                    <span className="text-2xl font-bold text-emerald-400 mt-1 block">₹31,200</span>
                    <span className="text-cyan-400 text-[10px]">19 Dispatches</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* RIGHT TESTBED: "TEST AGENT" LIVE SIMULATOR (Col 5 / 12) */}
          <div className="col-span-5 h-full flex flex-col bg-[#070a11] overflow-hidden">
            {/* Testbed Header */}
            <div className="h-11 px-4 border-b border-white/[0.08] bg-[#090d16] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">Test Agent</span>
                <span className="text-[10px] font-mono text-slate-500">· Real-Time Simulator</span>
              </div>
              <div className="flex items-center gap-2">
                {isOnCall ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    On Call • {formatDuration(callDuration)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                    Standby Line
                  </span>
                )}
              </div>
            </div>

            {/* VISUAL ACOUSTIC ORB DISPLAY */}
            <div className="h-44 shrink-0 flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-950 via-[#0a0d16] to-[#070a11] border-b border-white/[0.06] p-2">
              <SarvamVoiceOrb
                state={voiceState}
                size={140}
                subtitles={subtitle}
              />
            </div>

            {/* REAL-TIME CONVERSATION TURNS FEED (Scrollable, flex-1) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2 text-xs">
              {turns.map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col ${t.sender === "caller" ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 px-1">
                    <span className="text-[9px] font-mono text-slate-400 font-semibold">
                      {t.sender === "caller" ? "Caller" : "Maya (Bulbul v3)"}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{t.time}</span>
                    {t.ttfa && (
                      <span className="text-[8px] font-mono text-orange-400 bg-orange-500/10 px-1 rounded">
                        {t.ttfa}ms
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      t.sender === "caller"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-none shadow-md"
                        : "bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {t.text}
                    {t.toolCall && (
                      <div className="mt-1 pt-1 border-t border-white/10 text-[10px] font-mono text-orange-300 flex items-center gap-1">
                        <Check size={11} className="text-emerald-400" />
                        <span>{t.toolCall}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK TEST CHIPS & CALL ACTION CONTROLS */}
            <div className="p-3 border-t border-white/[0.08] bg-[#05070d] shrink-0 space-y-2">
              {/* Prompt chips */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleSendUtterance("Can I book an AC diagnostic repair tomorrow morning?")}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-orange-500/40 transition-all text-left"
                >
                  "Book Tomorrow Morning"
                </button>
                <button
                  onClick={() => handleSendUtterance("How much do you charge for deep foam cleaning?")}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-orange-500/40 transition-all text-left"
                >
                  "Check Cleaning Rates"
                </button>
                <button
                  onClick={() => handleSendUtterance("Emergency! Water leaking at 2:00 AM!")}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-500 transition-all text-left"
                >
                  "Test 2 AM Rule"
                </button>
              </div>

              {/* Action Form & Telephony Buttons */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendUtterance(customInput);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Type simulated customer speech..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
                />

                {/* Primary Voice Call / End Call Button */}
                {isOnCall ? (
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 transition-transform active:scale-95"
                    title="End Call"
                  >
                    <PhoneOff size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-transform active:scale-95"
                    title="Start Voice Call"
                  >
                    <PhoneIncoming size={15} />
                  </button>
                )}

                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>Speak</span>
                  <Send size={11} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
