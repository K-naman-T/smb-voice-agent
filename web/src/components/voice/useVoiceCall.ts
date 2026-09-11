import { useState, useEffect, useRef, useCallback } from "react";
import { OrbAgentState } from "./HolyWhiteVoiceOrb";

export interface ServiceItem {
  name: string;
  price: string;
}

export interface PresetContext {
  id: string;
  label: string;
  business: string;
  phone: string;
  hours: string;
  greeting: string;
  voice: string;
  services: ServiceItem[];
  rules: string[];
}

export interface CallTurn {
  id: number;
  speaker: "agent" | "caller";
  text: string;
  timestamp: string;
}

export interface CallLogEntry {
  caller: string;
  phone: string;
  time: string;
  duration: string;
  outcome: string;
  tone: "positive" | "neutral" | "urgent";
}

// Check for Web Speech Recognition support in browser
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export interface ActiveBackendSession {
  tenantId?: string;
  agentId?: string;
  versionId?: string;
  apiKey?: string;
}

export function useVoiceCall(
  preset: PresetContext,
  onCallCompleted?: (entry: CallLogEntry) => void,
  session?: ActiveBackendSession
) {
  const [callState, setCallState] = useState<"idle" | "connecting" | "live">("idle");
  const [agentState, setAgentState] = useState<OrbAgentState>("idle");
  const [duration, setDuration] = useState<number>(0);
  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [interimText, setInterimText] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<"ready" | "listening" | "network_error" | "not_allowed" | "unsupported">("ready");

  // References for media & speech
  const agentStateRef = useRef<OrbAgentState>(agentState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRecordingUtteranceRef = useRef<boolean>(false);
  const currentMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const utteranceChunksRef = useRef<Blob[]>([]);
  const utteranceSilenceTimerRef = useRef<number | null>(null);
  const isProcessingSpeechRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const simulatedVoiceTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const latestSpeechRef = useRef<string>("");
  const callStateRef = useRef(callState);
  const presetRef = useRef(preset);
  const turnsRef = useRef(turns);
  const isMutedRef = useRef(isMuted);
  const isCloudSttAvailableRef = useRef<boolean>(true);
  const sessionRef = useRef<ActiveBackendSession | undefined>(session);
  const processCallerInputRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Call duration clock
  useEffect(() => {
    if (callState !== "live") return;
    const interval = window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [callState]);

  // Barge-in: interrupt agent speech immediately when user talks
  const interruptAgent = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (simulatedVoiceTimerRef.current) {
      window.clearInterval(simulatedVoiceTimerRef.current);
      simulatedVoiceTimerRef.current = null;
    }
    if (callStateRef.current === "live") {
      setAgentState("listening");
    }
  }, []);

  // Text-to-Speech using Web Speech Synthesis API with watchdog timer to prevent stuck states
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (simulatedVoiceTimerRef.current) {
      window.clearInterval(simulatedVoiceTimerRef.current);
      simulatedVoiceTimerRef.current = null;
    }

    setAgentState("speaking");

    const cleanText = text.replace(/[*_#`~]/g, "").trim();
    if (!cleanText) {
      if (callStateRef.current === "live") setAgentState("listening");
      if (onEnd) onEnd();
      return;
    }

    // Maximum speaking duration based on word count (~2.2 words/sec + 1.2s buffer)
    const wordsCount = cleanText.split(/\s+/).filter(Boolean).length;
    const maxDurationMs = Math.max(2500, Math.min(12000, (wordsCount / 2.2) * 1000 + 1200));

    let cleanedUp = false;
    let heartbeat: number | null = null;
    let watchdogTimer: number | null = null;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (watchdogTimer) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      if (heartbeat) {
        window.clearInterval(heartbeat);
        heartbeat = null;
      }
      if (simulatedVoiceTimerRef.current) {
        window.clearInterval(simulatedVoiceTimerRef.current);
        simulatedVoiceTimerRef.current = null;
      }
      setAudioLevel(0);
      if (callStateRef.current === "live") {
        setAgentState("listening");
      }
    };

    // Watchdog guarantees agent never stays frozen in "speaking" state
    watchdogTimer = window.setTimeout(() => {
      cleanup();
      if (onEnd) onEnd();
    }, maxDurationMs);

    // Simulate vocal cadence modulation on the Holy White Orb while speaking
    let voiceAngle = 0;
    simulatedVoiceTimerRef.current = window.setInterval(() => {
      voiceAngle += 0.35;
      const base = 0.28 + Math.sin(voiceAngle) * 0.18 + Math.sin(voiceAngle * 2.3) * 0.12;
      setAudioLevel(Math.max(0.1, Math.min(0.85, base)));
    }, 50);

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    // Cancel any previous utterance safely
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.04;

    // Pick best available natural voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")) ||
      voices.find((v) => (v.lang.startsWith("en") || v.lang.startsWith("hi")) && !v.name.includes("Bad")) ||
      voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;

    // Linux Chrome bugfix: prevent synthesis stall with periodic resume pulse
    heartbeat = window.setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 800);

    utterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      cleanup();
      if (onEnd) onEnd();
    };

    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn("SpeechSynthesis speak exception:", err);
      cleanup();
      if (onEnd) onEnd();
    }
  }, []);

  // Natural SMB Voice Agent dialogue reasoning engine
  const processCallerInput = useCallback((userInput: string) => {
    const raw = userInput.trim();
    if (!raw || callStateRef.current !== "live") return;

    // Cancel pending silence debounce
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    latestSpeechRef.current = "";

    // Interrupt any ongoing speech
    interruptAgent();

    // Append caller turn
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const callerTurn: CallTurn = {
      id: Date.now(),
      speaker: "caller",
      text: raw,
      timestamp: timeStr,
    };
    setTurns((prev) => [...prev, callerTurn]);
    setInterimText("");
    setAgentState("thinking");

    const runLocalRuleReply = () => {
      const lower = raw.toLowerCase();
      const current = presetRef.current;
      const isIndic = /khatra|aag|dhua|dhuan|current|bijli|kitna|daam|paisa|kharcha|bhai|batao|kal|aaj|samay|booking|haan|theek|ha|ji|achha|kab|khula|band|namaste|pranam|shukriya|ac/.test(lower);
      let reply = isIndic
        ? `Main ${current.business} se bol rahi hoon. Main aapki service booking ya pricing mein kya madad kar sakti hoon?`
        : `I can help you with that at ${current.business}. What would you like to schedule?`;

      // 1. Safety & Emergency checks
      if (/spark|smoke|fire|burst|electric shock|hazard|flooding|aag|dhua|dhuan|current|khatra|bijli/.test(lower)) {
        reply = isIndic
          ? `Main turant isse emergency ke roop mein escalate kar rahi hoon. Kripya safe distance banaye rakhein, main emergency technician ko alert bhej rahi hoon.`
          : `I am flagging this as an urgent emergency. Please ensure you and others are in a safe location away from the issue. I am immediately alerting our on-call specialist.`;
      }
      // 2. Pricing & Cost inquiries
      else if (/price|cost|how much|rate|charge|quote|fee|kitna|daam|paisa|kharcha|charges/.test(lower)) {
        const primary = current.services[0];
        const secondary = current.services[1] || current.services[0];
        reply = isIndic
          ? `Hamare standard charges: ${primary.name} ${primary.price}, aur ${secondary.name} ${secondary.price} hai. On-site visit ke time technician quote confirm karta hai.`
          : `Our standard ${primary.name} is ${primary.price}, and ${secondary.name} is ${secondary.price}. Our technician provides a verified quote on-site before performing any repair.`;
      }
      // 3. Appointment Booking & Slots
      else if (/book|appointment|schedule|visit|tomorrow|today|reserve|slot|come over|kal|aaj|booking|milna|timing/.test(lower)) {
        reply = isIndic
          ? `Kal subah 10:00 AM ka slot uplabdh hai. Kya main aapke is phone number par appointment confirm kar doon?`
          : `I have tomorrow at 10:00 AM open for an on-site visit. Shall I confirm this appointment under your phone number?`;
      }
      // 4. Affirmation / Confirmation
      else if (/^(yes|yeah|sure|confirm|please do|sounds good|okay|ok|haan|ha|theek|kar do|pakka|ji)/.test(lower)) {
        reply = isIndic
          ? `Bilkul, aapka slot confirm ho gaya hai. Hamare technician time par pahunchenge aur confirmation SMS bhej diya gaya hai.`
          : `Perfect, your appointment is reserved. Our technician will arrive promptly and you will receive an SMS confirmation on ${current.phone}.`;
      }
      // 5. Operating Hours & Location
      else if (/hours|open|when|time|operating|weekend|sunday|saturday|kab|khula|band|samay/.test(lower)) {
        reply = isIndic
          ? `Hum ${current.hours} khule hain. Aap in timings ke dauraan technician visit schedule kar sakte hain.`
          : `We are open ${current.hours}. We can schedule a technician during any of these hours.`;
      }
      // 6. Greetings / Salutations
      else if (/hello|hi|hey|good morning|good afternoon|namaste|pranam|ram ram|kese|kaise/.test(lower)) {
        reply = isIndic
          ? `Namaste! ${current.business} mein aapka swagat hai. Main service pricing ya appointment booking mein aapki madad kar sakti hoon.`
          : `Hello! Thank you for calling ${current.business}. I can check service pricing or book an appointment for you today.`;
      }

      const agentTurn: CallTurn = {
        id: Date.now() + 1,
        speaker: "agent",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTurns((prev) => [...prev, agentTurn]);
      speakText(reply);
    };

    const executeBackendTurn = (sess: ActiveBackendSession) => {
      const thread = turnsRef.current.map((t) => ({
        role: t.speaker === "caller" ? "user" : "assistant",
        content: t.text,
      }));
      thread.push({ role: "user", content: raw });

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      fetch(`/api/v1/agents/${sess.agentId}/versions/${sess.versionId}/turn`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sess.apiKey}`,
        },
        body: JSON.stringify({
          messages: thread,
          caller_phone: presetRef.current.phone,
        }),
      })
        .then((res) => {
          window.clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const reply = data.reply || `I can help you with that at ${presetRef.current.business}.`;
          const agentTurn: CallTurn = {
            id: Date.now() + 1,
            speaker: "agent",
            text: reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setTurns((prev) => [...prev, agentTurn]);
          speakText(reply);
        })
        .catch((err) => {
          window.clearTimeout(timeoutId);
          console.warn("Backend turn error/timeout, using local fallback engine:", err);
          runLocalRuleReply();
        });
    };

    // If active backend session exists, query real Qwen3.5 on chomp
    if (sessionRef.current?.agentId && sessionRef.current?.versionId && sessionRef.current?.apiKey) {
      executeBackendTurn(sessionRef.current);
      return;
    }

    // Try on-demand session bootstrap/fetch if not yet present
    fetch("/api/v1/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (s && s.agent_id && s.version_id && s.api_key) {
          const loaded: ActiveBackendSession = {
            tenantId: s.tenant_id,
            agentId: s.agent_id,
            versionId: s.version_id,
            apiKey: s.api_key,
          };
          sessionRef.current = loaded;
          executeBackendTurn(loaded);
        } else {
          runLocalRuleReply();
        }
      })
      .catch(() => {
        runLocalRuleReply();
      });
  }, [interruptAgent, speakText]);

  // Keep ref up to date for speech callbacks
  useEffect(() => {
    processCallerInputRef.current = processCallerInput;
  }, [processCallerInput]);

  // Fresh MediaRecorder per utterance: ensures valid EBML/WebM container headers for local FasterWhisper
  const startUtteranceRecording = useCallback(() => {
    if (
      isRecordingUtteranceRef.current ||
      isProcessingSpeechRef.current ||
      !mediaStreamRef.current ||
      callStateRef.current !== "live" ||
      isMutedRef.current
    ) {
      return;
    }

    try {
      const stream = mediaStreamRef.current;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      utteranceChunksRef.current = [];
      isRecordingUtteranceRef.current = true;
      currentMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          utteranceChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        isRecordingUtteranceRef.current = false;
        currentMediaRecorderRef.current = null;
        const chunks = [...utteranceChunksRef.current];
        utteranceChunksRef.current = [];

        if (chunks.length === 0 || callStateRef.current !== "live") return;

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (audioBlob.size < 600) return; // Discard tiny noise clicks

        try {
          isProcessingSpeechRef.current = true;
          setInterimText("Processing your voice…");
          setAgentState("thinking");
          const fd = new FormData();
          fd.append("file", audioBlob, "speech.webm");
          const resp = await fetch("/api/v1/stt/transcribe", {
            method: "POST",
            body: fd,
          });
          setInterimText("");
          if (resp.ok) {
            const data = await resp.json();
            if (data.text && data.text.trim()) {
              processCallerInputRef.current(data.text.trim());
            } else if (callStateRef.current === "live") {
              setAgentState("listening");
            }
          } else if (callStateRef.current === "live") {
            setAgentState("listening");
          }
        } catch (err) {
          setInterimText("");
          console.warn("Local STT transcription error:", err);
          if (callStateRef.current === "live") setAgentState("listening");
        } finally {
          isProcessingSpeechRef.current = false;
        }
      };

      recorder.start(100);
      setInterimText("Listening to you…");
    } catch (recErr) {
      console.warn("Could not start MediaRecorder:", recErr);
      isRecordingUtteranceRef.current = false;
    }
  }, []);

  const stopUtteranceRecording = useCallback(() => {
    if (utteranceSilenceTimerRef.current) {
      window.clearTimeout(utteranceSilenceTimerRef.current);
      utteranceSilenceTimerRef.current = null;
    }
    if (currentMediaRecorderRef.current && currentMediaRecorderRef.current.state === "recording") {
      try {
        currentMediaRecorderRef.current.stop();
      } catch (_) {}
    }
  }, []);

  // Initialize Microphone & Audio Analysis
  const startMicrophone = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError("Microphone not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      setMicActive(true);
      setMicError(null);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        try {
          await audioCtx.resume();
        } catch (_) {}
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Acoustic measurement loop & Calibrated Local VAD
      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (callStateRef.current !== "live") return;

        // 1. Analyze voice formant frequency energy (bins 1..24, ~150Hz to ~4500Hz)
        analyser.getByteFrequencyData(freqData);
        let voiceSum = 0;
        const maxVoiceBin = Math.min(bufferLength, 24);
        for (let i = 1; i < maxVoiceBin; i++) {
          voiceSum += freqData[i];
        }
        const voiceAvg = voiceSum / Math.max(1, maxVoiceBin - 1);
        const voiceNormalized = Math.min(1, voiceAvg / 42);

        // 2. Analyze time-domain waveform RMS amplitude
        analyser.getByteTimeDomainData(timeData);
        let sumSq = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeData[i] - 128) / 128;
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / bufferLength);
        const rmsNormalized = Math.min(1, rms * 7.5);

        // Combined responsive level
        const acousticLevel = Math.max(voiceNormalized, rmsNormalized);

        const currentAgent = agentStateRef.current;
        if (currentAgent === "speaking") {
          // Barge-in: caller voice immediately interrupts agent
          if (acousticLevel > 0.16) {
            interruptAgent();
          }
        } else {
          setAudioLevel(acousticLevel);

          // Calibrated Voice Activity Detection:
          // Room silence is typically 0.00-0.03. Natural conversational voice is 0.20-0.80.
          if (acousticLevel > 0.07 && callStateRef.current === "live" && !isMutedRef.current) {
            // Start recording new utterance if not currently recording
            if (!isRecordingUtteranceRef.current && !isProcessingSpeechRef.current) {
              startUtteranceRecording();
            }

            // Keep extending speech timeout as long as user is speaking
            if (utteranceSilenceTimerRef.current) {
              window.clearTimeout(utteranceSilenceTimerRef.current);
            }
            utteranceSilenceTimerRef.current = window.setTimeout(() => {
              // After 950ms of quiet following speech, finalize and send for transcription
              stopUtteranceRecording();
            }, 950);
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (err: any) {
      console.warn("Microphone access denied or unavailable:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setMicError("Microphone permission blocked. Please allow microphone access in your browser bar.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setMicError("No microphone found. Please connect a microphone or use quick prompts below.");
      } else {
        setMicError("Microphone access unavailable. You can also type or use quick prompts below.");
      }
      setMicActive(false);
    }
  }, [agentState, interruptAgent, startUtteranceRecording, stopUtteranceRecording]);

  // Initialize Speech Recognition (STT) with VAD silence debouncing
  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setSttStatus("unsupported");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-IN";

      recognition.onstart = () => {
        setSttStatus("ready");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const candidate = (final || interim).trim();
        if (candidate) {
          latestSpeechRef.current = candidate;
          setInterimText(candidate);
          setSttStatus("listening");
          interruptAgent();

          // Reset silence debounce
          if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // If browser finalized sentence, commit quickly (250ms).
          // If interim, wait 900ms after user stops speaking before auto-submitting the turn.
          const delay = final.trim() ? 250 : 900;
          silenceTimerRef.current = window.setTimeout(() => {
            const textToCommit = latestSpeechRef.current;
            if (textToCommit && callStateRef.current === "live") {
              latestSpeechRef.current = "";
              setInterimText("");

              // Cancel pending local utterance since Web Speech API already transcribed this turn
              if (utteranceSilenceTimerRef.current) {
                window.clearTimeout(utteranceSilenceTimerRef.current);
                utteranceSilenceTimerRef.current = null;
              }
              if (currentMediaRecorderRef.current && currentMediaRecorderRef.current.state === "recording") {
                currentMediaRecorderRef.current.onstop = null; // Discard local transcription
                try {
                  currentMediaRecorderRef.current.stop();
                } catch (_) {}
                isRecordingUtteranceRef.current = false;
                currentMediaRecorderRef.current = null;
                utteranceChunksRef.current = [];
              }

              processCallerInputRef.current(textToCommit);
            }
          }, delay);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "network") {
          console.info("Browser cloud STT offline; local FasterWhisper STT engine is active.");
          setSttStatus("network_error");
          isCloudSttAvailableRef.current = false;
        } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          console.warn("Speech recognition permission denied:", e.error);
          setSttStatus("not_allowed");
          isCloudSttAvailableRef.current = false;
        } else if (e.error !== "no-speech") {
          console.warn("Speech recognition error:", e.error);
        }
      };

      recognition.onend = () => {
        // If caller finished speaking right as recognition closed, commit the speech now
        if (latestSpeechRef.current && callStateRef.current === "live") {
          const textToCommit = latestSpeechRef.current;
          latestSpeechRef.current = "";
          setInterimText("");
          if (silenceTimerRef.current) {
            window.clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          processCallerInputRef.current(textToCommit);
        }

        // Auto-restart recognition safely with a tick delay to avoid InvalidStateError
        if (callStateRef.current === "live" && !isMutedRef.current && isCloudSttAvailableRef.current) {
          window.setTimeout(() => {
            if (callStateRef.current === "live" && !isMutedRef.current && isCloudSttAvailableRef.current) {
              try {
                recognition.start();
              } catch (_) {}
            }
          }, 250);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Could not start SpeechRecognition:", err);
      setSttStatus("network_error");
    }
  }, [interruptAgent]);

  // Start Call Session
  const startCall = useCallback(() => {
    // Synchronously unlock browser audio & speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
      } catch (_) {}
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      try {
        audioContextRef.current.resume();
      } catch (_) {}
    }

    setDuration(0);
    setTurns([]);
    setInterimText("");
    setMicError(null);
    setSttStatus("ready");
    isCloudSttAvailableRef.current = true;
    isRecordingUtteranceRef.current = false;
    isProcessingSpeechRef.current = false;
    currentMediaRecorderRef.current = null;
    utteranceChunksRef.current = [];
    setCallState("connecting");
    setAgentState("thinking");

    window.setTimeout(async () => {
      setCallState("live");
      const current = presetRef.current;
      const initialTurn: CallTurn = {
        id: Date.now(),
        speaker: "agent",
        text: current.greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTurns([initialTurn]);

      // Start audio hardware & speech engines
      await startMicrophone();
      startSpeechRecognition();

      // Speak opening greeting
      speakText(current.greeting);
    }, 450);
  }, [speakText, startMicrophone, startSpeechRecognition]);

  // End Call Session & Log Record
  const endCall = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (utteranceSilenceTimerRef.current) {
      window.clearTimeout(utteranceSilenceTimerRef.current);
      utteranceSilenceTimerRef.current = null;
    }
    if (currentMediaRecorderRef.current) {
      currentMediaRecorderRef.current.onstop = null;
      if (currentMediaRecorderRef.current.state === "recording") {
        try {
          currentMediaRecorderRef.current.stop();
        } catch (_) {}
      }
      currentMediaRecorderRef.current = null;
    }
    isRecordingUtteranceRef.current = false;
    isProcessingSpeechRef.current = false;
    utteranceChunksRef.current = [];
    latestSpeechRef.current = "";

    // Stop all audio & recognition
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (simulatedVoiceTimerRef.current) {
      window.clearInterval(simulatedVoiceTimerRef.current);
      simulatedVoiceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Determine call outcome
    const currentTurns = turnsRef.current;
    let outcome = "Pricing shared";
    let tone: "positive" | "neutral" | "urgent" = "positive";

    const allCallerText = currentTurns
      .filter((t) => t.speaker === "caller")
      .map((t) => t.text.toLowerCase())
      .join(" ");

    if (/confirm|booked|tomorrow|reserve|appointment|yes/.test(allCallerText)) {
      outcome = "Appointment booked";
      tone = "positive";
    } else if (/spark|smoke|fire|emergency|burst|hazard/.test(allCallerText)) {
      outcome = "Escalated to owner";
      tone = "urgent";
    } else if (currentTurns.length <= 1) {
      outcome = "Quick disconnect";
      tone = "neutral";
    }

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durStr = `${mins}m ${String(secs).padStart(2, "0")}s`;

    if (onCallCompleted && currentTurns.length > 0) {
      onCallCompleted({
        caller: "Live Browser Caller",
        phone: "+91 98200 " + Math.floor(10000 + Math.random() * 90000),
        time: "Just now",
        duration: durStr,
        outcome,
        tone,
      });
    }

    setCallState("idle");
    setAgentState("idle");
    setAudioLevel(0);
    setMicActive(false);
    setInterimText("");
  }, [duration, onCallCompleted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      if (next && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      } else if (!next && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
      return next;
    });
  }, []);

  const formatDuration = useCallback(() => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [duration]);

  const startManualCapture = useCallback(() => {
    if (callStateRef.current !== "live") return;
    interruptAgent();
    if (!isRecordingUtteranceRef.current && !isProcessingSpeechRef.current) {
      startUtteranceRecording();
    }
  }, [interruptAgent, startUtteranceRecording]);

  const stopManualCapture = useCallback(() => {
    if (callStateRef.current !== "live") return;
    stopUtteranceRecording();
  }, [stopUtteranceRecording]);

  return {
    callState,
    agentState,
    duration,
    formatDuration,
    turns,
    interimText,
    audioLevel,
    isMuted,
    micActive,
    micError,
    sttStatus,
    startCall,
    endCall,
    toggleMute,
    sendTurn: processCallerInput,
    startManualCapture,
    stopManualCapture,
  };
}
