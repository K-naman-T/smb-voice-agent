import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, RotateCcw, ArrowRight,
  Check, ChevronDown, ChevronUp,
  Sparkles, Phone
} from "lucide-react";

interface LandingPageProps {
  onLaunchStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchStudio }) => {
  // Preset selection for the Center Console
  const [activeVertical, setActiveVertical] = useState<"hvac" | "plumbing" | "dental">("hvac");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentCallStep, setCurrentCallStep] = useState<"ready" | "inquiry" | "interrupted" | "booked">("ready");
  
  // Scrubber state for the 300ms Acoustic Anatomy section
  const [scrubberMs, setScrubberMs] = useState(280);

  // Revenue Calculator state
  const [weeklyMissed, setWeeklyMissed] = useState(16);
  const [avgTicket, setAvgTicket] = useState(850);

  // Expanded dispatch ledger item
  const [expandedLedger, setExpandedLedger] = useState<number | null>(0);

  const presets = {
    hvac: {
      business: "CoolAir Climate Systems",
      caller: "Mrs. Sarah Jenkins",
      issue: "AC unit leaking water inside living room",
      greeting: "Namaste! You've reached CoolAir Climate. I'm Maya, the front-desk coordinator. Is your AC blowing warm air, or are you looking to schedule routine maintenance?",
      inquiryText: "My outdoor unit stopped spinning, and water is pooling under the indoor vent onto our floor.",
      mayaResponse: "I'm so sorry to hear that. That usually indicates a backed-up condensate line or frozen coil. We have a technician in your neighborhood between 1:30 PM and 3:30 PM today. Inspection is $79, credited toward any repair. Can I hold that slot for you?",
      interruptedText: "Wait! My husband won't be back from work until 5:00 PM. Do you have anything after 5:30?",
      mayaPivot: "Absolutely! We can accommodate that. Our evening technician has an opening between 5:30 PM and 7:00 PM tonight. Would that fit his schedule better?",
      bookedText: "Locked in for tonight between 5:30 and 7:00 PM. Confirmation code #CL-402 committed to schedule. A calendar pass and technician tracker have been sent to your phone.",
      ticket: "$920 Estimated Job",
    },
    plumbing: {
      business: "Titan Commercial & Home Plumbing",
      caller: "Marcus Vance",
      issue: "Kitchen main sewer line backing up",
      greeting: "Titan Plumbing! I'm Maya, the dispatch coordinator. Do you have an active flood emergency, or can I schedule a general service visit?",
      inquiryText: "Our main floor drain is backing up into the utility room right now. Water is starting to spread.",
      mayaResponse: "That is an active priority hazard. I can roll our emergency hydro-jetting rig to your address immediately—estimated arrival within 35 minutes. Shall I dispatch the crew?",
      interruptedText: "Wait, will this require shutting off the water to our entire building?",
      mayaPivot: "No, we can isolate just the utility riser valve so the rest of the building retains full water pressure. Confirming your emergency dispatch now?",
      bookedText: "Emergency crew dispatched. ETA 32 minutes. Priority unit #TTN-049 locked. A live GPS tracking link has been texted to your mobile.",
      ticket: "$1,450 Emergency Dispatch",
    },
    dental: {
      business: "Metropolitan Dental Group",
      caller: "Elena Rostova",
      issue: "Chipped upper premolar with nerve sensitivity",
      greeting: "Metropolitan Dental. I'm Maya. Are you an existing patient, or would you like to schedule an appointment?",
      inquiryText: "I cracked my upper premolar at lunch today and it throbs whenever cold water or air hits it.",
      mayaResponse: "Ouch, I'm so sorry! Dr. Chen reserves daily priority slots for dental trauma. We have an opening today at 3:15 PM to relieve the pain and take digital imaging. Would you like that chair?",
      interruptedText: "Does your practice accept Delta Dental Premier PPO?",
      mayaPivot: "Yes, we are in-network with Delta Dental Premier. Your emergency exam and stabilization will be billed under standard preventative terms. Shall I reserve 3:15 PM?",
      bookedText: "Reserved. 3:15 PM today with Dr. Chen. Patient file #MET-708 locked into clinic calendar. We've sent intake documents directly to your phone.",
      ticket: "$380 Diagnostic & Stabilization",
    },
  };

  const ledgerItems = [
    {
      time: "8:14 PM",
      label: "After-Hours Emergency",
      caller: "Sarah M.",
      problem: "AC Compressor froze; water dripping into ceiling drywall",
      resolution: "Evening slot reserved (5:30–7:00 PM); fee confirmed; SMS sent",
      value: "$850",
      category: "HVAC",
    },
    {
      time: "11:02 PM",
      label: "Night Shift Inbound",
      caller: "Marcus T.",
      problem: "Kitchen sink drain gurgling with sewer backflow",
      resolution: "Emergency jetting crew dispatched in 35 mins; riser valve guidance given",
      value: "$1,400",
      category: "Plumbing",
    },
    {
      time: "6:15 AM",
      label: "Early Morning Priority",
      caller: "Elena R.",
      problem: "Cracked molar throbbing from exposed dentin",
      resolution: "3:15 PM trauma chair reserved with Dr. Chen; insurance pre-verified",
      value: "$420",
      category: "Dental",
    },
    {
      time: "Sunday 2:40 PM",
      label: "Weekend Request",
      caller: "Dave K.",
      problem: "Brake squeal and rotor grinding on 2022 Audi Q5",
      resolution: "Bay 2 reserved for Wednesday 8:30 AM; overnight key-drop confirmed",
      value: "$580",
      category: "Auto",
    },
  ];

  const playVoice = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`~]/g, "").trim());
        utterance.rate = 1.02;
        const voices = window.speechSynthesis.getVoices();
        const naturalVoice =
          voices.find((v) => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")) ||
          voices.find((v) => (v.lang.startsWith("en") || v.lang.startsWith("hi")) && !v.name.includes("Bad")) ||
          voices[0];
        if (naturalVoice) utterance.voice = naturalVoice;
        window.speechSynthesis.speak(utterance);
      } catch (_) {}
    }
  };

  const handleRunInquiry = () => {
    setIsPlayingAudio(true);
    setCurrentCallStep("inquiry");
    playVoice(presets[activeVertical].mayaResponse);
    setTimeout(() => setIsPlayingAudio(false), 3400);
  };

  const handleRunInterrupt = () => {
    setIsPlayingAudio(true);
    setCurrentCallStep("interrupted");
    playVoice(presets[activeVertical].mayaPivot);
    setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  const handleRunCommit = () => {
    setIsPlayingAudio(true);
    setCurrentCallStep("booked");
    playVoice(presets[activeVertical].bookedText);
    setTimeout(() => setIsPlayingAudio(false), 3600);
  };

  const handleResetConsole = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    setIsPlayingAudio(false);
    setCurrentCallStep("ready");
  };

  // Lost revenue formula: 35% of missed callers book immediately with instant pickup
  const monthlyRecoverable = Math.round(weeklyMissed * 4.33 * 0.35 * avgTicket);
  const annualRecoverable = monthlyRecoverable * 12;

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-[#141311] font-jakarta antialiased selection:bg-[#1B5E3C] selection:text-white">
      {/* Topbar: Minimal & Functional */}
      <header className="sticky top-0 z-50 bg-[#F6F4F0]/90 backdrop-blur-xl border-b border-[#E6E2DC] px-6 md:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1B5E3C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            V
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base tracking-tight text-[#141311]">Vaani</span>
            <span className="text-xs text-[#7A746C] hidden sm:inline">/ 24·7 Autonomous Inbound Dispatch</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <a href="#console" className="text-sm font-semibold text-[#6B655D] hover:text-[#141311] transition-colors hidden md:block">
            Live Phone Console
          </a>
          <a href="#ledger" className="text-sm font-semibold text-[#6B655D] hover:text-[#141311] transition-colors hidden md:block">
            Captured Jobs Ledger
          </a>
          <a href="#anatomy" className="text-sm font-semibold text-[#6B655D] hover:text-[#141311] transition-colors hidden md:block">
            Acoustic Speed
          </a>
          <button
            onClick={onLaunchStudio}
            style={{ color: "#ffffff", backgroundColor: "#141311" }}
            className="px-5 py-2.5 rounded-full hover:bg-[#2C2A26] font-semibold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            Launch Studio <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </header>

      {/* 1. THE OPENING CANVAS (Editorial Center-Stage Phone Console) */}
      <section className="relative pt-16 pb-24 px-6 md:px-12 border-b border-[#E6E2DC]">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Statement */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] leading-[1.04] text-[#141311]"
          >
            When your phone rings, three rings later they call your competitor.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-base sm:text-lg text-[#5E5850] max-w-2xl mx-auto leading-relaxed"
          >
            Vaani answers on ring one. Speaks warmly with human cadence. Quotes your exact diagnostic fees, checks real-time availability, and books confirmed appointments into your calendar.
          </motion.p>
        </div>

        {/* The Tactile Center Console Component */}
        <div id="console" className="mt-14 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-[#DCD6CC] shadow-xl p-6 md:p-8 relative overflow-hidden">
            {/* Console Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EAE5DC] pb-5 mb-6 gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1B5E3C] animate-pulse" />
                  <span className="font-display font-bold text-base text-[#141311] tracking-tight">
                    {presets[activeVertical].business}
                  </span>
                </div>
                <div className="text-xs text-[#7A746C] font-mono mt-0.5">
                  Line Status: Live Inbound · Connected to Calendar
                </div>
              </div>

              {/* Vertical Pills */}
              <div className="flex p-1 bg-[#F2EFE9] rounded-2xl border border-[#E0DAD0] self-start sm:self-auto">
                {(["hvac", "plumbing", "dental"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveVertical(key);
                      handleResetConsole();
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      activeVertical === key
                        ? "bg-white text-[#141311] shadow-sm font-bold"
                        : "text-[#7A746C] hover:text-[#141311]"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Kinetic Audio Waveform Strip (Skiper UI inspired) */}
            <div className="h-14 bg-[#FAF8F5] border border-[#EAE5DC] rounded-2xl px-5 flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5 h-8 flex-1">
                {Array.from({ length: 36 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isPlayingAudio
                        ? `${Math.max(15, Math.sin(i * 0.45 + Date.now() / 250) * 100)}%`
                        : "15%",
                    }}
                    transition={{ duration: 0.12 }}
                    className={`w-1 rounded-full transition-colors ${
                      isPlayingAudio ? "bg-[#1B5E3C]" : "bg-[#D5CEC4]"
                    }`}
                  />
                ))}
              </div>

              <div className="pl-4 font-mono text-xs text-right">
                {isPlayingAudio ? (
                  <span className="text-[#1B5E3C] font-bold">Acoustic Playout (280ms)</span>
                ) : (
                  <span className="text-[#8C857B]">Waiting for caller...</span>
                )}
              </div>
            </div>

            {/* Live Conversation Window */}
            <div className="bg-[#FAF8F5] border border-[#EAE5DC] rounded-2xl p-6 min-h-[240px] max-h-[290px] overflow-y-auto space-y-4 text-sm font-sans">
              {/* Turn 1: Greeting */}
              <div className="flex flex-col items-start">
                <span className="text-xs font-mono text-[#8C857B] uppercase mb-1 font-bold">
                  Vaani (Front Desk) · 0:01
                </span>
                <div className="p-3.5 rounded-2xl bg-white border border-[#E6E2DC] text-[#141311] max-w-[90%] shadow-sm leading-relaxed">
                  {presets[activeVertical].greeting}
                </div>
              </div>

              {/* Turn 2: Customer Inquiry */}
              {currentCallStep !== "ready" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-end"
                >
                  <span className="text-xs font-mono text-[#8C857B] uppercase mb-1 font-bold">
                    Caller ({presets[activeVertical].caller}) · 0:08
                  </span>
                  <div className="p-3.5 rounded-2xl bg-[#141311] text-white max-w-[90%] leading-relaxed font-medium">
                    {presets[activeVertical].inquiryText}
                  </div>
                </motion.div>
              )}

              {/* Turn 3: Assistant Diagnostic Proposal */}
              {(currentCallStep === "inquiry" || currentCallStep === "interrupted" || currentCallStep === "booked") && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start"
                >
                  <span className="text-xs font-mono text-[#8C857B] uppercase mb-1 font-bold">
                    Vaani (Front Desk) · 0:14
                  </span>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E6E2DC] text-[#141311] max-w-[90%] shadow-sm leading-relaxed">
                    {presets[activeVertical].mayaResponse}
                  </div>
                </motion.div>
              )}

              {/* Turn 4: Caller Barge-in / Time Change */}
              {(currentCallStep === "interrupted" || currentCallStep === "booked") && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-end"
                >
                  <span className="text-xs font-mono text-[#C2410C] uppercase mb-1 font-bold">
                    [Mid-Sentence Interruption] · 0:18
                  </span>
                  <div className="p-3.5 rounded-2xl bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA] max-w-[90%] leading-relaxed font-medium">
                    {presets[activeVertical].interruptedText}
                  </div>
                </motion.div>
              )}

              {/* Turn 5: Assistant Seamless Pivot */}
              {(currentCallStep === "interrupted" || currentCallStep === "booked") && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start"
                >
                  <span className="text-xs font-mono text-[#8C857B] uppercase mb-1 font-bold">
                    Vaani (Front Desk) · 0:21
                  </span>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E6E2DC] text-[#141311] max-w-[90%] shadow-sm leading-relaxed">
                    {presets[activeVertical].mayaPivot}
                  </div>
                </motion.div>
              )}

              {/* Turn 6: Booked Confirmation */}
              {currentCallStep === "booked" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start"
                >
                  <span className="text-xs font-mono text-[#1B5E3C] uppercase mb-1 font-bold">
                    Calendar Confirmed (DB Write Locked) · 0:28
                  </span>
                  <div className="p-3.5 rounded-2xl bg-[#E7F0EB] text-[#1B5E3C] border border-[#227A4F]/30 max-w-[90%] leading-relaxed font-semibold">
                    {presets[activeVertical].bookedText}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Interactive Tactile Trigger Buttons */}
            <div className="mt-6 pt-5 border-t border-[#EAE5DC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRunInquiry}
                  disabled={currentCallStep !== "ready"}
                  style={{ color: "#ffffff", backgroundColor: "#141311" }}
                  className="px-4 py-2.5 rounded-full hover:bg-[#2C2A26] font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  <Play className="w-4 h-4 text-emerald-400" /> 1. Customer Problem
                </button>

                <button
                  onClick={handleRunInterrupt}
                  disabled={currentCallStep !== "inquiry"}
                  style={{ color: "#9A3412", backgroundColor: "#FFF7ED" }}
                  className="px-4 py-2.5 rounded-full hover:bg-[#FFEDD5] font-semibold text-sm border border-[#FED7AA] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4 text-[#C2410C]" /> 2. Interrupt Assistant
                </button>

                <button
                  onClick={handleRunCommit}
                  disabled={currentCallStep !== "interrupted"}
                  style={{ color: "#1B5E3C", backgroundColor: "#E7F0EB" }}
                  className="px-4 py-2.5 rounded-full hover:bg-[#D4E8DC] font-semibold text-sm border border-[#1B5E3C]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-4 h-4 text-[#1B5E3C]" /> 3. Lock Appointment
                </button>
              </div>

              <button
                onClick={handleResetConsole}
                className="p-2.5 rounded-full bg-[#F2EFE9] hover:bg-[#E6E2DC] text-[#7A746C] transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Reset Console"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Dedicated Studio Banner */}
          <div className="mt-5 p-5 rounded-2xl bg-white border border-[#E0DAD0] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#E7F0EB] text-[#1B5E3C] flex items-center justify-center font-bold flex-shrink-0">
                <Phone className="w-5 h-5 text-[#1B5E3C]" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-[#141311]">Want to test Maya live with your own microphone?</div>
                <div className="text-xs sm:text-sm text-[#5E5850]">Experience real-time voice recognition, instant barge-in interruptions, and multi-turn scheduling.</div>
              </div>
            </div>
            <button
              onClick={onLaunchStudio}
              style={{ color: "#ffffff", backgroundColor: "#1B5E3C" }}
              className="px-6 py-3 rounded-full hover:bg-[#154b30] font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#1B5E3C]/20 flex-shrink-0"
            >
              Launch Interactive Studio <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. THE DISPATCH LEDGER (Proof of Captured Revenue) */}
      <section id="ledger" className="py-24 px-6 md:px-12 border-b border-[#E6E2DC] bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.025em] text-[#141311]">
                The Live Dispatch Ledger
              </h2>
              <p className="text-[#5E5850] text-sm mt-2 max-w-xl">
                Real jobs captured by Vaani while business owners were on a roof, under a sink, or asleep at night.
              </p>
            </div>
            <div className="font-mono text-xs text-[#1B5E3C] bg-[#E7F0EB] border border-[#227A4F]/20 px-3.5 py-1.5 rounded-full font-bold self-start md:self-auto">
              4 Captured Today · $3,250 Added
            </div>
          </div>

          <div className="divide-y divide-[#EAE5DC] border-y border-[#EAE5DC]">
            {ledgerItems.map((item, index) => {
              const isExpanded = expandedLedger === index;
              return (
                <div key={index} className="py-4 hover:bg-[#FAF8F5] transition-colors rounded-xl px-4">
                  <div
                    onClick={() => setExpandedLedger(isExpanded ? null : index)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-[#8C857B] min-w-[70px]">
                        {item.time}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#F2EFE9] text-[#5E5850] font-mono text-[11px] font-semibold uppercase">
                        {item.category}
                      </span>
                      <span className="font-bold text-sm text-[#141311]">
                        {item.caller}
                      </span>
                      <span className="text-xs text-[#5E5850] hidden md:inline truncate max-w-xs">
                        {item.problem}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-auto">
                      <span className="font-mono font-bold text-sm text-[#1B5E3C]">
                        {item.value}
                      </span>
                      <button className="text-[#8C857B] hover:text-[#141311]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 pb-2 pl-4 sm:pl-[86px] text-xs text-[#5E5850] space-y-1.5"
                      >
                        <div>
                          <strong className="text-[#141311]">Customer Issue:</strong> {item.problem}
                        </div>
                        <div>
                          <strong className="text-[#141311]">Action Taken:</strong> {item.resolution}
                        </div>
                        <div className="pt-2 text-[11px] text-[#1B5E3C] font-mono font-semibold">
                          ✓ Calendar event locked & text confirmation delivered in 42 seconds
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. THE 300MS ACOUSTIC ANATOMY (Interactive Scrubber) */}
      <section id="anatomy" className="py-24 px-6 md:px-12 border-b border-[#E6E2DC] bg-[#F6F4F0]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.025em] text-[#141311]">
              What Happens in 280 Milliseconds
            </h2>
            <p className="text-[#5E5850] text-sm mt-2 max-w-lg mx-auto">
              Why callers never hang up: speech is processed locally in memory. Zero cloud lag, zero robotic hesitation.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#DCD6CC] p-8 md:p-10 shadow-sm">
            {/* Scrubber slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-[#8C857B]">DRAG TIMELINE SCRUBBER</span>
                <span className="text-[#1B5E3C] font-bold text-sm">{scrubberMs}ms</span>
              </div>
              <input
                type="range"
                min="30"
                max="280"
                value={scrubberMs}
                onChange={(e) => setScrubberMs(Number(e.target.value))}
                className="w-full accent-[#1B5E3C] h-2 bg-[#F2EFE9] rounded-lg cursor-pointer"
              />
            </div>

            {/* 4 Pipeline Stages */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border transition-all ${scrubberMs >= 40 ? "bg-[#E7F0EB] border-[#227A4F]/30" : "bg-[#FAF8F5] border-[#EAE5DC] opacity-40"}`}>
                <div className="font-mono text-xs font-bold text-[#1B5E3C]">0 – 40ms</div>
                <div className="font-bold text-xs text-[#141311] mt-1">Acoustic Detection</div>
                <p className="text-[11px] text-[#5E5850] mt-1">Filters background engines, saws, and traffic noise.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${scrubberMs >= 110 ? "bg-[#E7F0EB] border-[#227A4F]/30" : "bg-[#FAF8F5] border-[#EAE5DC] opacity-40"}`}>
                <div className="font-mono text-xs font-bold text-[#1B5E3C]">40 – 110ms</div>
                <div className="font-bold text-xs text-[#141311] mt-1">Intent Recognition</div>
                <p className="text-[11px] text-[#5E5850] mt-1">Extracts problem severity, address, and desired service.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${scrubberMs >= 200 ? "bg-[#E7F0EB] border-[#227A4F]/30" : "bg-[#FAF8F5] border-[#EAE5DC] opacity-40"}`}>
                <div className="font-mono text-xs font-bold text-[#1B5E3C]">110 – 200ms</div>
                <div className="font-bold text-xs text-[#141311] mt-1">Schedule & Policy Lock</div>
                <p className="text-[11px] text-[#5E5850] mt-1">Checks operating calendar and clamps diagnostic fees.</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${scrubberMs >= 280 ? "bg-[#E7F0EB] border-[#227A4F]/30" : "bg-[#FAF8F5] border-[#EAE5DC] opacity-40"}`}>
                <div className="font-mono text-xs font-bold text-[#1B5E3C]">200 – 280ms</div>
                <div className="font-bold text-xs text-[#141311] mt-1">Warm Voice Playout</div>
                <p className="text-[11px] text-[#5E5850] mt-1">First audio packet plays. Caller hears immediate, natural reply.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE NEVER-DO GUARDRAIL VAULT */}
      <section className="py-24 px-6 md:px-12 border-b border-[#E6E2DC] bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.025em] text-[#141311]">
              Your Business. Your Rules.
            </h2>
            <p className="text-[#5E5850] text-sm mt-2">
              Business owners fear AI saying the wrong thing. Vaani has hard-coded guardrails that cannot be bypassed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="w-9 h-9 rounded-xl bg-[#E7F0EB] text-[#1B5E3C] flex items-center justify-center font-bold text-sm mb-4">
                ✓
              </div>
              <h3 className="font-bold text-sm text-[#141311] mb-1.5">No Made-Up Pricing</h3>
              <p className="text-xs text-[#5E5850] leading-relaxed">
                Maya will quote your standard diagnostic fee ($79, $89), but is strictly forbidden from guessing total repair or installation costs over the phone without in-person inspection.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="w-9 h-9 rounded-xl bg-[#E7F0EB] text-[#1B5E3C] flex items-center justify-center font-bold text-sm mb-4">
                ✓
              </div>
              <h3 className="font-bold text-sm text-[#141311] mb-1.5">No Off-Hours Booking</h3>
              <p className="text-xs text-[#5E5850] leading-relaxed">
                She respects your operating schedule. If a caller asks for Sunday midnight, she offers Monday morning priority or quotes your emergency weekend surcharge.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="w-9 h-9 rounded-xl bg-[#E7F0EB] text-[#1B5E3C] flex items-center justify-center font-bold text-sm mb-4">
                ✓
              </div>
              <h3 className="font-bold text-sm text-[#141311] mb-1.5">Instant Hazard Escalation</h3>
              <p className="text-xs text-[#5E5850] leading-relaxed">
                Critical hazards like gas leaks, sparking breakers, or structural water bursts skip standard scheduling and trigger an immediate emergency transfer to the on-call technician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REVENUE RECOVERY CALCULATOR */}
      <section className="py-24 px-6 md:px-12 border-b border-[#E6E2DC] bg-[#F6F4F0]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.025em] text-[#141311]">
              The Revenue You Lose to Voicemail
            </h2>
            <p className="text-[#5E5850] text-sm mt-2">
              Every unanswered call is a customer with an active credit card dialing the next company down the street.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#DCD6CC] p-8 md:p-12 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7 space-y-7">
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-[#141311] mb-2">
                  <span>Missed Calls Each Week</span>
                  <span className="font-mono text-[#1B5E3C] text-base font-bold">{weeklyMissed} calls</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="50"
                  value={weeklyMissed}
                  onChange={(e) => setWeeklyMissed(Number(e.target.value))}
                  className="w-full accent-[#1B5E3C] h-2 bg-[#F2EFE9] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#8C857B] mt-1">
                  <span>4 calls</span>
                  <span>50 calls</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-bold text-[#141311] mb-2">
                  <span>Average Ticket / Service Revenue</span>
                  <span className="font-mono text-[#1B5E3C] text-base font-bold">${avgTicket}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2500"
                  step="50"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full accent-[#1B5E3C] h-2 bg-[#F2EFE9] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#8C857B] mt-1">
                  <span>$200</span>
                  <span>$2,500</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 text-center p-8 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DC]">
              <div className="text-xs uppercase font-mono text-[#8C857B] font-bold tracking-wider mb-1">
                Recoverable Annual Jobs
              </div>
              <div className="font-display text-4xl sm:text-5xl font-extrabold text-[#1B5E3C] tracking-tight my-2">
                ${annualRecoverable.toLocaleString()}
              </div>
              <div className="text-xs text-[#5E5850]">
                ${monthlyRecoverable.toLocaleString()} per month in preserved revenue
              </div>

              <button
                onClick={onLaunchStudio}
                style={{ color: "#ffffff", backgroundColor: "#1B5E3C" }}
                className="mt-6 w-full py-3.5 rounded-full hover:bg-[#164D31] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1B5E3C]/20"
              >
                Set Up Your Front Desk <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PHYSICAL CLOSING DOCK & CTA */}
      <section className="py-28 px-6 md:px-12 bg-white text-center border-b border-[#E6E2DC]">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-[#141311]">
            Stop Losing Jobs to Empty Rings.
          </h2>
          <p className="mt-5 text-base text-[#5E5850] leading-relaxed">
            Give your business a front desk that answers on ring one, books jobs with calendar precision, and never takes a day off.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={onLaunchStudio}
              style={{ color: "#ffffff", backgroundColor: "#141311" }}
              className="px-8 py-4 rounded-full hover:bg-[#2C2A26] font-semibold text-base tracking-normal transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              Open Configurator Studio <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Clean Footer */}
      <footer className="py-8 px-6 md:px-12 bg-[#F6F4F0] text-xs text-[#7A746C]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#1B5E3C] text-white flex items-center justify-center font-bold text-[10px]">
              V
            </div>
            <span className="font-bold text-[#141311]">VAANI</span>
            <span>— Autonomous 24/7 Inbound Dispatch for Local Business</span>
          </div>
          <div className="font-mono text-[11px]">
            Zero-Egress Private Architecture · Calendar Connected
          </div>
        </div>
      </footer>
    </div>
  );
};
