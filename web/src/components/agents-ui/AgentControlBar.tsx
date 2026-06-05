'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentControlBarProps {
  isConnected: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  className?: string;
}

export function AgentControlBar({
  isConnected,
  isMuted,
  isConnecting,
  onStartCall,
  onEndCall,
  onToggleMute,
  className = '',
}: AgentControlBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-center gap-4 p-4',
        'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-full',
        className
      )}
    >
      {!isConnected ? (
        <button
          onClick={onStartCall}
          disabled={isConnecting}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all',
            'bg-gradient-to-br from-emerald-500 to-emerald-600',
            'hover:from-emerald-400 hover:to-emerald-500',
            'shadow-lg shadow-emerald-500/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50'
          )}
        >
          {isConnecting ? (
            <Loader2 size={24} className="text-white animate-spin" />
          ) : (
            <Mic size={24} className="text-white" />
          )}
        </button>
      ) : (
        <>
          <button
            onClick={onToggleMute}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              'border-2',
              isMuted
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
              'hover:scale-105 active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900'
            )}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <div className="w-px h-8 bg-zinc-700" />

          <button
            onClick={onEndCall}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              'bg-red-500/20 border-2 border-red-500/50 text-red-400',
              'hover:bg-red-500/30 hover:scale-105 active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900'
            )}
          >
            <PhoneOff size={20} />
          </button>
        </>
      )}
    </motion.div>
  );
}