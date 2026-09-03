import React, { useEffect, useRef } from 'react';

export type VisualizerMode = 'oscilloscope' | 'radial' | 'bars';
export type AgentVoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AcousticVisualizerProps {
  state: AgentVoiceState;
  mode: VisualizerMode;
  onModeChange?: (mode: VisualizerMode) => void;
  className?: string;
  height?: number;
}

export const AcousticVisualizer: React.FC<AcousticVisualizerProps> = ({
  state,
  mode,
  onModeChange,
  className = '',
  height = 110,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const peakBars = new Array(24).fill(0);

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, width, h);
      let speed = 0.05;

      // Mode 1: Laboratory Phosphor Oscilloscope
      if (mode === 'oscilloscope') {
        // Grid reticle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const step = 20;
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Center zero-crossing baseline
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();

        // Beam color & glow based on agent state
        let beamColor = 'rgba(16, 185, 129, 0.5)';
        let amplitude = 4;

        if (state === 'speaking') {
          beamColor = '#10b981';
          amplitude = 28;
          speed = 0.22;
        } else if (state === 'listening') {
          beamColor = '#3b82f6';
          amplitude = 18;
          speed = 0.15;
        } else if (state === 'thinking') {
          beamColor = '#f59e0b';
          amplitude = 10;
          speed = 0.28;
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = beamColor;
        ctx.shadowBlur = state === 'idle' ? 2 : 8;
        ctx.shadowColor = beamColor;

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const noise = state !== 'idle' ? (Math.random() - 0.5) * 6 : 0;
          const harmonic = Math.sin(x * 0.08 + phase * 1.5) * (amplitude * 0.4);
          const y = h / 2 + Math.sin(x * 0.03 + phase) * amplitude + harmonic + noise;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Mode 2: Polar Acoustic Radar / Orb (Inspired by ElevenLabs / Siri but hardware-modded)
      else if (mode === 'radial') {
        const cx = width / 2;
        const cy = h / 2;
        const maxRadius = Math.min(cx, cy) - 10;

        // Concentric range rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        [0.3, 0.6, 0.9].forEach((frac) => {
          ctx.beginPath();
          ctx.arc(cx, cy, maxRadius * frac, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Crosshairs
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy);
        ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius);
        ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        // Pulsing audio ring
        let orbColor = '#10b981';
        let baseRadius = 24;
        let ringAmp = 3;

        if (state === 'speaking') {
          orbColor = '#10b981';
          baseRadius = 28;
          ringAmp = 12;
        } else if (state === 'listening') {
          orbColor = '#3b82f6';
          baseRadius = 26;
          ringAmp = 8;
        } else if (state === 'thinking') {
          orbColor = '#f59e0b';
          baseRadius = 22;
          ringAmp = 5;
        }

        ctx.strokeStyle = orbColor;
        ctx.shadowBlur = state === 'idle' ? 4 : 12;
        ctx.shadowColor = orbColor;
        ctx.lineWidth = 2.5;

        // Draw dynamic perimeter with sine displacement
        ctx.beginPath();
        const numPoints = 64;
        for (let i = 0; i <= numPoints; i++) {
          const theta = (i / numPoints) * Math.PI * 2;
          const wobble = Math.sin(theta * 6 + phase * 2) * ringAmp +
            (state !== 'idle' ? Math.cos(theta * 12 - phase) * (ringAmp * 0.5) : 0);
          const r = baseRadius + wobble;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Central core dot
        ctx.fillStyle = orbColor;
        ctx.beginPath();
        ctx.arc(cx, cy, state === 'idle' ? 3 : 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      // Mode 3: 24-Band Graphic Equalizer (LiveKit BarVisualizer style modded for hardware)
      else if (mode === 'bars') {
        const barCount = 24;
        const totalGap = 3 * (barCount - 1);
        const barWidth = Math.max(3, (width - 40 - totalGap) / barCount);
        const startX = 20;

        // Baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(10, h - 8);
        ctx.lineTo(width - 10, h - 8);
        ctx.stroke();

        for (let i = 0; i < barCount; i++) {
          const x = startX + i * (barWidth + 3);
          // Calculate dynamic bar height
          let targetHeight = 4;
          if (state === 'speaking') {
            const freq = (i + 1) * 0.4;
            targetHeight = Math.abs(Math.sin(freq + phase * 1.8)) * (h - 26) + Math.random() * 8;
          } else if (state === 'listening') {
            const freq = (i + 1) * 0.3;
            targetHeight = Math.abs(Math.sin(freq + phase * 1.2)) * (h - 40) + Math.random() * 5;
          } else if (state === 'thinking') {
            const wave = Math.sin((i / barCount) * Math.PI * 2 + phase * 3);
            targetHeight = Math.abs(wave) * (h - 50) + 4;
          } else {
            targetHeight = 4 + Math.sin(i * 0.5 + phase) * 2;
          }

          // Peak hold physics
          if (targetHeight > peakBars[i]) {
            peakBars[i] = targetHeight;
          } else {
            peakBars[i] = Math.max(0, peakBars[i] - 0.6);
          }

          // Bar gradient
          const barH = Math.min(h - 16, Math.max(2, targetHeight));
          const y = h - 8 - barH;

          let barColor = '#10b981';
          if (state === 'listening') barColor = '#3b82f6';
          if (state === 'thinking') barColor = '#f59e0b';
          if (state === 'idle') barColor = 'rgba(255, 255, 255, 0.2)';

          ctx.fillStyle = barColor;
          ctx.fillRect(x, y, barWidth, barH);

          // Peak dot
          const peakY = h - 8 - peakBars[i] - 2;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakY, barWidth, 1.5);
        }
      }

      phase += speed;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, mode]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Visualizer header & mode switcher */}
      <div className="flex justify-between items-center text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-white/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase tracking-wider font-bold">Acoustic Engine</span>
          <span className="text-white/30">|</span>
          <span className={`uppercase font-semibold ${
            state === 'speaking' ? 'text-emerald-400' :
            state === 'listening' ? 'text-blue-400' :
            state === 'thinking' ? 'text-amber-400' : 'text-white/40'
          }`}>
            {state}
          </span>
        </div>

        {/* Mode Selector Buttons */}
        {onModeChange && (
          <div className="flex gap-1">
            {(['oscilloscope', 'radial', 'bars'] as VisualizerMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`btn-tactile px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                  mode === m
                    ? 'bg-[#ff5722] text-white font-bold'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {m === 'oscilloscope' ? 'OSC' : m === 'radial' ? 'RADAR' : 'EQ-BARS'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recessed Canvas Display */}
      <div className="recessed-display rounded-lg overflow-hidden border border-white/10 relative">
        <canvas
          ref={canvasRef}
          width={320}
          height={height}
          className="w-full block bg-[#06080d]"
          style={{ height: `${height}px` }}
        />
        <div className="scanlines absolute inset-0 pointer-events-none" />
      </div>
    </div>
  );
};
