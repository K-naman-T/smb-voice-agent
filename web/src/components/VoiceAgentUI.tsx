import { useState, useCallback, useEffect } from 'react';
import { AgentAudioVisualizer, AgentState } from './agents-ui/AgentAudioVisualizer';
import { AgentControlBar } from './agents-ui/AgentControlBar';
import { ConversationTranscript } from './agents-ui/ConversationTranscript';
import { StatusBadge } from './agents-ui/StatusBadge';
import type { VoiceMessage } from './agents-ui/MessageBubble';

interface BusinessContext {
  name: string;
  industry: string;
  services: string[];
  hours: string;
}

interface VoiceResult {
  transcript: string;
  intent: string;
  response: string;
  audio_url: string | null;
  audio_size: number;
  gemini_used: boolean;
}

export function VoiceAgentUI() {
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

  useEffect(() => {
    fetch('/api/business-context')
      .then(r => r.json())
      .then(setBusinessContext)
      .catch(() => {});
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setGeminiActive(data.gemini_configured);
    } catch {}
  }

  const handleStartCall = useCallback(async () => {
    setIsConnecting(true);
    setAgentState('connecting');
    try {
      setIsConnected(true);
      setAgentState('listening');
      addMessage('agent', 'Hello! How can I help you today?');
    } catch (err) {
      console.error('Failed to connect:', err);
      setAgentState('idle');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    setIsConnected(false);
    setAgentState('idle');
    setMessages([]);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  function addMessage(role: 'user' | 'agent', content: string) {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    }]);
  }

  async function handleSend(text: string) {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setAgentState('thinking');
    addMessage('user', text);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data: VoiceResult = await res.json();
      addMessage('agent', data.response);

      if (data.audio_url) {
        setAgentState('speaking');
        const audio = new Audio(data.audio_url);
        audio.onended = () => setAgentState('listening');
        await audio.play();
      } else {
        setAgentState('listening');
      }
    } catch {
      addMessage('agent', 'Sorry, I had trouble processing that.');
      setAgentState('listening');
    } finally {
      setIsProcessing(false);
      setTextInput('');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold">{businessContext?.name || 'Voice Agent'}</h1>
              <p className="text-xs text-white/50">{businessContext?.industry || 'SMB Assistant'}</p>
            </div>
          </div>
          <StatusBadge connected={isConnected} gemini={geminiActive} />
        </div>
      </header>

      {businessContext && (
        <div className="max-w-2xl mx-auto w-full px-4 mt-3">
          <button
            onClick={() => setShowBusiness(!showBusiness)}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            {showBusiness ? 'Hide' : 'Show'} business info
          </button>
          {showBusiness && (
            <div className="glass-card rounded-2xl p-4 mt-2 space-y-2">
              <p className="text-sm text-white/80">{businessContext.name}</p>
              <p className="text-xs text-white/50">{businessContext.hours}</p>
              <div className="flex flex-wrap gap-2">
                {businessContext.services.slice(0, 5).map(s => (
                  <span key={s} className="px-2 py-1 text-xs rounded-full bg-white/5 border border-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        <ConversationTranscript messages={messages} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent pb-4 pt-8">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          <AgentAudioVisualizer state={agentState} className="w-full max-w-md mx-auto" />
          <AgentControlBar
            isConnected={isConnected}
            isMuted={isMuted}
            isConnecting={isConnecting}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            onToggleMute={handleToggleMute}
          />

          {isConnected && (
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(textInput)}
                placeholder="Type a message..."
                className="flex-1 glass-card rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25
                           focus:outline-none focus:border-emerald-500/50"
                disabled={isProcessing}
              />
              <button
                onClick={() => handleSend(textInput)}
                disabled={isProcessing || !textInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30
                           transition-all text-sm font-medium"
              >
                {isProcessing ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Send'}
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="block mx-auto text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
