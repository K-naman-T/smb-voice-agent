import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Copy, Cpu, Download, Gauge, Headphones, Layers, LayoutDashboard, Menu,
  MessageSquareText, Mic, MicOff, MoreHorizontal, Pause, Phone, PhoneCall, PhoneOff,
  Play, Plus, Radio, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles,
  Volume2, X, Zap,
} from "lucide-react";
import { HolyWhiteVoiceOrb } from "../voice/HolyWhiteVoiceOrb";
import { useVoiceCall, CallLogEntry, PresetContext, ActiveBackendSession } from "../voice/useVoiceCall";

type NavKey = "overview" | "agent" | "calls";
type EditorTab = "prompt" | "voice" | "engine" | "knowledge" | "rules";

const PRESETS: PresetContext[] = [
  {
    id: "hvac", label: "HVAC service", business: "CoolAir Services",
    phone: "+91 98765 43210", hours: "8:00 AM–8:00 PM, Mon–Sat",
    greeting: "Namaste! You’ve reached CoolAir Services. I’m Svara. How can I help with your AC today?",
    voice: "Svara · Warm & expressive",
    services: [{ name: "AC inspection", price: "₹500" }, { name: "Deep foam cleaning", price: "₹1,200" }, { name: "Gas refill", price: "₹2,400" }],
    rules: ["Never book outside operating hours", "Never quote repair cost before inspection", "Escalate electrical hazards"],
  },
  {
    id: "plumbing", label: "Plumbing", business: "QuickFix Plumbing",
    phone: "+91 98123 45678", hours: "7:00 AM–9:00 PM, every day",
    greeting: "Hello, you’ve reached QuickFix Plumbing. Is this an active leak or can I help schedule a visit?",
    voice: "Aakash · Calm & direct",
    services: [{ name: "Leak inspection", price: "₹450" }, { name: "Drain cleaning", price: "₹750" }, { name: "Water heater service", price: "₹1,400" }],
    rules: ["Escalate burst water mains", "Never advise touching hot pressure lines", "Confirm address before dispatch"],
  },
  {
    id: "electric", label: "Electrical", business: "BrightSpark Electric",
    phone: "+91 98345 67890", hours: "8:00 AM–7:00 PM, Mon–Sat",
    greeting: "Namaste, BrightSpark Electric here. I can arrange an electrician or answer a service question.",
    voice: "Svara · Clear & polite",
    services: [{ name: "Fault inspection", price: "₹400" }, { name: "Short detection", price: "₹850" }, { name: "Switchboard fitting", price: "₹350/point" }],
    rules: ["Never give live-wire instructions", "Escalate smoke or sparking immediately", "No whole-home quotes by phone"],
  },
];

const INITIAL_CALLS: CallLogEntry[] = [
  { caller: "Amit Sharma", phone: "+91 98201 12345", time: "10:41 AM", duration: "1m 34s", outcome: "Appointment booked", tone: "positive" },
  { caller: "Priya Mehta", phone: "+91 98450 99821", time: "9:18 AM", duration: "2m 04s", outcome: "Pricing shared", tone: "neutral" },
  { caller: "Vikram Singh", phone: "+91 97110 44521", time: "Yesterday", duration: "45s", outcome: "Morning slot offered", tone: "neutral" },
  { caller: "Sunita Rao", phone: "+91 99001 22334", time: "Yesterday", duration: "1m 52s", outcome: "Transferred to owner", tone: "positive" },
];

interface ModelItem {
  id: string;
  name: string;
  kind: "llm" | "stt" | "tts" | "s2s";
  tag: string;
  vramMb: number;
  latencyStr: string;
  desc: string;
  recommended?: boolean;
}

interface StackPreset {
  id: string;
  title: string;
  tag: string;
  arch: "cascaded" | "full_duplex";
  llm: string;
  stt: string;
  tts: string;
  vramStr: string;
  latencyStr: string;
  desc: string;
}

const ENGINE_STACK_PRESETS: StackPreset[] = [
  {
    id: "stack_agentic_moe",
    title: "2026 Agentic MoE",
    tag: "Deep Tool Loops",
    arch: "cascaded",
    llm: "llm.qwen3_8.flash_next",
    stt: "stt.sensevoice",
    tts: "tts.kokoro.en",
    vramStr: "5.0 GB",
    latencyStr: "280ms",
    desc: "125B/6B active MoE with Gated DeltaNet attention, autonomous retry loops, and sub-30ms TTFT.",
  },
  {
    id: "stack_personaplex",
    title: "NVIDIA PersonaPlex-7B",
    tag: "Full-Duplex S2S",
    arch: "full_duplex",
    llm: "s2s.nvidia.personaplex",
    stt: "s2s.nvidia.personaplex",
    tts: "s2s.nvidia.personaplex",
    vramStr: "4.8 GB",
    latencyStr: "170ms",
    desc: "NVIDIA unified speech-to-speech foundation model with simultaneous listening and talking.",
  },
  {
    id: "stack_deterministic_booking",
    title: "Deterministic Booking Pro",
    tag: "BFCL #1",
    arch: "cascaded",
    llm: "llm.qwen2_5.coder_7b",
    stt: "stt.moonshine",
    tts: "tts.kokoro.en",
    vramStr: "5.1 GB",
    latencyStr: "320ms",
    desc: "Zero-error JSON slot filling, strict transactional state machine, and Kokoro studio naturalness.",
  },
  {
    id: "stack_expressive_human",
    title: "Expressive Concierge",
    tag: "Acoustic Tags",
    arch: "cascaded",
    llm: "llm.chomp.fast",
    stt: "stt.sensevoice",
    tts: "tts.chatterbox.turbo",
    vramStr: "3.6 GB",
    latencyStr: "340ms",
    desc: "Injects paralinguistic tags ([laugh], [sigh], [pause]) and detects caller emotion in real time.",
  },
  {
    id: "stack_high_concurrency",
    title: "Multi-Line Edge (8GB VRAM)",
    tag: "3+ Phone Lines",
    arch: "cascaded",
    llm: "llm.vibethinker.3b",
    stt: "stt.moonshine",
    tts: "tts.kokoro.en",
    vramStr: "2.4 GB",
    latencyStr: "260ms",
    desc: "Sub-25ms TTFT edge model for high-concurrency agency telephony on a single RTX 4060.",
  },
];

export interface HardwareProfileItem {
  id: string;
  name: string;
  shortName: string;
  vramGb: number;
  platform: string;
  concurrency: number;
  engine: string;
  tag: string;
  isPublicDemoDefault?: boolean;
}

const HARDWARE_PROFILES: HardwareProfileItem[] = [
  {
    id: "cloud_l4_24gb",
    name: "Public Cloud Demo (NVIDIA L4 / A10G — 24GB)",
    shortName: "Cloud Demo (24GB)",
    vramGb: 24.0,
    platform: "AWS G5 / RunPod / Modal Cloud GPU",
    concurrency: 12,
    engine: "vLLM PagedAttention + CUDA 13.2",
    tag: "Public Demo Tier",
    isPublicDemoDefault: true,
  },
  {
    id: "edge_rtx4060_8gb",
    name: "Self-Hosted SMB Edge Box (RTX 4060 — 8GB)",
    shortName: "SMB Edge (8GB)",
    vramGb: 8.0,
    platform: "On-Prem Dedicated Workstation (chomp)",
    concurrency: 2,
    engine: "llama.cpp GPU Offload (CUDA)",
    tag: "On-Premises Private",
  },
  {
    id: "apple_silicon_36gb",
    name: "Apple Silicon Studio (M-Series Unified — 36GB)",
    shortName: "Mac Studio (36GB)",
    vramGb: 36.0,
    platform: "Mac Studio / Mac Mini M2/M3/M4 Pro",
    concurrency: 16,
    engine: "Apple Metal / MLX Engine",
    tag: "Office Desktop Server",
  },
  {
    id: "client_webgpu",
    name: "In-Browser Client Sandbox (WebGPU / WASM)",
    shortName: "WebGPU Browser",
    vramGb: 0.0,
    platform: "Client Browser (Zero Server GPU Cost)",
    concurrency: 999,
    engine: "Web Audio + Web Speech API + WebGPU",
    tag: "Zero-Cost Public Preview",
  },
  {
    id: "enterprise_h100_80gb",
    name: "Enterprise Cluster (NVIDIA H100 / A100 — 80GB)",
    shortName: "Data Center (80GB)",
    vramGb: 80.0,
    platform: "Enterprise High-Density PBX Cluster",
    concurrency: 48,
    engine: "TensorRT-LLM + Triton Server",
    tag: "High Density Fleet",
  },
];

const AVAILABLE_LLMS: ModelItem[] = [
  { id: "llm.qwen3_8.flash_next", name: "Qwen 3.8 Flash-Next MoE (6B Active)", kind: "llm", tag: "Late Aug 2026", vramMb: 4600, latencyStr: "<30ms TTFT", desc: "Hybrid Gated DeltaNet attention for zero-lag deep tool loops.", recommended: true },
  { id: "llm.qwen2_5.coder_7b", name: "Qwen 2.5-Coder 7B Instruct", kind: "llm", tag: "BFCL #1", vramMb: 4800, latencyStr: "~40ms TTFT", desc: "Top Berkeley Function Calling benchmark; zero schema errors.", recommended: true },
  { id: "llm.muse.glimmer", name: "Meta Muse Glimmer 30B", kind: "llm", tag: "Superintelligence", vramMb: 14500, latencyStr: "~90ms TTFT", desc: "Meta's flagship local agent model with autonomous failure recovery." },
  { id: "llm.chomp.fast", name: "Qwen 3.5 9B Chat (Default)", kind: "llm", tag: "Workhorse", vramMb: 4200, latencyStr: "~45ms TTFT", desc: "Default local profile for chomp; strong general reasoning." },
  { id: "llm.vibethinker.3b", name: "VibeThinker 3B Edge", kind: "llm", tag: "Edge Concurrency", vramMb: 2100, latencyStr: "<25ms TTFT", desc: "Ultra-compact agent model enabling 3+ concurrent phone lines." },
];

const AVAILABLE_STTS: ModelItem[] = [
  { id: "stt.sensevoice", name: "SenseVoice-Small (Alibaba FunASR)", kind: "stt", tag: "Emotion Aware", vramMb: 400, latencyStr: "<50ms", desc: "Sub-50ms ASR with caller emotion detection (<happy>, <angry>).", recommended: true },
  { id: "stt.moonshine", name: "Moonshine Edge ASR (Useful Sensors)", kind: "stt", tag: "Variable Length", vramMb: 350, latencyStr: "<40ms", desc: "Variable-length input; 5x faster on short turn-taking phrases.", recommended: true },
  { id: "stt.whisper.turbo", name: "Whisper Large-v3-Turbo (809M)", kind: "stt", tag: "Accurate", vramMb: 2200, latencyStr: "~80ms", desc: "OpenAI distilled turbo ASR; superior accuracy on noisy phone audio." },
  { id: "stt.whisper.small", name: "Faster-Whisper Small (Baseline)", kind: "stt", tag: "Standard", vramMb: 900, latencyStr: "~100ms", desc: "Standard baseline CTranslate2 transcription." },
];

const AVAILABLE_TTSS: ModelItem[] = [
  { id: "tts.sarvam.bulbul_v3", name: "Sarvam AI Bulbul V3/V4", kind: "tts", tag: "Late 2026 Flagship", vramMb: 0, latencyStr: "<250ms", desc: "48kHz full-band studio audio, 11 Indian languages, 35+ voices, native Hinglish code-switching.", recommended: true },
  { id: "tts.bodhan.indic23", name: "Bodhan AI / AI4Bharat (IIT Madras)", kind: "tts", tag: "Sep 2026 Open Weights", vramMb: 1800, latencyStr: "~180ms", desc: "Digital Public Good by IIT Madras & Ministry of Ed. 23 Indian languages, trained on NVIDIA NeMo.", recommended: true },
  { id: "tts.svara.3b", name: "Svara-TTS 3B (Kenpath)", kind: "tts", tag: "Emotional SOTA", vramMb: 2400, latencyStr: "~220ms", desc: "3B parameter expressive Indic model supporting 19 languages with <happy>, <sad> emotion tokens.", recommended: true },
  { id: "tts.hinglish.indicf5", name: "Hinglish-TTS (IndicF5 + IndicXlit)", kind: "tts", tag: "Flow Matching", vramMb: 1400, latencyStr: "~200ms", desc: "AI4Bharat IndicF5 architecture + transliteration layer for seamless Roman/Devanagari mixing.", recommended: true },
  { id: "tts.kokoro.en", name: "Kokoro-82M Studio Voice", kind: "tts", tag: "English SOTA", vramMb: 0, latencyStr: "Instant", desc: "82M params, Apache 2.0, studio-grade prosody on CPU. Fixes robotic inflection for English.", recommended: true },
  { id: "tts.chatterbox.turbo", name: "Chatterbox-Turbo (Resemble AI)", kind: "tts", tag: "Paralinguistic", vramMb: 800, latencyStr: "<200ms", desc: "Conversational TTS with [laugh], [sigh], and [pause] tags." },
  { id: "tts.piper.hi_priyamvada", name: "Piper Neural Pooja (CPU Fallback)", kind: "tts", tag: "Edge Fallback", vramMb: 0, latencyStr: "~60ms", desc: "Lightweight VITS fallback on CPU when zero cloud or zero GPU VRAM is available." },
];

export interface VoicePersona {
  id: string;
  name: string;
  lang: "hi" | "en-in" | "en-gb" | "en-us";
  langLabel: string;
  accent: string;
  gender: "Female" | "Male";
  tone: string;
  engine: string;
  ttsModelId: string;
  previewUrl: string;
  recommendedFor: string;
  badge?: string;
  badgeType?: "s2s" | "lang" | "normal";
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: "svara_hindi",
    name: "Svara (स्वरा)",
    lang: "hi",
    langLabel: "Hindi & Hinglish (हिंदी)",
    accent: "Modern Expressive Hindi",
    gender: "Female",
    tone: "Emotional, natural cadence & warm breathing (<happy>)",
    engine: "Svara-TTS v1 3B (Kenpath Orpheus)",
    ttsModelId: "tts.svara.3b",
    previewUrl: "/voices/preview_svara_hindi.mp3",
    recommendedFor: "Human-grade Conversational Concierge & SMB Support",
    badge: "3B Discrete Audio",
    badgeType: "lang",
  },
  {
    id: "f5_hindi",
    name: "Aakash (F5-Hindi)",
    lang: "hi",
    langLabel: "Hindi & Hinglish (हिंदी)",
    accent: "Flow-Matching 24kHz Studio",
    gender: "Male",
    tone: "Rich acoustics, natural pitch drift & fluid phrasing",
    engine: "F5-TTS Hindi 24kHz (Flow Matching)",
    ttsModelId: "tts.hinglish.indicf5",
    previewUrl: "/voices/preview_f5_hindi.mp3",
    recommendedFor: "Dispatch, Technical Support & Mixed Hinglish",
    badge: "Flow Matching SOTA",
    badgeType: "lang",
  },
  {
    id: "pooja_hindi",
    name: "Pooja (पूजा)",
    lang: "hi",
    langLabel: "Hindi & Hinglish (हिंदी)",
    accent: "North Indian Metro / Delhi",
    gender: "Female",
    tone: "Warm, conversational & natural Hinglish",
    engine: "Piper Neural / Sarvam Indic (hi_IN)",
    ttsModelId: "tts.piper.hi_priyamvada",
    previewUrl: "/voices/preview_hindi_female.mp3",
    recommendedFor: "Clinics, HVAC & Home Services across India",
    badge: "Popular in India",
    badgeType: "lang",
  },
  {
    id: "arjun_hindi",
    name: "Arjun (अर्जुन)",
    lang: "hi",
    langLabel: "Hindi & Hinglish (हिंदी)",
    accent: "Neutral Hindi / Indian English",
    gender: "Male",
    tone: "Authoritative, calm & clear",
    engine: "Piper Neural / Sarvam Indic (hi_IN)",
    ttsModelId: "tts.piper.hi_pratham",
    previewUrl: "/voices/preview_hindi_male.mp3",
    recommendedFor: "Plumbing, Field Dispatch & Logistics",
    badge: "Direct & Clear",
    badgeType: "lang",
  },
  {
    id: "ananya_en_in",
    name: "Ananya",
    lang: "en-in",
    langLabel: "Indian English (en-IN)",
    accent: "Pan-India Urban Professional",
    gender: "Female",
    tone: "Articulate, corporate & polished",
    engine: "Kokoro-82M / Sarvam Saaras",
    ttsModelId: "tts.kokoro.en",
    previewUrl: "/voices/preview_hindi_female.mp3",
    recommendedFor: "B2B SaaS, Legal Concierge & Consulting",
    badge: "Corporate SOTA",
    badgeType: "normal",
  },
  {
    id: "maya_us",
    name: "Maya",
    lang: "en-us",
    langLabel: "US English (en-US)",
    accent: "General American Neutral",
    gender: "Female",
    tone: "Friendly, upbeat & studio crisp",
    engine: "Kokoro-82M (0 MB GPU VRAM)",
    ttsModelId: "tts.kokoro.en",
    previewUrl: "/voices/preview_us_female.mp3",
    recommendedFor: "US Small Businesses, Dentists & Salons",
    badge: "Zero-VRAM Studio",
    badgeType: "normal",
  },
  {
    id: "david_us",
    name: "David",
    lang: "en-us",
    langLabel: "US English (en-US)",
    accent: "American Casual Direct",
    gender: "Male",
    tone: "Confident, conversational & grounded",
    engine: "Piper ONNX (Ryan)",
    ttsModelId: "tts.piper.en_ryan",
    previewUrl: "/voices/preview_us_male.mp3",
    recommendedFor: "Towing, Auto Repair & HVAC Emergency",
    badge: "High Energy",
    badgeType: "normal",
  },
  {
    id: "oliver_gb",
    name: "Oliver",
    lang: "en-gb",
    langLabel: "British English (en-GB)",
    accent: "Received Pronunciation (London RP)",
    gender: "Male",
    tone: "Refined, courteous & calm",
    engine: "Piper ONNX (Alan)",
    ttsModelId: "tts.piper.en_alan",
    previewUrl: "/voices/preview_british_male.mp3",
    recommendedFor: "Luxury Spas, Boutique Hotels & Finance",
    badge: "British RP",
    badgeType: "normal",
  },
  {
    id: "personaplex_s2s",
    name: "PersonaPlex NATF0",
    lang: "en-us",
    langLabel: "Speech-to-Speech (S2S)",
    accent: "Conversational Adaptive",
    gender: "Female",
    tone: "Full-duplex unified acoustic token modeling",
    engine: "NVIDIA PersonaPlex-7B (CUDA)",
    ttsModelId: "s2s.nvidia.personaplex",
    previewUrl: "/personaplex_sample.mp3",
    recommendedFor: "Zero-Cascade Banter & Public Interactive Demos",
    badge: "Next-Gen S2S",
    badgeType: "s2s",
  },
];

interface LinearVoiceStudioProps {
  onExitStudio?: () => void;
}

export const LinearVoiceStudio: React.FC<LinearVoiceStudioProps> = ({ onExitStudio }) => {
  const [activeNav, setActiveNav] = useState<NavKey>("overview");
  const [editorTab, setEditorTab] = useState<EditorTab>("prompt");
  const [presetId, setPresetId] = useState("hvac");
  const [mobileNav, setMobileNav] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(true);
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>(INITIAL_CALLS);
  const [backendSession, setBackendSession] = useState<ActiveBackendSession | undefined>();
  const [realBookingsCount, setRealBookingsCount] = useState<number | null>(null);

  const preset = useMemo(() => PRESETS.find((item) => item.id === presetId) || PRESETS[0], [presetId]);
  const [greeting, setGreeting] = useState(preset.greeting);
  const endRef = useRef<HTMLDivElement>(null);

  // Model & Engine Configuration State (Ultimate Configurator)
  const [selectedHardwareProfile, setSelectedHardwareProfile] = useState("cloud_l4_24gb");
  const [isPublicDemoMode, setIsPublicDemoMode] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployModalTab, setDeployModalTab] = useState<"docker" | "apple" | "embed">("docker");
  const [copiedDeployCode, setCopiedDeployCode] = useState(false);

  const [selectedPresetStack, setSelectedPresetStack] = useState("stack_agentic_moe");
  const [archMode, setArchMode] = useState<"cascaded" | "full_duplex">("cascaded");
  const [selectedLlm, setSelectedLlm] = useState("llm.qwen3_8.flash_next");
  const [selectedStt, setSelectedStt] = useState("stt.sensevoice");
  const [selectedTts, setSelectedTts] = useState("tts.svara.3b");
  const [failureRecovery, setFailureRecovery] = useState(true);
  const [paralinguisticTags, setParalinguisticTags] = useState(true);
  const [emotionSensing, setEmotionSensing] = useState(true);

  // Voice Persona & Accent Studio State (ElevenLabs / Sarvam Parity)
  const [selectedVoicePersonaId, setSelectedVoicePersonaId] = useState("svara_hindi");
  const [voiceLangFilter, setVoiceLangFilter] = useState<"all" | "hi" | "en-in" | "en-gb" | "en-us">("all");
  const [previewPlayingVoiceId, setPreviewPlayingVoiceId] = useState<string | null>(null);
  const [voiceStability, setVoiceStability] = useState(78);
  const [speakingPace, setSpeakingPace] = useState(1.0);
  const [hinglishCodeSwitching, setHinglishCodeSwitching] = useState(true);
  const [callerEmotionPacing, setCallerEmotionPacing] = useState(true);
  const [ttsProvider, setTtsProvider] = useState<"sarvam" | "elevenlabs" | "kokoro" | "piper">("sarvam");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    const onEnded = () => setPreviewPlayingVoiceId(null);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  const toggleVoicePreview = (voice: VoicePersona, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewPlayingVoiceId === voice.id) {
      previewAudioRef.current?.pause();
      setPreviewPlayingVoiceId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = voice.previewUrl;
        previewAudioRef.current.play().then(() => setPreviewPlayingVoiceId(voice.id)).catch(() => {});
      }
    }
  };

  const onSelectVoicePersona = (voice: VoicePersona) => {
    setSelectedVoicePersonaId(voice.id);
    setSelectedTts(voice.ttsModelId);
    if (voice.ttsModelId === "s2s.nvidia.personaplex") {
      setArchMode("full_duplex");
      setSelectedLlm("s2s.nvidia.personaplex");
    } else {
      setArchMode("cascaded");
      if (selectedLlm === "s2s.nvidia.personaplex") {
        setSelectedLlm("llm.qwen3_8.flash_next");
      }
    }
    setSaved(false);
  };

  const activeProfile = useMemo(
    () => HARDWARE_PROFILES.find((p) => p.id === selectedHardwareProfile) || HARDWARE_PROFILES[0],
    [selectedHardwareProfile]
  );

  const applyPresetStack = (p: StackPreset) => {
    setSelectedPresetStack(p.id);
    setArchMode(p.arch);
    setSelectedLlm(p.llm);
    setSelectedStt(p.stt);
    setSelectedTts(p.tts);
    setSaved(false);
  };

  // Dynamic Telemetry Metrics
  const calculatedVram = useMemo(() => {
    if (archMode === "full_duplex") return "4.8";
    const llm = AVAILABLE_LLMS.find((m) => m.id === selectedLlm)?.vramMb || 4200;
    const stt = AVAILABLE_STTS.find((m) => m.id === selectedStt)?.vramMb || 400;
    const tts = AVAILABLE_TTSS.find((m) => m.id === selectedTts)?.vramMb || 0;
    return ((llm + stt + tts) / 1024).toFixed(1);
  }, [archMode, selectedLlm, selectedStt, selectedTts]);

  const vramPercent = useMemo(() => {
    if (activeProfile.vramGb === 0) return 0;
    const used = parseFloat(calculatedVram);
    return Math.min(100, Math.round((used / activeProfile.vramGb) * 100));
  }, [activeProfile, calculatedVram]);

  const calculatedConcurrency = useMemo(() => {
    if (activeProfile.vramGb === 0) return "Unlimited";
    const used = parseFloat(calculatedVram);
    const remaining = activeProfile.vramGb - used;
    if (remaining < 0.3) return "1 Line";
    const concurrent = Math.max(1, Math.min(activeProfile.concurrency, Math.floor(remaining / 0.5) + 1));
    return `${concurrent} Lines`;
  }, [activeProfile, calculatedVram]);

  const calculatedTtft = useMemo(() => {
    if (archMode === "full_duplex") return "170ms (Audio S2S)";
    return AVAILABLE_LLMS.find((m) => m.id === selectedLlm)?.latencyStr || "~45ms TTFT";
  }, [archMode, selectedLlm]);

  const calculatedTurnLatency = useMemo(() => {
    if (archMode === "full_duplex") return "~170ms";
    const presetStack = ENGINE_STACK_PRESETS.find((p) => p.id === selectedPresetStack);
    return presetStack?.latencyStr || "~290ms";
  }, [archMode, selectedPresetStack]);

  useEffect(() => {
    setGreeting(preset.greeting);
    setSaved(true);
  }, [preset]);

  // Load real active session & calls from backend API
  useEffect(() => {
    fetch("/api/v1/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((sess) => {
        if (!sess) return;
        setBackendSession({
          tenantId: sess.tenant_id,
          agentId: sess.agent_id,
          versionId: sess.version_id,
          apiKey: sess.api_key,
        });

        // Query real calls from backend DB
        fetch("/api/v1/calls", {
          headers: { Authorization: `Bearer ${sess.api_key}` },
        })
          .then((r) => (r.ok ? r.json() : []))
          .then((dbCalls: Array<{ id: string; caller_phone: string; started_at: string; ended_at: string | null; status: string }>) => {
            if (Array.isArray(dbCalls) && dbCalls.length > 0) {
              const mapped: CallLogEntry[] = dbCalls.map((c) => {
                let outcome = "Inquiry resolved";
                let tone: "positive" | "neutral" | "urgent" = "neutral";
                if (c.status === "appointment_booked") {
                  outcome = "Appointment booked";
                  tone = "positive";
                } else if (c.status === "emergency_escalated") {
                  outcome = "Transferred to emergency on-call";
                  tone = "urgent";
                } else if (c.status === "inquiry_resolved") {
                  outcome = "Pricing & service catalog shared";
                  tone = "neutral";
                }

                const d = new Date(c.started_at);
                const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                let durStr = "0m 45s";
                if (c.ended_at) {
                  const diffSec = Math.max(1, Math.round((new Date(c.ended_at).getTime() - d.getTime()) / 1000));
                  durStr = diffSec >= 60 ? `${Math.floor(diffSec / 60)}m ${diffSec % 60}s` : `0m ${diffSec}s`;
                }

                return {
                  id: c.id,
                  caller: c.caller_phone ? `Caller (${c.caller_phone})` : "Customer",
                  phone: c.caller_phone || "+91 98200 45678",
                  time: timeStr,
                  duration: durStr,
                  outcome,
                  tone,
                };
              });
              setCallHistory(mapped);
            }
          })
          .catch(() => {});

        // Query real booked appointments
        fetch("/api/v1/appointments", {
          headers: { Authorization: `Bearer ${sess.api_key}` },
        })
          .then((r) => (r.ok ? r.json() : []))
          .then((apts: any[]) => {
            if (Array.isArray(apts)) {
              setRealBookingsCount(apts.length);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const onCallCompleted = (entry: CallLogEntry) => {
    setCallHistory((prev) => [entry, ...prev]);
  };

  // Full-featured Real Voice Call Hook (Web Audio, SpeechRecognition, SpeechSynthesis, Barge-in, chomp LLM)
  const {
    callState,
    agentState,
    formatDuration,
    turns,
    interimText,
    audioLevel,
    isMuted,
    micError,
    startCall,
    endCall,
    toggleMute,
    sendTurn,
  } = useVoiceCall(preset, onCallCompleted, backendSession);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, interimText]);

  const copyPhone = async () => {
    await navigator.clipboard?.writeText(preset.phone);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const navigate = (key: NavKey) => {
    setActiveNav(key);
    setMobileNav(false);
  };

  const bookingsCount = useMemo(() => {
    if (realBookingsCount !== null && realBookingsCount > 0) return realBookingsCount;
    return callHistory.filter((c) => /book|appointment|reserved/i.test(c.outcome)).length;
  }, [callHistory, realBookingsCount]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div>
          <div className="brand-row">
            <div className="brand-mark"><span /><span /><span /></div>
            <span className="brand-name">OFY</span>
            {onExitStudio && (
              <button
                className="exit-link-btn"
                onClick={onExitStudio}
                title="Return to website"
              >
                ← Website
              </button>
            )}
            <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
          <button className="workspace-switcher">
            <span className="workspace-avatar">CA</span>
            <span><strong>{preset.business}</strong><small>Production workspace</small></span>
            <ChevronDown size={14} />
          </button>
          <nav className="primary-nav" aria-label="Main navigation">
            <p className="nav-label">Workspace</p>
            <button className={activeNav === "overview" ? "active" : ""} onClick={() => navigate("overview")}>
              <LayoutDashboard size={17} />Overview
            </button>
            <button className={activeNav === "agent" ? "active" : ""} onClick={() => navigate("agent")}>
              <Sparkles size={17} />Agent setup
            </button>
            <button className={activeNav === "calls" ? "active" : ""} onClick={() => navigate("calls")}>
              <PhoneCall size={17} />Calls<span className="nav-count">{callHistory.length}</span>
            </button>
            <p className="nav-label nav-label--second">Manage</p>
            <button className={activeNav === "agent" && editorTab === "engine" ? "active" : ""} onClick={() => { setActiveNav("agent"); setEditorTab("engine"); }}>
              <Cpu size={17} />Model & engine
            </button>
            <button className={activeNav === "agent" && editorTab === "knowledge" ? "active" : ""} onClick={() => { setActiveNav("agent"); setEditorTab("knowledge"); }}>
              <BookOpen size={17} />Knowledge
            </button>
            <button className={activeNav === "agent" && editorTab === "rules" ? "active" : ""} onClick={() => { setActiveNav("agent"); setEditorTab("rules"); }}>
              <ShieldCheck size={17} />Guardrails
            </button>
          </nav>
        </div>
        <div className="sidebar-footer">
          <button><CircleHelp size={17} />Help & documentation</button>
          <button><Settings size={17} />Workspace settings</button>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span><strong>Private by design</strong><small>Inference stays on your server</small></span>
          </div>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>
          <div className="breadcrumbs">
            {onExitStudio && (
              <>
                <button
                  onClick={onExitStudio}
                  style={{ background: "none", border: 0, color: "var(--muted)", cursor: "pointer", fontSize: 13.5, fontWeight: 500, padding: 0 }}
                  title="Return to website"
                >
                  Home
                </button>
                <ChevronRight size={13} />
              </>
            )}
            <span>{preset.business}</span>
            <ChevronRight size={13} />
            <strong>{activeNav === "overview" ? "Overview" : activeNav === "agent" ? "Maya" : "Calls"}</strong>
          </div>
          <div className="topbar-actions">
            <span className="save-state"><span />{saved ? "Saved" : "Unsaved"}</span>
            <button className="button button--quiet" onClick={() => setShowDeployModal(true)}>
              <Download size={15} />Export spec
            </button>
            <button className="button button--dark" onClick={startCall}>
              <Phone size={15} />Test agent
            </button>
          </div>
        </header>

        <div className="page-scroll">
          {activeNav === "overview" && (
            <section className="page page-enter">
              <div className="page-heading">
                <h1>Good afternoon.</h1>
              </div>
              <div className="hero-card">
                <div className="hero-copy">
                  <h2>Maya is answering<br />while you’re working.</h2>
                  <p>Autonomous inbound receptionist for {preset.business}. Greets callers in real time, quotes diagnostic pricing, and books appointments.</p>
                  <div className="phone-line">
                    <Phone size={16} />
                    <strong>{preset.phone}</strong>
                    <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 6 }}>· Live Inbound Line</span>
                    <button onClick={copyPhone} aria-label="Copy number" style={{ marginLeft: 6 }}>
                      {copied ? <Check size={16} color="var(--green)" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
                <div className="hero-voice cursor-pointer" onClick={startCall} aria-label="Agent audio status">
                  <HolyWhiteVoiceOrb
                    state={callState === "live" ? agentState : "idle"}
                    audioLevel={callState === "live" ? audioLevel : 0}
                    size={130}
                  />
                  <p>Maya is ready</p>
                  <span>{preset.voice}</span>
                </div>
              </div>
              <div className="metric-grid">
                <article>
                  <p>Calls answered</p>
                  <strong>{callHistory.length}</strong>
                  <span><b>+18%</b> from last week</span>
                </article>
                <article>
                  <p>Appointments booked</p>
                  <strong>{bookingsCount}</strong>
                  <span>{callHistory.length > 0 ? Math.round((bookingsCount / callHistory.length) * 100) : 0}% booking rate</span>
                </article>
                <article>
                  <p>Time saved</p>
                  <strong>3h 42m</strong>
                  <span>Across the last 7 days</span>
                </article>
                <article>
                  <p>Calls needing you</p>
                  <strong>2</strong>
                  <span>Both transferred safely</span>
                </article>
              </div>

              <div className="content-grid">
                <article className="panel recent-panel">
                  <div className="panel-heading">
                    <h3>Recent calls</h3>
                    <button onClick={() => setActiveNav("calls")}>View all <ArrowUpRight size={14} /></button>
                  </div>
                  <div className="call-list">
                    {callHistory.slice(0, 3).map((call, idx) => (
                      <CallRow key={`${call.phone}-${idx}`} call={call} />
                    ))}
                  </div>
                </article>
                <article className="panel setup-panel">
                  <div className="panel-heading">
                    <h3>Agent readiness</h3>
                  </div>
                  <div className="readiness-score">
                    <div className="score-ring">92<small>%</small></div>
                    <div><strong>Ready for calls</strong></div>
                  </div>
                  {["Business hours", "Services & pricing", "Booking rules"].map((item) => (
                    <div className="check-row" key={item}>
                      <span><Check size={13} /></span>
                      {item}
                      <small>Complete</small>
                    </div>
                  ))}
                  <button className="improve-link" onClick={() => setActiveNav("agent")}>
                    Improve your greeting <ChevronRight size={14} />
                  </button>
                </article>
              </div>
            </section>
          )}

          {activeNav === "agent" && (
            <section className="page page-enter">
              <div className="page-heading agent-heading">
                <h1>Meet Maya.</h1>
                <div className="preset-select">
                  <span>Template</span>
                  <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
                    {PRESETS.map((item) => (
                      <option value={item.id} key={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="agent-layout">
                <article className="panel editor-panel">
                  <div className="editor-tabs">
                    {(["prompt", "voice", "engine", "knowledge", "rules"] as EditorTab[]).map((tab) => (
                      <button
                        key={tab}
                        className={editorTab === tab ? "active" : ""}
                        onClick={() => setEditorTab(tab)}
                      >
                        {tab === "prompt" ? "Greeting" : tab === "voice" ? "Voice" : tab === "engine" ? "Model & engine" : tab === "rules" ? "Guardrails" : "Knowledge"}
                      </button>
                    ))}
                  </div>
                  <div className="editor-content">
                    {editorTab === "prompt" && (
                      <>
                        <div className="section-title">
                          <span className="section-icon"><MessageSquareText size={18} /></span>
                          <h3>Greeting</h3>
                        </div>
                        <textarea
                          id="greeting"
                          value={greeting}
                          onChange={(event) => { setGreeting(event.target.value); setSaved(false); }}
                        />
                        <div className="field-help">
                          <span>{greeting.length} characters · about {Math.max(4, Math.round(greeting.split(" ").length / 2.4))} seconds</span>
                          <button onClick={() => { setGreeting(preset.greeting); setSaved(true); }}>Reset</button>
                        </div>
                        <button className="button button--dark save-button" onClick={() => setSaved(true)}>
                          Save greeting
                        </button>
                      </>
                    )}
                    {editorTab === "voice" && (
                      <>
                        <div className="section-title">
                          <span className="section-icon"><Volume2 size={20} /></span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>Voice Persona & Accent Studio</h3>
                            <small style={{ color: "var(--muted)", fontSize: 13 }}>Configure authentic accents, cadence, and delivery controls for your agent.</small>
                          </div>
                        </div>

                        {/* Hidden audio element for instant voice auditioning */}
                        <audio ref={previewAudioRef} preload="none" />

                        {/* Acoustic Engine Provider Selection */}
                        <div style={{ marginBottom: 18, padding: "16px 20px", borderRadius: 14, border: "1px solid var(--line)", background: "white" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Voice Synthesis Provider</span>
                            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Compare Local Offline vs Cloud Studio</span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => { setTtsProvider("kokoro"); setSaved(false); }}
                              style={{
                                padding: "12px 16px",
                                borderRadius: 10,
                                border: ttsProvider === "kokoro" || ttsProvider === "piper" ? "1.5px solid var(--ink)" : "1px solid var(--line)",
                                background: ttsProvider === "kokoro" || ttsProvider === "piper" ? "#fdfcfb" : "transparent",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Local On-Device Engine (Kokoro & Piper)</strong>
                              <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Private & free · Zero GPU VRAM required · Instant offline execution</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setTtsProvider("sarvam"); setSaved(false); }}
                              style={{
                                padding: "12px 16px",
                                borderRadius: 10,
                                border: ttsProvider === "sarvam" || ttsProvider === "elevenlabs" ? "1.5px solid var(--ink)" : "1px solid var(--line)",
                                background: ttsProvider === "sarvam" || ttsProvider === "elevenlabs" ? "#fdfcfb" : "transparent",
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <strong style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Cloud High-Fidelity (Sarvam AI / ElevenLabs)</strong>
                              <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Studio 44.1kHz speech · Native Hinglish & dialect inflection</span>
                            </button>
                          </div>
                        </div>

                        {/* Language & Accent Filter Bar */}
                        <div className="voice-lang-filter-bar">
                          {[
                            { id: "all", label: "All Accents" },
                            { id: "hi", label: "Hindi & Hinglish (हिंदी)" },
                            { id: "en-in", label: "Indian English (en-IN)" },
                            { id: "en-us", label: "US English (en-US)" },
                            { id: "en-gb", label: "British RP (en-GB)" },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={`voice-filter-chip ${voiceLangFilter === f.id ? "active" : ""}`}
                              onClick={() => setVoiceLangFilter(f.id as any)}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        {/* Voice Persona Cards */}
                        <div className="voice-card-grid">
                          {VOICE_PERSONAS
                            .filter((v) => voiceLangFilter === "all" || v.lang === voiceLangFilter)
                            .map((v) => {
                              const isSelected = selectedVoicePersonaId === v.id;
                              const isPlaying = previewPlayingVoiceId === v.id;
                              return (
                                <div
                                  key={v.id}
                                  className={`voice-card-modern ${isSelected ? "selected" : ""}`}
                                  onClick={() => onSelectVoicePersona(v)}
                                >
                                  <div className="voice-card-top">
                                    <div className="voice-card-meta">
                                      <span className="voice-name-title">{v.name}</span>
                                      <span className="voice-badge-tag">{v.accent}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <button
                                        type="button"
                                        className={`voice-preview-btn ${isPlaying ? "playing" : ""}`}
                                        onClick={(e) => toggleVoicePreview(v, e)}
                                        title="Audition voice sample"
                                      >
                                        {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                                        <span>{isPlaying ? "Playing" : "Preview"}</span>
                                      </button>
                                      {isSelected && <Check size={16} color="var(--ink)" />}
                                    </div>
                                  </div>
                                  <div className="voice-desc-row">
                                    <span>{v.tone} · <i>{v.engine}</i></span>
                                    <span>{v.recommendedFor}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Advanced Delivery Controls (ElevenLabs / Sarvam Parity) */}
                        <div className="delivery-controls-box">
                          <h4>
                            <SlidersHorizontal size={14} color="var(--ink)" />
                            Delivery & Prosody Controls (ElevenLabs & Sarvam Parity)
                          </h4>

                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <label>Speaking Pace</label>
                              <strong>{speakingPace.toFixed(2)}x · {speakingPace < 0.95 ? "Deliberate" : speakingPace > 1.1 ? "Brisk" : "Natural"}</strong>
                            </div>
                            <input
                              type="range"
                              min="75"
                              max="135"
                              value={Math.round(speakingPace * 100)}
                              onChange={(e) => { setSpeakingPace(Number(e.target.value) / 100); setSaved(false); }}
                              className="range"
                            />
                          </div>

                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <label>Stability & Consistency</label>
                              <strong>{voiceStability}% · {voiceStability > 80 ? "Strict Scripted" : "Natural Expressive"}</strong>
                            </div>
                            <input
                              type="range"
                              min="30"
                              max="100"
                              value={voiceStability}
                              onChange={(e) => { setVoiceStability(Number(e.target.value)); setSaved(false); }}
                              className="range"
                            />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                            <div>
                              <strong style={{ fontSize: 13.5, display: "block", color: "var(--ink)" }}>Hinglish Code-Switching Mode</strong>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Preserves crisp English pronunciation for technical terms in Hindi sentences</span>
                            </div>
                            <button
                              type="button"
                              className={`toggle-switch ${hinglishCodeSwitching ? "on" : ""}`}
                              onClick={() => { setHinglishCodeSwitching(!hinglishCodeSwitching); setSaved(false); }}
                            >
                              <div className="toggle-handle" />
                            </button>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: 13.5, display: "block", color: "var(--ink)" }}>Adaptive Sentiment Pacing</strong>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Softens vocal tone and introduces soothing fillers if caller sounds distressed</span>
                            </div>
                            <button
                              type="button"
                              className={`toggle-switch ${callerEmotionPacing ? "on" : ""}`}
                              onClick={() => { setCallerEmotionPacing(!callerEmotionPacing); setSaved(false); }}
                            >
                              <div className="toggle-handle" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    {editorTab === "engine" && (
                      <>
                        <div className="section-title">
                          <span className="section-icon"><Cpu size={20} /></span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>Model Architecture & Voice Engine</h3>
                            <small style={{ color: "var(--muted)", fontSize: 13.5 }}>Configure self-hosted AI brains, acoustic decoders, and full-duplex pipelines.</small>
                          </div>
                        </div>

                        {/* Public Demo Mode Banner */}
                        {isPublicDemoMode && (
                          <div className="public-demo-banner">
                            <div>
                              <strong>🌐 Public Web Demo Mode Active</strong>
                              <span>Visitors test live interactive calls with ephemeral sessions, 3-min timeout guard, and instant quick-prompt simulation.</span>
                            </div>
                            <button
                              type="button"
                              className="button button--outline"
                              style={{ fontSize: 13, minHeight: 32, padding: "0 14px", borderColor: "#bfdbfe", background: "white" }}
                              onClick={() => setIsPublicDemoMode(!isPublicDemoMode)}
                            >
                              Switch to On-Prem
                            </button>
                          </div>
                        )}

                        {/* Target Hardware & Environment Selector */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <label className="field-label" style={{ margin: 0 }}>Target Deployment Environment</label>
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>Simulating hardware constraints & concurrency</span>
                        </div>
                        <div className="hw-profile-grid">
                          {HARDWARE_PROFILES.map((hw) => (
                            <button
                              key={hw.id}
                              type="button"
                              className={`hw-profile-card ${selectedHardwareProfile === hw.id ? "selected" : ""}`}
                              onClick={() => { setSelectedHardwareProfile(hw.id); setSaved(false); }}
                            >
                              <div className="hw-profile-header">
                                <strong>{hw.shortName}</strong>
                                <span className={`hw-profile-badge ${hw.id === "cloud_l4_24gb" ? "hw-profile-badge--demo" : hw.id === "edge_rtx4060_8gb" ? "hw-profile-badge--edge" : ""}`}>
                                  {hw.tag}
                                </span>
                              </div>
                              <p className="hw-profile-desc">{hw.platform}</p>
                              <div className="preset-stack-meta" style={{ marginTop: 4 }}>
                                <span>{hw.vramGb === 0 ? "Zero GPU" : `${hw.vramGb} GB`}</span>
                                <span>{hw.concurrency === 999 ? "∞ Calls" : `${hw.concurrency} Lines`}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Real-Time Hardware Telemetry HUD */}
                        <div className="engine-hud">
                          <div className="engine-hud-card">
                            <span>VRAM Footprint</span>
                            <strong>
                              {activeProfile.vramGb === 0 ? "0 MB" : `${calculatedVram} GB`}
                              <small style={{ color: "var(--muted)", marginLeft: 4 }}>
                                / {activeProfile.vramGb === 0 ? "WebGPU" : `${activeProfile.vramGb.toFixed(1)} GB`}
                              </small>
                            </strong>
                            <div className="vram-meter-container">
                              <div
                                className={`vram-meter-fill ${vramPercent > 95 ? "vram-meter-fill--danger" : vramPercent > 75 ? "vram-meter-fill--warn" : "vram-meter-fill--safe"}`}
                                style={{ width: `${activeProfile.vramGb === 0 ? 10 : Math.max(8, vramPercent)}%` }}
                              />
                            </div>
                            <small style={{ marginTop: 3 }}>
                              {activeProfile.vramGb === 0 ? "Client in-browser" : vramPercent > 95 ? "Over budget — upgrade profile" : vramPercent > 75 ? "Tight headroom" : "Optimal headroom"}
                            </small>
                          </div>
                          <div className="engine-hud-card">
                            <span>Max Concurrency</span>
                            <strong>{calculatedConcurrency}</strong>
                            <small>Simultaneous callers</small>
                          </div>
                          <div className="engine-hud-card">
                            <span>Turn Latency</span>
                            <strong>{calculatedTurnLatency}</strong>
                            <small>{calculatedTtft}</small>
                          </div>
                          <div className="engine-hud-card">
                            <span>Inference Engine</span>
                            <strong>{activeProfile.engine.split(" ")[0]}</strong>
                            <small>{activeProfile.engine.split(" ").slice(1, 3).join(" ") || "Native"}</small>
                          </div>
                        </div>

                        {/* Full-Stack Architectural Presets */}
                        <label className="field-label" style={{ marginTop: 12 }}>Curated Architectural Stacks</label>
                        <div className="preset-stacks-grid">
                          {ENGINE_STACK_PRESETS.map((stack) => (
                            <button
                              key={stack.id}
                              type="button"
                              className={`preset-stack-card ${selectedPresetStack === stack.id ? "selected" : ""}`}
                              onClick={() => applyPresetStack(stack)}
                            >
                              <div className="preset-stack-header">
                                <strong>{stack.title}</strong>
                                <span className="preset-stack-tag">{stack.tag}</span>
                              </div>
                              <p className="preset-stack-desc">{stack.desc}</p>
                              <div className="preset-stack-meta">
                                <span><Gauge size={11} style={{ display: "inline", marginRight: 3 }} />{stack.vramStr}</span>
                                <span><Zap size={11} style={{ display: "inline", marginRight: 3 }} />{stack.latencyStr}</span>
                                <span><Layers size={11} style={{ display: "inline", marginRight: 3 }} />{stack.arch === "full_duplex" ? "S2S" : "Cascaded"}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Architecture Mode Selector */}
                        <label className="field-label" style={{ marginTop: 20 }}>Pipeline Architecture Mode</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                          <button
                            type="button"
                            className={`voice-choice ${archMode === "cascaded" ? "selected" : ""}`}
                            style={{ margin: 0, minHeight: 56, cursor: "pointer" }}
                            onClick={() => { setArchMode("cascaded"); setSaved(false); }}
                          >
                            <span className="play-circle" style={{ width: 28, height: 28, background: archMode === "cascaded" ? "var(--ink)" : "var(--stone)", color: archMode === "cascaded" ? "white" : "var(--ink)" }}>
                              <Layers size={14} />
                            </span>
                            <span>
                              <strong>Cascaded Turn Engine</strong>
                              <small>STT → Agentic LLM → TTS · Strict slot-filling & state machine</small>
                            </span>
                            {archMode === "cascaded" && <Check size={16} />}
                          </button>

                          <button
                            type="button"
                            className={`voice-choice ${archMode === "full_duplex" ? "selected" : ""}`}
                            style={{ margin: 0, minHeight: 56, cursor: "pointer" }}
                            onClick={() => {
                              setArchMode("full_duplex");
                              setSelectedLlm("s2s.nvidia.personaplex");
                              setSelectedPresetStack("stack_personaplex");
                              setSaved(false);
                            }}
                          >
                            <span className="play-circle" style={{ width: 28, height: 28, background: archMode === "full_duplex" ? "var(--ink)" : "var(--stone)", color: archMode === "full_duplex" ? "white" : "var(--ink)" }}>
                              <Radio size={14} />
                            </span>
                            <span>
                              <strong>End-to-End Full-Duplex (S2S)</strong>
                              <small>PersonaPlex / Moshi · 170ms audio-in to audio-out latency</small>
                            </span>
                            {archMode === "full_duplex" && <Check size={16} />}
                          </button>
                        </div>

                        {archMode === "cascaded" ? (
                          <>
                            {/* LLM Brain Selector */}
                            <label className="field-label">Agentic LLM Brain (llama-server GGUF)</label>
                            {AVAILABLE_LLMS.map((model) => (
                              <button
                                key={model.id}
                                type="button"
                                className={`engine-model-item ${selectedLlm === model.id ? "selected" : ""}`}
                                onClick={() => { setSelectedLlm(model.id); setSaved(false); }}
                              >
                                <div className="engine-model-info">
                                  <strong>{model.name}</strong>
                                  <small>{model.desc}</small>
                                </div>
                                <div className="engine-model-tags">
                                  <span className="engine-pill engine-pill--vram">{model.vramMb > 0 ? `${(model.vramMb / 1024).toFixed(1)} GB` : "0 GB"}</span>
                                  <span className="engine-pill">{model.latencyStr}</span>
                                  {model.recommended && <span className="engine-pill engine-pill--accent">Recommended</span>}
                                  {selectedLlm === model.id && <Check size={15} style={{ color: "var(--green)", marginLeft: 4 }} />}
                                </div>
                              </button>
                            ))}

                            {/* TTS Engine Selector */}
                            <label className="field-label" style={{ marginTop: 18 }}>Text-to-Speech Voice Engine (TTS)</label>
                            {AVAILABLE_TTSS.map((model) => (
                              <button
                                key={model.id}
                                type="button"
                                className={`engine-model-item ${selectedTts === model.id ? "selected" : ""}`}
                                onClick={() => { setSelectedTts(model.id); setSaved(false); }}
                              >
                                <div className="engine-model-info">
                                  <strong>{model.name}</strong>
                                  <small>{model.desc}</small>
                                </div>
                                <div className="engine-model-tags">
                                  <span className="engine-pill engine-pill--vram">{model.vramMb > 0 ? `${model.vramMb} MB` : "CPU (0 MB)"}</span>
                                  <span className="engine-pill">{model.latencyStr}</span>
                                  {model.recommended && <span className="engine-pill engine-pill--accent">High Quality</span>}
                                  {selectedTts === model.id && <Check size={15} style={{ color: "var(--green)", marginLeft: 4 }} />}
                                </div>
                              </button>
                            ))}

                            {/* STT Engine Selector */}
                            <label className="field-label" style={{ marginTop: 18 }}>Speech-to-Text Recognition (STT)</label>
                            {AVAILABLE_STTS.map((model) => (
                              <button
                                key={model.id}
                                type="button"
                                className={`engine-model-item ${selectedStt === model.id ? "selected" : ""}`}
                                onClick={() => { setSelectedStt(model.id); setSaved(false); }}
                              >
                                <div className="engine-model-info">
                                  <strong>{model.name}</strong>
                                  <small>{model.desc}</small>
                                </div>
                                <div className="engine-model-tags">
                                  <span className="engine-pill engine-pill--vram">{model.vramMb} MB</span>
                                  <span className="engine-pill">{model.latencyStr}</span>
                                  {model.recommended && <span className="engine-pill engine-pill--accent">Fast</span>}
                                  {selectedStt === model.id && <Check size={15} style={{ color: "var(--green)", marginLeft: 4 }} />}
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            {/* Full-Duplex S2S Models */}
                            <label className="field-label">Speech-to-Speech Foundation Models</label>
                            <button
                              type="button"
                              className={`engine-model-item selected`}
                            >
                              <div className="engine-model-info">
                                <strong>NVIDIA PersonaPlex-7B (v1)</strong>
                                <small>Unified full-duplex neural audio model. Eliminates cascading turn delay; simultaneous listen and talk with hybrid persona prompting.</small>
                              </div>
                              <div className="engine-model-tags">
                                <span className="engine-pill engine-pill--vram">4.8 GB</span>
                                <span className="engine-pill">~170ms Audio</span>
                                <span className="engine-pill engine-pill--accent">NVIDIA Open Model</span>
                                <Check size={15} style={{ color: "var(--green)", marginLeft: 4 }} />
                              </div>
                            </button>

                            <button
                              type="button"
                              className={`engine-model-item`}
                              onClick={() => { setSelectedLlm("s2s.kyutai.moshi"); setSaved(false); }}
                            >
                              <div className="engine-model-info">
                                <strong>Kyutai Moshi 7B (Mimi Codec)</strong>
                                <small>24kHz Mimi neural audio codec with Helium 7B backbone and inner monologue stream.</small>
                              </div>
                              <div className="engine-model-tags">
                                <span className="engine-pill engine-pill--vram">5.2 GB</span>
                                <span className="engine-pill">~160ms Audio</span>
                                <span className="engine-pill">Open Weights</span>
                              </div>
                            </button>
                          </>
                        )}

                        {/* Agentic Capabilities & Guardrails Toggles */}
                        <label className="field-label" style={{ marginTop: 22 }}>Autonomous Agentic Behaviors</label>
                        
                        <div className="engine-toggle-row">
                          <div className="engine-toggle-info">
                            <strong>Autonomous Failure Diagnostics & Retries</strong>
                            <small>If a booking tool returns a slot conflict or API validation error, the agent self-corrects without caller interruption.</small>
                          </div>
                          <div
                            className={`toggle-switch ${failureRecovery ? "on" : ""}`}
                            onClick={() => { setFailureRecovery(!failureRecovery); setSaved(false); }}
                          >
                            <div className="toggle-handle" />
                          </div>
                        </div>

                        <div className="engine-toggle-row">
                          <div className="engine-toggle-info">
                            <strong>Paralinguistic Acoustic Expressions ([laugh], [sigh])</strong>
                            <small>Enables natural conversational fillers and acoustic tags via Chatterbox-Turbo / Kokoro to eliminate awkward turn transitions.</small>
                          </div>
                          <div
                            className={`toggle-switch ${paralinguisticTags ? "on" : ""}`}
                            onClick={() => { setParalinguisticTags(!paralinguisticTags); setSaved(false); }}
                          >
                            <div className="toggle-handle" />
                          </div>
                        </div>

                        <div className="engine-toggle-row">
                          <div className="engine-toggle-info">
                            <strong>Live Caller Emotion & Sentiment Tracking</strong>
                            <small>Transmits SenseVoice acoustic event tags (&lt;angry&gt;, &lt;happy&gt;) to modulate speech empathy and urgency.</small>
                          </div>
                          <div
                            className={`toggle-switch ${emotionSensing ? "on" : ""}`}
                            onClick={() => { setEmotionSensing(!emotionSensing); setSaved(false); }}
                          >
                            <div className="toggle-handle" />
                          </div>
                        </div>

                        {/* Public Demo Multi-User Governance */}
                        <label className="field-label" style={{ marginTop: 20 }}>Public Demo & Multi-User Governance</label>
                        <div className="engine-toggle-row">
                          <div className="engine-toggle-info">
                            <strong>Public Demo Ephemeral Privacy (GDPR / HIPAA)</strong>
                            <small>Masks caller phone numbers (+1 ***-***-1234) and wipes audio buffers from RAM upon call hangup for public visitors.</small>
                          </div>
                          <div
                            className={`toggle-switch ${isPublicDemoMode ? "on" : ""}`}
                            onClick={() => { setIsPublicDemoMode(!isPublicDemoMode); setSaved(false); }}
                          >
                            <div className="toggle-handle" />
                          </div>
                        </div>

                        <button className="button button--dark save-button" onClick={() => setSaved(true)}>
                          Apply Engine Configuration
                        </button>
                      </>
                    )}
                    {editorTab === "knowledge" && (
                      <>
                        <div className="section-title">
                          <span className="section-icon"><BookOpen size={18} /></span>
                          <h3>Services & pricing</h3>
                        </div>
                        <div className="knowledge-list">
                          {preset.services.map((service) => (
                            <div key={service.name}>
                              <span><strong>{service.name}</strong></span>
                              <b>{service.price}</b>
                              <button aria-label="Service actions"><MoreHorizontal size={17} /></button>
                            </div>
                          ))}
                        </div>
                        <button className="button button--outline"><Plus size={15} />Add a service</button>
                      </>
                    )}
                    {editorTab === "rules" && (
                      <>
                        <div className="section-title">
                          <span className="section-icon"><ShieldCheck size={18} /></span>
                          <h3>Safety guardrails</h3>
                        </div>
                        <div className="rules-list">
                          {preset.rules.map((rule) => (
                            <div key={rule}>
                              <span><ShieldCheck size={16} /></span>
                              <p>{rule}</p>
                              <small>Enforced</small>
                            </div>
                          ))}
                        </div>
                        <button className="button button--outline"><Plus size={15} />Add guardrail</button>
                      </>
                    )}
                  </div>
                </article>
                <aside className="agent-preview">
                  <div className="preview-top">
                    <span>Agent preview</span>
                  </div>
                  <div className="preview-orb">
                    <HolyWhiteVoiceOrb state="idle" audioLevel={0} size={120} />
                    <h3>Maya</h3>
                    <p>{preset.voice}</p>
                  </div>
                  <div className="preview-quote">“{greeting}”</div>
                  <button className="button button--dark" onClick={startCall}>
                    <Phone size={16} />Test this agent
                  </button>
                </aside>
              </div>
            </section>
          )}

          {activeNav === "calls" && (
            <section className="page page-enter">
              <div className="page-heading">
                <h1>Calls</h1>
                <button className="button button--outline"><CalendarDays size={15} />Last 7 days</button>
              </div>
              <div className="call-summary">
                <div><span>{callHistory.length}</span><p>Total calls</p></div>
                <div><span>{Math.max(0, callHistory.length - 3)}</span><p>Handled by Maya</p></div>
                <div><span>{bookingsCount}</span><p>Bookings</p></div>
                <div><span>2</span><p>Transfers</p></div>
              </div>

              <article className="panel calls-panel">
                <div className="table-head">
                  <span>Caller</span><span>Outcome</span><span>Time</span><span>Duration</span><span />
                </div>
                {callHistory.map((call, idx) => (
                  <CallRow key={`${call.phone}-${idx}`} call={call} expanded />
                ))}
              </article>
            </section>
          )}
        </div>
      </main>

      {/* Actual Live Voice Call Modal with Holy White Voice Orb */}
      {callState !== "idle" && (
        <div className="call-modal-backdrop" role="dialog" aria-modal="true" aria-label="Live Voice Call">
          <div className="call-modal">
            <button className="icon-button modal-close" onClick={endCall} aria-label="Close">
              <X size={18} />
            </button>

            <div className="call-modal-body">
              {/* Luminous Holy White Voice Orb */}
              <HolyWhiteVoiceOrb
                state={callState === "connecting" ? "thinking" : agentState}
                audioLevel={audioLevel}
                size={220}
              />

              <div className="agent-status-tag">
                <span className={`status-indicator ${agentState}`} />
                <strong>Maya</strong> · {callState === "connecting" ? "Connecting…" : agentState === "speaking" ? "Speaking" : agentState === "thinking" ? "Thinking…" : interimText ? "Listening to you…" : "Listening"}
                {callState === "live" && <span className="timer-text">· {formatDuration()}</span>}
              </div>

              {/* Microphone access warning if blocked or missing */}
              {micError && (
                <div className="mic-error-banner">
                  ⚠️ {micError}
                </div>
              )}

              {/* Real-time Interim Speech Transcription Pill */}
              {interimText && (
                <div className="interim-bubble">
                  <span className="interim-pulse" />
                  <span className="interim-text">“{interimText}”</span>
                </div>
              )}

              {/* Live Turn Transcript Stream */}
              <div className="transcript">
                {callState === "connecting" && (
                  <div className="connecting-copy">Opening private audio session…</div>
                )}
                {turns.map((turn) => (
                  <div className={`turn turn--${turn.speaker}`} key={turn.id}>
                    <small>{turn.speaker === "agent" ? "Maya" : "You"} · {turn.timestamp}</small>
                    <p>{turn.text}</p>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {callState === "live" && (
                <>
                  <div className="suggestions">
                    <button onClick={() => sendTurn("How much does an AC inspection cost?")}>Ask pricing</button>
                    <button onClick={() => sendTurn("Can I book an appointment tomorrow at 10am?")}>Book tomorrow</button>
                    <button onClick={() => sendTurn("Mujhe kal subah 10 baje AC servicing book karni hai")}>Book in Hindi (कल 10 बजे)</button>
                    <button onClick={() => sendTurn("There is smoke and sparks coming from the unit!")}>Report hazard</button>
                    <button onClick={() => sendTurn("Unit se sparks aur dhuan nikal raha hai!")}>Hazard in Hindi (धुआं / स्पार्क्स)</button>
                    <button onClick={() => sendTurn("What are your business hours?")}>Operating hours</button>
                  </div>

                  {/* Audio Controls: Mute Microphone & Message Input */}
                  <div className="modal-input-row w-full">
                    <button
                      className={`mic-button ${isMuted ? "mic-button--muted" : "mic-button--live"}`}
                      onClick={toggleMute}
                      title={isMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                      {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    <div className="message-box flex-1">
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && draft.trim()) {
                            sendTurn(draft);
                            setDraft("");
                          }
                        }}
                        placeholder={isMuted ? "Type your reply…" : "Speak into mic or type here…"}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (draft.trim()) {
                            sendTurn(draft);
                            setDraft("");
                          }
                        }}
                        aria-label="Send"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>

                  <button className="end-call" onClick={endCall}>
                    <PhoneOff size={17} />End call
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Deployment Spec Modal */}
      {showDeployModal && (
        <div className="deploy-modal-backdrop" onClick={() => setShowDeployModal(false)}>
          <div className="deploy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="deploy-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Export Deployment Specification</h3>
                <small style={{ color: "var(--muted)", fontSize: 13 }}>
                  Target: {activeProfile.name} · Engine: {activeProfile.engine}
                </small>
              </div>
              <button className="icon-button" onClick={() => setShowDeployModal(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="deploy-modal-tabs">
              <button
                className={deployModalTab === "docker" ? "active" : ""}
                onClick={() => setDeployModalTab("docker")}
              >
                Docker Compose (Server / Cloud)
              </button>
              <button
                className={deployModalTab === "apple" ? "active" : ""}
                onClick={() => setDeployModalTab("apple")}
              >
                Apple Silicon (MLX / Metal)
              </button>
              <button
                className={deployModalTab === "embed" ? "active" : ""}
                onClick={() => setDeployModalTab("embed")}
              >
                Client Web Embed (HTML / React)
              </button>
            </div>
            <div className="deploy-modal-content">
              {deployModalTab === "docker" && (
                <div className="code-box">
                  <button
                    className="code-copy-btn"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(`version: '3.8'\nservices:\n  voice-agent:\n    image: ghcr.io/smb-voice-agent/char:latest\n    ports:\n      - "8190:8190"\n    environment:\n      - DEPLOYMENT_MODE=${activeProfile.id === "edge_rtx4060_8gb" ? "local-private" : "cloud"}\n      - TARGET_HARDWARE=${activeProfile.id}\n      - LLM_MODEL=${selectedLlm}\n      - TTS_MODEL=${selectedTts}\n      - STT_MODEL=${selectedStt}\n      - PIPELINE_MODE=${archMode}\n    deploy:\n      resources:\n        reservations:\n          devices:\n            - driver: nvidia\n              count: 1\n              capabilities: [gpu]`);
                      setCopiedDeployCode(true);
                      setTimeout(() => setCopiedDeployCode(false), 1500);
                    }}
                  >
                    {copiedDeployCode ? "Copied!" : "Copy Compose"}
                  </button>
                  <pre>{`version: '3.8'
services:
  voice-agent:
    image: ghcr.io/smb-voice-agent/char:latest
    ports:
      - "8190:8190"
    environment:
      - DEPLOYMENT_MODE=${activeProfile.id === "edge_rtx4060_8gb" ? "local-private" : "cloud"}
      - TARGET_HARDWARE=${activeProfile.id}
      - LLM_MODEL=${selectedLlm}
      - TTS_MODEL=${selectedTts}
      - STT_MODEL=${selectedStt}
      - PIPELINE_MODE=${archMode}
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]`}</pre>
                </div>
              )}
              {deployModalTab === "apple" && (
                <div className="code-box">
                  <button
                    className="code-copy-btn"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(`#!/usr/bin/env bash\n# Apple Silicon MLX / Metal Launch Script\npip install mlx-lm uvicorn fastapi\npython -m mlx_lm.server --model ${selectedLlm.replace('llm.', '')} --port 8083 &\nuvicorn voice_api.main:app --host 0.0.0.0 --port 8190`);
                      setCopiedDeployCode(true);
                      setTimeout(() => setCopiedDeployCode(false), 1500);
                    }}
                  >
                    {copiedDeployCode ? "Copied!" : "Copy Script"}
                  </button>
                  <pre>{`#!/usr/bin/env bash
# Apple Silicon MLX / Metal Launch Script
pip install mlx-lm uvicorn fastapi

# 1. Start local MLX model runner on unified memory
python -m mlx_lm.server --model ${selectedLlm.replace('llm.', '')} --port 8083 &

# 2. Launch Voice Agent API server
uvicorn voice_api.main:app --host 0.0.0.0 --port 8190`}</pre>
                </div>
              )}
              {deployModalTab === "embed" && (
                <div className="code-box">
                  <button
                    className="code-copy-btn"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(`<script\n  src="https://demo.smbvoice.internal/embed.js"\n  data-agent-id="agt_production"\n  data-preset="${preset.id}"\n  data-theme="white-orb"\n></script>`);
                      setCopiedDeployCode(true);
                      setTimeout(() => setCopiedDeployCode(false), 1500);
                    }}
                  >
                    {copiedDeployCode ? "Copied!" : "Copy Embed"}
                  </button>
                  <pre>{`<!-- Embed Voice Agent Orb in Any Public Website -->
<script
  src="https://demo.smbvoice.internal/embed.js"
  data-agent-id="agt_production"
  data-preset="${preset.id}"
  data-theme="white-orb"
></script>`}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CallRow = ({ call, expanded = false }: { call: CallLogEntry; expanded?: boolean }) => (
  <div className={`call-row ${expanded ? "call-row--expanded" : ""}`}>
    <div className="caller">
      <span>{call.caller.split(" ").map((part) => part[0]).join("")}</span>
      <div>
        <strong>{call.caller}</strong>
        <small>{call.phone}</small>
      </div>
    </div>
    <div className="outcome">
      <i className={`tone-${call.tone}`} />
      {call.outcome}
    </div>
    <div className="call-time">
      <Clock3 size={13} />{call.time}
    </div>
    {expanded && <div className="duration">{call.duration}</div>}
    <button className="row-action">
      <Headphones size={15} />{expanded && "Review"}
    </button>
  </div>
);
