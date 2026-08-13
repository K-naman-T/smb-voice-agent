'use client';

import { motion } from 'framer-motion';
import { Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: VoiceMessage;
  className?: string;
}

export function MessageBubble({ message, className = '' }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start', className)}
    >
      <div
        className={cn(
          'relative max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-white'
            : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 backdrop-blur-sm'
        )}
      >
        {message.role === 'agent' && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
              <Phone size={10} className="text-white" />
            </div>
            <span className="text-[10px] font-medium text-violet-400 uppercase tracking-wider">
              Agent
            </span>
          </div>
        )}

        {message.role === 'user' && (
          <div className="flex items-center gap-1.5 mb-2 justify-end">
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
              You
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <User size={10} className="text-emerald-400" />
            </div>
          </div>
        )}

        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        <div className="mt-2 flex items-center justify-end gap-1">
          <span className="text-[10px] text-zinc-500 font-mono">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}