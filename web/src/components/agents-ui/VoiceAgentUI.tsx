'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentAudioVisualizer, type AgentState } from './AgentAudioVisualizer';
import { AgentControlBar } from './AgentControlBar';
import { ConversationTranscript } from './ConversationTranscript';
import { type VoiceMessage } from './MessageBubble';
import { StatusBadge } from './StatusBadge';

const API = 'http://localhost:8000';

interface BusinessContext {
  name: string;
  industry: string;
  hours: string;
  services: string[];
}

interface VoiceResult {
  transcript: string;
  intent: string;
  response: string;
  audio_url: string | null;
  gemini_used?: boolean;
}

interface VoiceAgentUIProps {
  className?: string;
}

export function VoiceAgentUI({ className = '' }: VoiceAgentUIProps) {
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [geminiActive, setGeminiActive] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) {
        const data = await res.json();
        setIsConnected(true);
        setGeminiActive(data.gemini || false);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/business-context`);
      if (res.ok) setBusinessContext(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    checkConnection();
    fetchBusiness();
  }, [checkConnection, fetchBusiness]);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setAgentState('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        processAudio();
      };

      audioChunksRef.current = [];
      mr.start();
      setIsConnected(true);
      setAgentState('listening');
    } catch {
      alert('Microphone access denied.');
      setAgentState('idle');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endCall = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsConnected(false);
    setAgentState('idle');
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setAgentState('listening');
      return;
    }

    setAgentState('thinking');
    setIsProcessing(true);

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    const tscript = await new Promise<string>((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        resolve('');
        return;
      }
      const r = new SR();
      r.lang = 'en-IN';
      r.continuous = false;
      r.interimResults = false;

      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();

      r.onresult = (e: any) => {
        URL.revokeObjectURL(audio.src);
        resolve(e.results[0][0].transcript);
      };
      r.onerror = () => {
        audio.pause();
        URL.revokeObjectURL(audio.src);
        resolve('');
      };
      setTimeout(() => {
        audio.pause();
        resolve('');
      }, 8000);
    });

    if (!tscript.trim()) {
      addMessage('agent', 'I did not catch that. Could you please try again?');
      setAgentState('listening');
      setIsProcessing(false);
      return;
    }

    addMessage('user', tscript);
    await sendToPipeline(tscript);
  };

  const sendToPipeline = async (text: string) => {
    try {
      setAgentState('thinking');
      const res = await fetch(`${API}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('API error');
      const result: VoiceResult = await res.json();

      addMessage('agent', result.response, result.audio_url ? `${API}${result.audio_url}` : undefined);

      if (result.audio_url) {
        setAgentState('speaking');
        playAudio(`${API}${result.audio_url}`);
      } else {
        setAgentState('listening');
      }
    } catch {
      addMessage('agent', 'I encountered an issue. Please try again.');
      setAgentState('listening');
    }
    setIsProcessing(false);
  };

  const addMessage = (role: 'user' | 'agent', content: string, audioUrl?: string) => {
    const message: VoiceMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);

    if (audioUrl && role === 'agent') {
      playAudio(audioUrl);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setAgentState('listening');
    audioRef.current.onerror = () => setAgentState('listening');
    audioRef.current.play();
  };

  const sendText = async () => {
    if (!textInput.trim() || isProcessing) return;
    const text = textInput.trim();
    setTextInput('');
    addMessage('user', text);
    setIsProcessing(true);
    await sendToPipeline(text);
  };

  const clearConversation = () => setMessages([]);

  return (
    <div className={cn('min-h-screen bg-black text-white font-sans relative', className)}>
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a12] via-[#0d0d1a] to-black pointer-events-none" />
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-[15px] font-semibold text-white leading-tight">
                    {businessContext?.name || 'Voice Agent'}
                  </h1>
                  <p className="text-[11px] text-white/40 tracking-wide">
                    {businessContext?.industry || 'SMB Assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge connected={isConnected} gemini={geminiActive} />
                <button
                  onClick={checkConnection}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {businessContext && (
          <div className="border-b border-white/5">
            <button
              onClick={() => setShowBusiness(!showBusiness)}
              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-xs text-white/50 font-medium tracking-wider">BUSINESS CONTEXT</span>
              <svg
                className={`w-4 h-4 text-white/30 transition-transform ${showBusiness ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showBusiness && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-white">{businessContext.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{businessContext.hours}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(businessContext.services || []).slice(0, 5).map((s: string) => (
                        <span
                          key={s}
                          className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full font-medium tracking-wide"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        <ConversationTranscript messages={messages} className="flex-1" />

        <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6 px-5 space-y-4">
          <AgentAudioVisualizer state={agentState} className="w-full" />

          <AgentControlBar
            isConnected={isConnected}
            isMuted={isMuted}
            isConnecting={isConnecting}
            onStartCall={startCall}
            onEndCall={endCall}
            onToggleMute={toggleMute}
            className="w-full"
          />

          {isConnected && (
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendText()}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/25 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
              />
              <button
                onClick={sendText}
                disabled={!textInput.trim() || isProcessing}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-xl font-medium transition-all flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={clearConversation}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Clear conversation
              </button>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}