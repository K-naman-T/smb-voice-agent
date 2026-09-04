import React, { useState } from "react";
import { Activity } from "lucide-react";

interface HourlyPoint {
  hour: string;
  calls: number;
  booked: number;
}

const HOURLY_DATA: HourlyPoint[] = [
  { hour: "8 AM", calls: 3, booked: 1 },
  { hour: "9 AM", calls: 6, booked: 2 },
  { hour: "10 AM", calls: 9, booked: 4 },
  { hour: "11 AM", calls: 8, booked: 3 },
  { hour: "12 PM", calls: 5, booked: 2 },
  { hour: "1 PM", calls: 4, booked: 1 },
  { hour: "2 PM", calls: 7, booked: 3 },
  { hour: "3 PM", calls: 6, booked: 2 },
  { hour: "4 PM", calls: 8, booked: 4 },
  { hour: "5 PM", calls: 7, booked: 3 },
  { hour: "6 PM", calls: 5, booked: 2 },
  { hour: "7 PM", calls: 4, booked: 1 }
];

export const TrafficVisualizer: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // SVG dimensions
  const svgWidth = 460;
  const svgHeight = 110;
  const paddingX = 20;
  const paddingBottom = 22;
  const chartHeight = svgHeight - paddingBottom;
  const maxVal = 10;

  const barSlotWidth = (svgWidth - paddingX * 2) / HOURLY_DATA.length;
  const barWidth = 14;

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Activity size={14} className="text-indigo-400" />
            <span>Today's Inbound Telephony Traffic</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time hourly call density & conversion yield</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> Calls Handled
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Booked Slots
          </span>
        </div>
      </div>

      {/* Crisp Pure SVG Bar & Area Graphic */}
      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 shadow-inner">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-28 overflow-visible"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="bookedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          <line x1={paddingX} y1={chartHeight * 0.25} x2={svgWidth - paddingX} y2={chartHeight * 0.25} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight * 0.5} x2={svgWidth - paddingX} y2={chartHeight * 0.5} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight * 0.75} x2={svgWidth - paddingX} y2={chartHeight * 0.75} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight} x2={svgWidth - paddingX} y2={chartHeight} stroke="rgba(255,255,255,0.1)" />

          {/* Render Bars */}
          {HOURLY_DATA.map((d, i) => {
            const x = paddingX + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
            const callH = Math.max(4, (d.calls / maxVal) * chartHeight);
            const callY = chartHeight - callH;
            const bookedH = Math.max(2, (d.booked / maxVal) * chartHeight);
            const bookedY = chartHeight - bookedH;
            const isHovered = hoveredIdx === i;

            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Total calls bar */}
                <rect
                  x={x}
                  y={callY}
                  width={barWidth}
                  height={callH}
                  rx={3}
                  fill="url(#barGradient)"
                  opacity={isHovered ? 1 : 0.85}
                  filter={isHovered ? "url(#glow)" : undefined}
                />

                {/* Overlaid Booked bar */}
                <rect
                  x={x}
                  y={bookedY}
                  width={barWidth}
                  height={bookedH}
                  rx={3}
                  fill="url(#bookedGradient)"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Hour label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  fill={isHovered ? "#ffffff" : "rgba(255,255,255,0.4)"}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {d.hour.replace(" ", "")}
                </text>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 25}
                      y={callY - 22}
                      width={64}
                      height={18}
                      rx={4}
                      fill="#020617"
                      stroke="rgba(255,255,255,0.2)"
                    />
                    <text
                      x={x + 7}
                      y={callY - 10}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {d.calls} calls · {d.booked} apt
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 3 Metric Highlight Pills */}
        <div className="mt-2 pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-950/60 rounded-lg p-1.5 border border-white/[0.04]">
            <span className="text-[10px] text-slate-400 block">Peak Demand</span>
            <span className="text-xs font-mono font-bold text-indigo-400">10:00 AM (9 calls)</span>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-1.5 border border-white/[0.04]">
            <span className="text-[10px] text-slate-400 block">Conversion Yield</span>
            <span className="text-xs font-mono font-bold text-emerald-400">39.5% Booked</span>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-1.5 border border-white/[0.04]">
            <span className="text-[10px] text-slate-400 block">Night Protection</span>
            <span className="text-xs font-mono font-bold text-amber-400">14 Gated Safely</span>
          </div>
        </div>
      </div>
    </div>
  );
};
