import React, { useState, useEffect } from "react";
import { 
  Phone, PhoneIncoming, PhoneOff, Calendar, Clock, CheckCircle2, 
  TrendingUp, DollarSign, ShieldCheck, ChevronRight, User, 
  Volume2, Sparkles, Plus, X, Copy, Check, Wrench, Shield, PhoneCall
} from "lucide-react";

export interface BusinessPortalProps {
  businessName: string;
  phone: string;
  operatingHours: string;
  services: string[];
  pricing: Record<string, string>;
  neverDo: { rule: string; category: string }[];
  appointments: Array<{
    id: string;
    customer: string;
    phone: string;
    service: string;
    time: string;
    code: string;
    status: string;
  }>;
  onOpenConsole: () => void;
  onAddAppointment: (name: string, phone: string, service: string) => void;
}

interface CallRecord {
  id: string;
  callerName: string;
  callerPhone: string;
  timestamp: string;
  duration: string;
  intent: string;
  outcome: "Booked" | "Inquired" | "After-Hours Gate" | "Emergency Dispatched";
  summary: string;
  transcript: Array<{ speaker: "Caller" | "AI Assistant"; text: string; time: string }>;
}

const SAMPLE_CALL_LOGS: CallRecord[] = [
  {
    id: "call-101",
    callerName: "Amit Sharma",
    callerPhone: "+91 98201 12345",
    timestamp: "12 mins ago",
    duration: "1m 08s",
    intent: "AC Cooling Diagnostic",
    outcome: "Booked",
    summary: "Caller reported AC blowing warm air in Sector 4. Quoted standard ₹500 diagnostic visit. Confirmed appointment for Tomorrow at 10:00 AM (APT-83B4F1).",
    transcript: [
      { speaker: "Caller", text: "Hello, my split AC isn’t cooling at all since morning. Can someone check it?", time: "00:04" },
      { speaker: "AI Assistant", text: "Hello Amit! I can certainly arrange an AC diagnostic inspection for you. Our standard visit charge is ₹500, which includes a complete inspection and transparent quote. Would tomorrow morning at 10:00 AM work for you?", time: "00:12" },
      { speaker: "Caller", text: "Yes, 10:00 AM is perfect. My address is in Sector 4.", time: "00:22" },
      { speaker: "AI Assistant", text: "Excellent. Your diagnostic appointment is confirmed for tomorrow at 10:00 AM. Your reservation code is APT-83B4F1. You’ll receive an SMS confirmation shortly. Have a wonderful day!", time: "00:35" }
    ]
  },
  {
    id: "call-102",
    callerName: "Priya Mehta",
    callerPhone: "+91 98450 99821",
    timestamp: "48 mins ago",
    duration: "42s",
    intent: "Deep Foam Cleaning Pricing",
    outcome: "Inquired",
    summary: "Inquired about foam cleaning cost for 2 dual-inverter ACs. Quoted ₹1,200 standard service per unit. Sent pricing SMS link.",
    transcript: [
      { speaker: "Caller", text: "Hi, what are your rates for deep foam cleaning two ACs?", time: "00:03" },
      { speaker: "AI Assistant", text: "Hi Priya! Our Deep Foam Cleaning is ₹1,200 per unit, which includes jet pressure coil cleaning, antibacterial wash, and blower sanitization. Would you like me to book a slot for both units?", time: "00:14" },
      { speaker: "Caller", text: "I need to check with my family and call back later.", time: "00:26" },
      { speaker: "AI Assistant", text: "No problem at all! I have texted our service breakdown to this number. Feel free to call back whenever you’re ready.", time: "00:34" }
    ]
  },
  {
    id: "call-103",
    callerName: "Vikram Singh",
    callerPhone: "+91 97110 54321",
    timestamp: "Yesterday, 10:45 PM",
    duration: "54s",
    intent: "Late Night Emergency Dispatch",
    outcome: "After-Hours Gate",
    summary: "Caller requested technician at 10:45 PM. Safely gated per operating hours policy (8 AM - 8 PM). Scheduled priority first-morning slot at 8:15 AM.",
    transcript: [
      { speaker: "Caller", text: "Water is dripping from the indoor unit right now. Can a technician come over immediately?", time: "00:05" },
      { speaker: "AI Assistant", text: "I understand that’s inconvenient. Our on-site operating hours are 8:00 AM to 8:00 PM. To protect safety, I cannot dispatch tonight, but I can reserve the very first priority slot tomorrow at 8:15 AM. Shall I lock that in for you?", time: "00:19" },
      { speaker: "Caller", text: "Alright, please book that first slot at 8:15 AM.", time: "00:32" },
      { speaker: "AI Assistant", text: "Done! Your early priority visit is reserved for 8:15 AM tomorrow under code APT-48A1D9. A technician will contact you directly.", time: "00:46" }
    ]
  },
  {
    id: "call-104",
    callerName: "Sunita Rao",
    callerPhone: "+91 99001 22334",
    timestamp: "Yesterday, 4:15 PM",
    duration: "1m 15s",
    intent: "R32 Gas Refill & Servicing",
    outcome: "Booked",
    summary: "Booked compressor inspection and R32 gas refill. Slot confirmed for Friday 2:00 PM (APT-91C0E4).",
    transcript: [
      { speaker: "Caller", text: "My AC is running but cooling very slowly. I think the gas is low.", time: "00:04" },
      { speaker: "AI Assistant", text: "That often indicates low refrigerant pressure or a minor coil leak. R32 gas charging is ₹2,400 including a full leak-detection check. We have an opening this Friday at 2:00 PM. Would that suit you?", time: "00:18" },
      { speaker: "Caller", text: "Friday at 2:00 PM works nicely.", time: "00:29" },
      { speaker: "AI Assistant", text: "Confirmed! Booked for Friday at 2:00 PM under code APT-91C0E4. Our technician will carry pressure testing gauges to verify the charge.", time: "00:44" }
    ]
  }
];

export const BusinessPortal: React.FC<BusinessPortalProps> = ({
  businessName,
  phone,
  operatingHours,
  services,
  pricing,
  neverDo,
  appointments,
  onOpenConsole,
  onAddAppointment
}) => {
  const [autoAnswerEnabled, setAutoAnswerEnabled] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "calls" | "knowledge">("overview");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  
  // Test Phone Call Modal State
  const [isTestCallOpen, setIsTestCallOpen] = useState(false);
  const [testCallState, setTestCallState] = useState<"ringing" | "connected" | "ended">("ringing");
  const [callDurationSecs, setCallDurationSecs] = useState(0);
  const [testCallMessages, setTestCallMessages] = useState<Array<{ sender: "caller" | "ai"; text: string; time: string }>>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [customInputText, setCustomInputText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  // Manual Dispatch Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newService, setNewService] = useState(services[0] || "AC Diagnostic & Repair");

  // Handle Phone Copy
  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Timer for active test phone call
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTestCallOpen && testCallState === "connected") {
      interval = setInterval(() => {
        setCallDurationSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTestCallOpen, testCallState]);

  // Start test phone call
  const startTestCall = () => {
    setCallDurationSecs(0);
    setTestCallState("ringing");
    setTestCallMessages([]);
    setIsTestCallOpen(true);
    setIsAiSpeaking(false);

    // Auto-answer after 1.8s
    setTimeout(() => {
      setTestCallState("connected");
      setIsAiSpeaking(true);
      const greeting = `Thank you for calling ${businessName}! My name is Maya, your AI receptionist. How can I assist you today?`;
      setTestCallMessages([
        { sender: "ai", text: greeting, time: "00:01" }
      ]);
      setTimeout(() => setIsAiSpeaking(false), 2200);
    }, 1800);
  };

  // End call
  const endTestCall = () => {
    setTestCallState("ended");
    setTimeout(() => {
      setIsTestCallOpen(false);
      setTestCallState("ringing");
    }, 1200);
  };

  const formatCallDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Send simulated customer utterance in test call
  const handleSendUtterance = (text: string) => {
    if (!text.trim() || testCallState !== "connected") return;

    const timeStr = formatCallDuration(callDurationSecs);
    setTestCallMessages((prev) => [...prev, { sender: "caller", text, time: timeStr }]);
    setCustomInputText("");
    setIsAiSpeaking(true);

    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("fee") || lower.includes("charge")) {
        reply = `Our standard diagnostic inspection fee is ₹500. For deep foam cleaning it is ₹1,200. Our technician evaluates on-site and provides an itemized quote before any work starts. Would you like to schedule an inspection?`;
      } else if (lower.includes("3 am") || lower.includes("night") || lower.includes("2 am") || lower.includes("midnight") || lower.includes("now")) {
        reply = `Our operational hours are ${operatingHours}. In accordance with our safety policy, we don’t dispatch overnight, but I can reserve the very earliest priority visit tomorrow at 8:00 AM. May I book that for you?`;
      } else if (lower.includes("book") || lower.includes("repair") || lower.includes("cooling") || lower.includes("tomorrow") || lower.includes("diagnostic")) {
        reply = `I have an open appointment slot tomorrow at 11:00 AM with our senior technician. I can confirm that right now under your name. Shall I lock in slot APT-52D8?`;
      } else if (lower.includes("yes") || lower.includes("lock") || lower.includes("confirm")) {
        reply = `Splendid! Slot APT-52D8 is officially confirmed for tomorrow at 11:00 AM. I have sent an SMS confirmation to your number. Is there anything else I can help you with?`;
      } else {
        reply = `I can certainly help you with that. We specialize in ${services.slice(0, 3).join(", ")}. What day and time work best for a technician visit?`;
      }

      setTestCallMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, time: formatCallDuration(callDurationSecs + 2) }
      ]);
      setIsAiSpeaking(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP EXECUTIVE BANNER: STATUS & TELEPHONY CONTROLS */}
      <div className="bg-[#0f131d] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-32 bg-[#3b82f6]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-24 bg-[#ff5722]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#e64a19] flex items-center justify-center text-white shadow-lg shadow-[#ff5722]/20">
                <Volume2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {businessName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI Receptionist Active
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60 font-mono mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-[#3b82f6]" />
                    {operatingHours}
                  </span>
                  <span>•</span>
                  <span>Zero missed calls guaranteed</span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-mono">Inbound Line:</span>
              <span className="text-sm font-mono font-semibold text-white tracking-wider">{phone}</span>
              <button 
                onClick={handleCopyPhone}
                className="text-white/40 hover:text-white transition-colors p-1"
                title="Copy phone number"
              >
                {copiedPhone ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-Answer Switch */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Answer</div>
                <div className="text-[10px] text-white/50">
                  {autoAnswerEnabled ? "AI answers on 1st ring" : "Forward to personal phone"}
                </div>
              </div>
              <button
                onClick={() => setAutoAnswerEnabled(!autoAnswerEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoAnswerEnabled ? "bg-emerald-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoAnswerEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Test Call CTA */}
            <button
              onClick={startTestCall}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#f4511e] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-medium text-sm flex items-center gap-2.5 shadow-lg shadow-[#ff5722]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PhoneCall size={18} />
              <span>Test Call AI Receptionist</span>
            </button>

            {/* Engineering Switch */}
            <button
              onClick={onOpenConsole}
              className="px-3.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono border border-white/10 flex items-center gap-2 transition-all"
            >
              <Wrench size={15} />
              <span>Engineering Rack</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-white/10 mt-6 pt-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === "overview"
                ? "bg-white/15 text-white shadow-sm font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Dashboard & Dispatches
          </button>
          <button
            onClick={() => setActiveTab("calls")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "calls"
                ? "bg-white/15 text-white shadow-sm font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Customer Call Logs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
              {SAMPLE_CALL_LOGS.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "appointments"
                ? "bg-white/15 text-white shadow-sm font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Confirmed Bookings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#3b82f6]/20 text-[#3b82f6] font-mono">
              {appointments.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === "knowledge"
                ? "bg-white/15 text-white shadow-sm font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Services & Pricing Rules
          </button>
        </div>
      </div>

      {/* 2. ROI & PERFORMANCE METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Calls Handled Today</span>
            <PhoneIncoming size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">38</span>
            <span className="text-xs text-emerald-400 font-mono font-medium flex items-center">
              <TrendingUp size={12} className="mr-0.5" /> 100% Answered
            </span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center justify-between">
            <span>0 missed calls</span>
            <span className="text-emerald-400/90 font-mono">Saved ~2.4h owner time</span>
          </div>
        </div>

        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Bookings Pipeline</span>
            <DollarSign size={16} className="text-[#ff5722]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">₹28,500</span>
            <span className="text-xs text-[#ff5722] font-mono font-medium">+18% this wk</span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center justify-between">
            <span>{appointments.length} appointments active</span>
            <span className="text-white/60 font-mono">Avg ticket ₹1,580</span>
          </div>
        </div>

        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>After-Hours Rescued</span>
            <Clock size={16} className="text-[#3b82f6]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">14</span>
            <span className="text-xs text-[#3b82f6] font-mono font-medium">Calls after 8 PM</span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center justify-between">
            <span>Scheduled next morning</span>
            <span className="text-[#3b82f6] font-mono">0 lost competitors</span>
          </div>
        </div>

        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Avg Call Resolution</span>
            <ShieldCheck size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono">54s</span>
            <span className="text-xs text-amber-400 font-mono font-medium">182ms TTFA</span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 flex items-center justify-between">
            <span>100% Policy Adherence</span>
            <span className="text-amber-400/90 font-mono">Zero Hallucination</span>
          </div>
        </div>
      </div>

      {/* 3. TABS CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Confirmed Dispatches */}
            <div className="bg-[#0f131d] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar size={18} className="text-[#ff5722]" />
                    <span>Upcoming Customer Dispatches</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Appointments automatically locked into schedule by the AI Receptionist
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Plus size={14} />
                  <span>Manual Dispatch</span>
                </button>
              </div>

              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-lg bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] shrink-0 mt-0.5">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{apt.customer}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {apt.status}
                          </span>
                        </div>
                        <div className="text-xs text-[#ff5722] font-medium mt-0.5">
                          {apt.service}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50 font-mono mt-1">
                          <span>{apt.phone}</span>
                          <span>•</span>
                          <span className="text-white/80">{apt.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                        Slot Code
                      </span>
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono text-xs font-bold text-white">
                        {apt.code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inbound Call Mini Feed */}
            <div className="bg-[#0f131d] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <PhoneIncoming size={18} className="text-emerald-400" />
                    <span>Recent Inbound Call Activity</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Latest phone calls answered and handled by the voice model
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("calls")}
                  className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1 font-medium"
                >
                  View All Logs <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {SAMPLE_CALL_LOGS.slice(0, 3).map((call) => (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        call.outcome === "Booked" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : call.outcome === "After-Hours Gate"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-[#3b82f6]/10 text-[#3b82f6]"
                      }`}>
                        <Phone size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{call.callerName}</span>
                          <span className="text-xs text-white/40 font-mono">{call.callerPhone}</span>
                        </div>
                        <div className="text-xs text-white/60 truncate mt-0.5">
                          {call.intent}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          call.outcome === "Booked"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : call.outcome === "After-Hours Gate"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-white/10 text-white/80"
                        }`}>
                          {call.outcome}
                        </span>
                        <div className="text-[10px] font-mono text-white/40 mt-1">
                          {call.timestamp} · {call.duration}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/30" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quick Test Call Card */}
            <div className="bg-gradient-to-br from-[#121826] to-[#0c0f17] border border-[#3b82f6]/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-[#3b82f6] uppercase">
                <Sparkles size={14} />
                <span>Simulate Real Caller Experience</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Hear your receptionist in action
              </h3>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                Dial directly into your voice agent with zero latency. Test appointment booking, pricing inquiries, or after-hours safety guardrails.
              </p>

              <div className="mt-4 space-y-2">
                <button
                  onClick={startTestCall}
                  className="w-full py-2.5 rounded-lg bg-[#ff5722] hover:bg-[#e64a19] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <PhoneCall size={15} />
                  <span>Launch Inbound Call Simulator</span>
                </button>
              </div>
            </div>

            {/* Invariant Gates */}
            <div className="bg-[#0f131d] border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <Shield size={16} className="text-emerald-400" />
                <span>Verified Business Invariants</span>
              </div>
              <p className="text-[11px] text-white/50 mb-3">
                These rules are mathematically locked into the runtime state machine to protect your business reputation:
              </p>

              <div className="space-y-2.5">
                {neverDo.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-white/80 leading-snug">{item.rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Catalog Pricing */}
            <div className="bg-[#0f131d] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench size={16} className="text-[#3b82f6]" />
                  <span>Catalog Services</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Fixed Rate Safe</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {Object.entries(pricing).map(([service, rate], idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-white/80">{service}</span>
                    <span className="text-emerald-400 font-bold">{rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALLS TAB */}
      {activeTab === "calls" && (
        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Full Inbound Call History</h2>
              <p className="text-xs text-white/50">
                Every caller conversation is recorded, transcribed, and audited for policy compliance.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[11px] font-mono text-white/40 uppercase">
                <tr>
                  <th className="py-3 px-3">Caller</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Intent</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {SAMPLE_CALL_LOGS.map((call) => (
                  <tr 
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{call.callerName}</div>
                      <div className="text-[11px] font-mono text-white/50">{call.callerPhone}</div>
                    </td>
                    <td className="py-3.5 px-3 text-white/70 font-mono">{call.timestamp}</td>
                    <td className="py-3.5 px-3 text-white/70 font-mono">{call.duration}</td>
                    <td className="py-3.5 px-3 text-white/90">{call.intent}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        call.outcome === "Booked"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : call.outcome === "After-Hours Gate"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-white/10 text-white/80"
                      }`}>
                        {call.outcome}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white text-[11px] font-mono inline-flex items-center gap-1">
                        <span>Transcript</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPOINTMENTS TAB */}
      {activeTab === "appointments" && (
        <div className="bg-[#0f131d] border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Confirmed Dispatches & Appointments</h2>
              <p className="text-xs text-white/50">
                Scheduled service calls synchronized with technician calendar.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus size={14} />
              <span>Schedule New Appointment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {apt.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-white/60">{apt.code}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{apt.customer}</h3>
                  <div className="text-xs text-[#ff5722] font-medium mt-0.5">{apt.service}</div>
                </div>
                <div className="text-xs text-white/60 space-y-1 font-mono pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-[#3b82f6]" />
                    <span>{apt.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-emerald-400" />
                    <span>{apt.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KNOWLEDGE TAB */}
      {activeTab === "knowledge" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f131d] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench size={18} className="text-[#ff5722]" />
              <span>Approved Services & Transparent Rates</span>
            </h2>
            <p className="text-xs text-white/50">
              The AI receptionist strictly quotes only these verified services and prices.
            </p>
            <div className="space-y-3">
              {services.map((s, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{s}</span>
                  <span className="font-mono text-emerald-400 font-bold">{pricing[s] || "Quote On Site"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f131d] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>Strict Policy Guardrails</span>
            </h2>
            <p className="text-xs text-white/50">
              Deterministic invariant rules that prevent unauthorized promises or safety hazards.
            </p>
            <div className="space-y-3">
              {neverDo.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white/90">{item.category} Rule</span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">Enforced</span>
                  </div>
                  <p className="text-white/60">{item.rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CALL TRANSCRIPT DRAWER MODAL */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f131d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Phone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Call Transcript: {selectedCall.callerName}</h3>
                  <div className="text-[11px] font-mono text-white/50">
                    {selectedCall.callerPhone} · {selectedCall.timestamp} · {selectedCall.duration}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-[#3b82f6]/10 border-b border-white/5 flex items-start gap-3">
              <Sparkles size={16} className="text-[#3b82f6] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-white uppercase tracking-wider text-[10px]">AI Call Summary</div>
                <p className="text-white/80 mt-1 leading-relaxed">{selectedCall.summary}</p>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {selectedCall.transcript.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${item.speaker === "Caller" ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-mono font-bold text-white/40">{item.speaker}</span>
                    <span className="text-[9px] font-mono text-white/30">{item.time}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      item.speaker === "Caller"
                        ? "bg-black/50 border border-white/10 text-white"
                        : "bg-emerald-950/40 border border-emerald-500/30 text-emerald-100"
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/10 flex justify-end bg-black/40">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REALISTIC SMARTPHONE TEST CALL MODAL */}
      {isTestCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[40px] bg-[#090b10] border-[6px] border-[#222736] shadow-2xl overflow-hidden flex flex-col h-[700px] relative">
            <div className="pt-3 pb-2 flex justify-center items-center relative z-20">
              <div className="w-24 h-5 rounded-full bg-black flex items-center justify-between px-3">
                <div className="w-2 h-2 rounded-full bg-[#1e2333]" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-ping" />
              </div>
            </div>

            <div className="px-6 flex justify-between items-center text-[10px] font-mono text-white/50">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            <div className="px-6 pt-4 pb-2 text-center flex flex-col items-center">
              <div className="text-xs font-mono uppercase tracking-widest text-[#ff5722] font-semibold">
                Inbound Phone Test
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{businessName}</h2>
              <div className="text-xs font-mono text-white/50 mt-0.5">{phone}</div>

              <div className="mt-3">
                {testCallState === "ringing" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono animate-pulse">
                    <PhoneIncoming size={14} />
                    <span>Ringing SIP Line...</span>
                  </div>
                )}
                {testCallState === "connected" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Connected • {formatCallDuration(callDurationSecs)}</span>
                  </div>
                )}
                {testCallState === "ended" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-mono">
                    <PhoneOff size={14} />
                    <span>Call Disconnected</span>
                  </div>
                )}
              </div>

              {/* Acoustic Voice Waveform animation */}
              <div className="my-4 h-16 w-full flex items-center justify-center gap-1.5 px-6">
                {testCallState === "connected" ? (
                  [0.3, 0.8, 0.4, 0.9, 0.5, 0.7, 1.0, 0.6, 0.85, 0.4, 0.95, 0.3].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        isAiSpeaking ? "bg-gradient-to-t from-[#ff5722] to-amber-400" : "bg-[#3b82f6]/40"
                      }`}
                      style={{
                        height: isAiSpeaking ? `${Math.max(12, h * 55)}px` : "10px"
                      }}
                    />
                  ))
                ) : (
                  <div className="text-xs text-white/30 font-mono">
                    {testCallState === "ringing" ? "Connecting to local voice pipeline..." : "Line closed."}
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Bubbles Scroll Area */}
            <div className="flex-1 px-4 py-2 overflow-y-auto space-y-2.5 text-xs">
              {testCallMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "caller" ? "items-end" : "items-start"}`}
                >
                  <div className="text-[9px] font-mono text-white/40 mb-0.5 px-1">
                    {msg.sender === "caller" ? "You (Caller)" : "Maya (AI Receptionist)"} • {msg.time}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === "caller"
                        ? "bg-[#ff5722] text-white rounded-tr-none"
                        : "bg-[#181d2b] border border-white/10 text-white/90 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiSpeaking && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono px-2 animate-pulse">
                  <span>AI Receptionist speaking...</span>
                </div>
              )}
            </div>

            {/* Prompt Chips */}
            {testCallState === "connected" && (
              <div className="p-2 border-t border-white/5 bg-black/40 space-y-1.5">
                <div className="text-[10px] font-mono text-white/40 px-2">Tap a test caller prompt:</div>
                <div className="flex flex-wrap gap-1 px-1">
                  <button
                    onClick={() => handleSendUtterance("Can I book an AC diagnostic repair tomorrow morning?")}
                    className="text-[10px] bg-white/10 hover:bg-white/15 text-white/90 px-2 py-1 rounded-md transition-colors"
                  >
                    "Book AC Diagnostic Tomorrow"
                  </button>
                  <button
                    onClick={() => handleSendUtterance("How much do you charge for deep foam cleaning?")}
                    className="text-[10px] bg-white/10 hover:bg-white/15 text-white/90 px-2 py-1 rounded-md transition-colors"
                  >
                    "What is Deep Cleaning Fee?"
                  </button>
                  <button
                    onClick={() => handleSendUtterance("Send someone to fix my AC right now at 2:00 AM!")}
                    className="text-[10px] bg-white/10 hover:bg-white/15 text-amber-300/90 px-2 py-1 rounded-md transition-colors"
                  >
                    "Test 2:00 AM Rule"
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendUtterance(customInputText);
                  }}
                  className="flex items-center gap-1.5 px-1 pt-1"
                >
                  <input
                    type="text"
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder="Type caller voice reply..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff5722]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#ff5722] hover:bg-[#e64a19] text-white font-medium text-xs"
                  >
                    Speak
                  </button>
                </form>
              </div>
            )}

            {/* Bottom Smartphone Call Controls */}
            <div className="p-4 bg-black/80 border-t border-white/10 flex items-center justify-around">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white"
                }`}
              >
                <Volume2 size={20} />
              </button>

              <button
                onClick={endTestCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-transform active:scale-95"
              >
                <PhoneOff size={24} />
              </button>

              <button
                onClick={() => handleSendUtterance("Yes, please confirm the appointment slot.")}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                title="Quick Confirm"
              >
                <Check size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL DISPATCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName && newPhone) {
                onAddAppointment(newName, newPhone, newService);
                setShowAddModal(false);
                setNewName("");
                setNewPhone("");
              }
            }}
            className="bg-[#0f131d] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-[#ff5722]" />
                <span>Manual Customer Booking</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/60 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 00000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-1">Assigned Service</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ff5722]"
                >
                  {services.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-semibold"
              >
                Confirm Dispatch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
