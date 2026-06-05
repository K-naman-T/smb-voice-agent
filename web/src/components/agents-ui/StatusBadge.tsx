'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  connected: boolean;
  gemini: boolean;
  className?: string;
}

export function StatusBadge({ connected, gemini, className = '' }: StatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {connected ? (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium tracking-wider">LIVE</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-red-400 text-xs font-medium tracking-wider">OFFLINE</span>
        </div>
      )}
      {gemini && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/30">
          <span className="text-violet-400 text-[10px] font-bold tracking-wider">GEMINI</span>
        </div>
      )}
    </div>
  );
}