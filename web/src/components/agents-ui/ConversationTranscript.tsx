'use client';

import { AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { type VoiceMessage } from './MessageBubble';
import { cn } from '@/lib/utils';

interface ConversationTranscriptProps {
  messages: VoiceMessage[];
  className?: string;
}

export function ConversationTranscript({
  messages,
  className = '',
}: ConversationTranscriptProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto px-4 py-6 space-y-4',
        '[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </AnimatePresence>

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4 border border-zinc-700/50">
            <MessageSquareIcon size={24} className="text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 mb-1">No messages yet</p>
          <p className="text-xs text-zinc-600 max-w-[240px]">
            Start a conversation by clicking the microphone
          </p>
        </div>
      )}
    </div>
  );
}

function MessageSquareIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}