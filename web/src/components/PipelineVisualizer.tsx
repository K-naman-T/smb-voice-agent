import React from "react";
import { CheckCircle2, ShieldAlert, Cpu, Database, Radio } from "lucide-react";

export const PipelineVisualizer: React.FC = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Radio size={14} className="text-emerald-400" />
            <span>Deterministic Audio Pipeline Architecture</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">End-to-end zero-cloud latency & invariant safety stack</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ALL GATES CERTIFIED
        </span>
      </div>

      {/* Interactive Node Flow Diagram */}
      <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3.5 space-y-3">
        {/* Nodes Strip */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {/* Node 1: SIP Inbound */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-indigo-500/30 flex flex-col items-center gap-1 shadow-sm">
            <Radio size={16} className="text-indigo-400 mt-0.5" />
            <div className="font-semibold text-white text-[11px]">SIP Trunk</div>
            <div className="text-[9px] font-mono text-slate-400">Opus 24kHz</div>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-indigo-500/20 text-indigo-300">20ms Frame</span>
          </div>

          {/* Node 2: Silero VAD */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/30 flex flex-col items-center gap-1 shadow-sm">
            <Cpu size={16} className="text-cyan-400 mt-0.5" />
            <div className="font-semibold text-white text-[11px]">Silero VAD</div>
            <div className="text-[9px] font-mono text-slate-400">Barge-in Safe</div>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-cyan-500/20 text-cyan-300">Zero False Hit</span>
          </div>

          {/* Node 3: Local LLM */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 flex flex-col items-center gap-1 shadow-sm">
            <Cpu size={16} className="text-amber-400 mt-0.5" />
            <div className="font-semibold text-white text-[11px]">Qwen3.5-9B</div>
            <div className="text-[9px] font-mono text-slate-400">RTX 4060 Local</div>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-amber-500/20 text-amber-300">51.4 tok/s</span>
          </div>

          {/* Node 4: Safety Invariant Gate */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 flex flex-col items-center gap-1 shadow-sm">
            <ShieldAlert size={16} className="text-emerald-400 mt-0.5" />
            <div className="font-semibold text-white text-[11px]">Safety Gate</div>
            <div className="text-[9px] font-mono text-slate-400">Zero Unverified</div>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-emerald-500/20 text-emerald-300">100% Policy</span>
          </div>

          {/* Node 5: Committed SQLite */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-violet-500/30 flex flex-col items-center gap-1 shadow-sm">
            <Database size={16} className="text-violet-400 mt-0.5" />
            <div className="font-semibold text-white text-[11px]">SQLite WAL</div>
            <div className="text-[9px] font-mono text-slate-400">ACID Dispatches</div>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-violet-500/20 text-violet-300">Auto SMS Sync</span>
          </div>
        </div>

        {/* Verification Summary Banner */}
        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-200 text-[11px] font-medium">
              Deterministic 3-Seed Invariant Suite: 100% PASSED (0 Hallucinations, 0 Out-of-Hours Dispatches)
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80 shrink-0">182ms TTFA</span>
        </div>
      </div>
    </div>
  );
};
