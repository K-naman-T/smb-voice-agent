import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Radio,
  Sparkles,
} from "lucide-react";

export interface DemoTurn {
  id: number;
  role: "agent" | "caller";
  speaker: string;
  startSec: number;
  endSec: number;
  text: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

export const PERSONAPLEX_TURNS: DemoTurn[] = [
  {
    id: 1,
    role: "caller",
    speaker: "David (Caller Inbound Audio)",
    startSec: 0.0,
    endSec: 2.64,
    text: "Hi Maya, can someone fix my leaking water heater today?",
    badge: "2.6s Inbound Audio (24kHz)",
    badgeColor: "#64748b",
  },
  {
    id: 2,
    role: "agent",
    speaker: "Maya (NVIDIA PersonaPlex-7B S2S)",
    startSec: 2.82,
    endSec: 9.27,
    text: "We do have a technician available today. Would you like to schedule? Can you tell me your address?",
    badge: "⚡ 180ms Turn Latency (NATF0)",
    badgeColor: "#10b981",
    highlight: true,
  },
];

export const CASCADED_TURNS: DemoTurn[] = [
  {
    id: 1,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 0.3,
    endSec: 6.7,
    text: "Thank you for calling Apex Plumbing and HVAC. My name is Maya. How can I help you today?",
    badge: "⚡ Instant Greeting",
    badgeColor: "#10b981",
  },
  {
    id: 2,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 7.0,
    endSec: 13.0,
    text: "Hi Maya, my water heater in the basement just started leaking all over the floor. Do you have someone who could come take a look today?",
    badge: "Inbound Speech (16kHz)",
    badgeColor: "#64748b",
  },
  {
    id: 3,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 13.2,
    endSec: 24.7,
    text: "Oh no, I'm sorry to hear that! Water heater leaks can get messy fast. Let's get an emergency technician out to you right away. First, can I get your service address?",
    badge: "⚡ 180ms TTFT · Empathy Slot",
    badgeColor: "#3b82f6",
  },
  {
    id: 4,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 25.0,
    endSec: 28.5,
    text: "Yeah, it's 742 Evergreen Terrace in Springfield.",
    badge: "Address Extraction",
    badgeColor: "#64748b",
  },
  {
    id: 5,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 28.7,
    endSec: 32.7,
    text: "Got it, 742 Evergreen Terrace. And is that a single-family home or—",
    badge: "⚡ 160ms · Interrupted",
    badgeColor: "#f59e0b",
  },
  {
    id: 6,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 32.3,
    endSec: 37.8,
    text: "Sorry to cut you off, it's a two-story house, and the main shutoff valve is right next to the tank if that helps.",
    badge: "🚨 Full-Duplex Barge-in Cutoff",
    badgeColor: "#ef4444",
    highlight: true,
  },
  {
    id: 7,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 38.0,
    endSec: 45.5,
    text: "That's super helpful to know! If you can safely turn that valve clockwise, it'll stop the flooding while Chris is on his way.",
    badge: "⚡ 190ms Zero-Stutter Pivot",
    badgeColor: "#8b5cf6",
    highlight: true,
  },
  {
    id: 8,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 45.7,
    endSec: 56.0,
    text: "Checking the live dispatch board now... I can have our senior technician Chris arrive today between 2:00 and 4:00 PM. Would that window work for you?",
    badge: "🔧 Async Dispatch Tool",
    badgeColor: "#0284c7",
  },
  {
    id: 9,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 56.3,
    endSec: 58.7,
    text: "Two to four PM is perfect, thank you so much.",
    badge: "Calendar Slot Accepted",
    badgeColor: "#64748b",
  },
  {
    id: 10,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 58.9,
    endSec: 63.3,
    text: "Awesome! What's the best phone number to text you the technician tracking link?",
    badge: "⚡ 170ms TTFT",
    badgeColor: "#3b82f6",
  },
  {
    id: 11,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 63.6,
    endSec: 66.3,
    text: "It's 555-0199.",
    badge: "Caller E.164 Number",
    badgeColor: "#64748b",
  },
  {
    id: 12,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 66.5,
    endSec: 80.7,
    text: "Perfect. Chris is booked for 2 to 4 PM today at 742 Evergreen Terrace. I just sent a confirmation text to 555-0199. Hang tight, help is on the way!",
    badge: "📱 SMS Confirmation Fired",
    badgeColor: "#059669",
    highlight: true,
  },
  {
    id: 13,
    role: "caller",
    speaker: "David (Inbound Customer)",
    startSec: 81.0,
    endSec: 82.8,
    text: "Thanks a lot Maya, have a great day.",
    badge: "Caller Resolution",
    badgeColor: "#64748b",
  },
  {
    id: 14,
    role: "agent",
    speaker: "Maya (OSS Voice Agent)",
    startSec: 83.0,
    endSec: 84.5,
    text: "You too, take care!",
    badge: "⚡ 140ms · Zero Hallucination",
    badgeColor: "#10b981",
  },
];

export const SotaVoiceDemoPlayer: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [activeModelTab, setActiveModelTab] = useState<"personaplex" | "cascaded">("personaplex");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(9.27);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState<number | null>(1);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const audioSrc = activeModelTab === "personaplex" ? "/personaplex_sample.mp3" : "/demo_conversation.mp3";
  const activeTurns = activeModelTab === "personaplex" ? PERSONAPLEX_TURNS : CASCADED_TURNS;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveTurnId(1);
    setDuration(activeModelTab === "personaplex" ? 9.27 : 85.42);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [activeModelTab]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);
      const active = activeTurns.find((t) => cur >= t.startSec && cur <= t.endSec + 0.3);
      if (active) {
        setActiveTurnId(active.id);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [activeTurns]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    setCurrentTime(sec);
    if (!isPlaying) {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const restartAudio = () => {
    seekTo(0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="sota-player-card">
      <audio key={audioSrc} ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Model Selector Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className={`jump-chip ${activeModelTab === "personaplex" ? "jump-chip--tool" : ""}`}
            style={{ fontWeight: 600, fontSize: 13, padding: "6px 14px", borderRadius: 10 }}
            onClick={() => setActiveModelTab("personaplex")}
          >
            <Sparkles size={14} color="#0284c7" /> 1. NVIDIA PersonaPlex-7B (Native S2S)
          </button>
          <button
            type="button"
            className={`jump-chip ${activeModelTab === "cascaded" ? "jump-chip--tool" : ""}`}
            style={{ fontWeight: 600, fontSize: 13, padding: "6px 14px", borderRadius: 10 }}
            onClick={() => setActiveModelTab("cascaded")}
          >
            <Radio size={14} color="#0284c7" /> 2. Cascaded Telephony (Multi-Turn & SMS)
          </button>
        </div>
        {onClose && (
          <button className="button button--quiet" onClick={onClose} style={{ padding: "4px 10px", fontSize: 13 }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* Header telemetry strip */}
      <div className="sota-player-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="live-pulse-dot" />
          <strong>
            {activeModelTab === "personaplex"
              ? "NVIDIA PersonaPlex-7B (Speech-to-Speech Engine)"
              : "Cascaded Telephony Engine (Moonshine + Qwen + Piper)"}
          </strong>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          {activeModelTab === "personaplex" ? "Full-Duplex S2S · ~160ms Latency" : "Deterministic Tool Calling · Multi-Turn"}
        </div>
      </div>

      {/* Audio Playback Controls */}
      <div className="sota-player-controls">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className={`play-btn-round ${isPlaying ? "playing" : ""}`}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>

          <button
            type="button"
            className="icon-btn-compact"
            onClick={restartAudio}
            title="Restart from beginning"
          >
            <RotateCcw size={14} />
          </button>

          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Dynamic Scrubber */}
        <div className="scrubber-container">
          <input
            type="range"
            min="0"
            max={duration || 68.6}
            step="0.1"
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="audio-scrubber"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="icon-btn-compact" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <a
            href={audioSrc}
            download={activeModelTab === "personaplex" ? "personaplex_7b_s2s.mp3" : "cascaded_edge_call.mp3"}
            className="download-btn-compact"
            title="Download MP3 audio"
          >
            <Download size={13} />
            <span>MP3</span>
          </a>
        </div>
      </div>

      {/* Synchronized Turn-by-Turn Transcript */}
      <div className="sota-transcript-scroll" ref={transcriptScrollRef}>
        {activeTurns.map((turn) => {
          const isActive = activeTurnId === turn.id;
          return (
            <div
              key={turn.id}
              className={`transcript-turn-card ${turn.role} ${isActive ? "active" : ""} ${
                turn.highlight ? "highlight-bargein" : ""
              }`}
              onClick={() => seekTo(turn.startSec)}
              title="Click to jump audio here"
            >
              <div className="turn-card-top">
                <div className="turn-speaker-badge">
                  <span className={`role-dot ${turn.role}`} />
                  <strong>{turn.speaker}</strong>
                  <span className="turn-timestamp">{formatTime(turn.startSec)}</span>
                </div>
                {turn.highlight && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", padding: "2px 8px", borderRadius: 99, border: "1px solid #fecaca" }}>
                    Barge-in
                  </span>
                )}
              </div>
              <p className="turn-text">{turn.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
