import React, { useEffect, useRef, useState } from "react";
import { Activity, BarChart2 } from "lucide-react";

export type AudioVisualizerMode = "spectrum" | "oscilloscope";
export type VoiceAgentState = "idle" | "listening" | "thinking" | "speaking";

interface LinearAudioVisualizerProps {
  state: VoiceAgentState;
  telephonyActive?: boolean;
}

export const LinearAudioVisualizer: React.FC<LinearAudioVisualizerProps> = ({
  state,
  telephonyActive = false,
}) => {
  const [mode, setMode] = useState<AudioVisualizerMode>("spectrum");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const barCount = 36;
    const currentHeights = new Array(barCount).fill(4);
    const peakHeights = new Array(barCount).fill(4);
    const peakHoldTimers = new Array(barCount).fill(0);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Darkest canvas #010102 with subtle studio tint
      ctx.fillStyle = "#090a0c";
      ctx.fillRect(0, 0, w, h);

      if (mode === "spectrum") {
        // Linear hairline reference grid (horizontal dB markings)
        ctx.strokeStyle = "#18191d";
        ctx.lineWidth = 1;
        const gridSteps = [0.25, 0.5, 0.75];
        gridSteps.forEach((ratio) => {
          const y = Math.floor(h * ratio) + 0.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        });

        // Calculate dynamic energy per band
        const gap = 3;
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(2, Math.floor((w - 24 - totalGap) / barCount));
        const offsetX = Math.floor((w - (barWidth * barCount + totalGap)) / 2);

        let targetScale = 0.08;
        if (state === "speaking") targetScale = 0.85;
        else if (state === "listening") targetScale = 0.45;
        else if (state === "thinking") targetScale = 0.25;
        else if (telephonyActive) targetScale = 0.12;

        for (let i = 0; i < barCount; i++) {
          // Bell curve weighting centered on speech frequencies (bands 8 to 22)
          const centerDist = Math.abs(i - barCount * 0.45) / (barCount * 0.5);
          const freqWeight = Math.max(0.15, 1 - centerDist * centerDist * 0.8);

          let noise = 0;
          if (state === "speaking") {
            noise =
              Math.sin(phase * 4 + i * 0.5) * 0.3 +
              Math.sin(phase * 8 + i * 0.9) * 0.2 +
              Math.random() * 0.35;
          } else if (state === "listening") {
            noise = Math.sin(phase * 3 + i * 0.4) * 0.25 + Math.random() * 0.2;
          } else if (state === "thinking") {
            // Harmonic wave traveling across bars
            noise = (Math.sin(phase * 5 - i * 0.3) + 1) * 0.3;
          } else {
            // Idle gentle hum
            noise = Math.sin(phase * 1.5 + i * 0.2) * 0.08;
          }

          const targetH = Math.max(
            3,
            Math.min(h - 10, (targetScale * freqWeight * (1 + noise) + 0.05) * (h - 12))
          );

          // Easing
          currentHeights[i] += (targetH - currentHeights[i]) * 0.22;

          // Peak hold logic
          if (currentHeights[i] > peakHeights[i]) {
            peakHeights[i] = currentHeights[i];
            peakHoldTimers[i] = 16;
          } else {
            if (peakHoldTimers[i] > 0) {
              peakHoldTimers[i]--;
            } else {
              peakHeights[i] = Math.max(3, peakHeights[i] - 1.2);
            }
          }

          const x = offsetX + i * (barWidth + gap);
          const barH = currentHeights[i];
          const y = h - 6 - barH;

          // Bar gradient - Linear lavender #5e6ad2 to #828fff
          const grad = ctx.createLinearGradient(0, h, 0, y);
          if (state === "speaking") {
            grad.addColorStop(0, "#3e468e");
            grad.addColorStop(0.7, "#5e6ad2");
            grad.addColorStop(1, "#828fff");
          } else if (state === "listening") {
            grad.addColorStop(0, "#1a3b5c");
            grad.addColorStop(1, "#38bdf8");
          } else if (state === "thinking") {
            grad.addColorStop(0, "#382914");
            grad.addColorStop(1, "#f59e0b");
          } else {
            grad.addColorStop(0, "#181a20");
            grad.addColorStop(1, "#343744");
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barH);

          // Peak needle cap (Linear hairline strong #f7f8f8 at 60% opacity)
          const peakY = h - 6 - peakHeights[i];
          ctx.fillStyle = state === "speaking" ? "#d0d6e0" : "#8a8f98";
          ctx.fillRect(x, Math.max(2, peakY - 1), barWidth, 1.5);
        }
      } else {
        // Oscilloscope mode: Crisp laboratory vector reticle
        ctx.strokeStyle = "#18191d";
        ctx.lineWidth = 1;
        const step = 24;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Center zero-crossing baseline
        ctx.strokeStyle = "#23252a";
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        let beamColor = "#5e6ad2";
        let amp = 3;

        if (state === "speaking") {
          beamColor = "#828fff";
          amp = 30;
        } else if (state === "listening") {
          beamColor = "#38bdf8";
          amp = 18;
        } else if (state === "thinking") {
          beamColor = "#f59e0b";
          amp = 12;
        } else if (telephonyActive) {
          beamColor = "#5e6ad2";
          amp = 6;
        } else {
          beamColor = "#414552";
          amp = 2;
        }

        ctx.lineWidth = 1.8;
        ctx.strokeStyle = beamColor;
        ctx.shadowBlur = state === "idle" ? 0 : 6;
        ctx.shadowColor = beamColor;

        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const normX = x / w;
          const envelope = Math.sin(normX * Math.PI);
          const harmonic1 = Math.sin(x * 0.05 + phase * 1.6) * (amp * 0.4);
          const harmonic2 =
            state === "speaking"
              ? Math.cos(x * 0.12 - phase * 2.2) * (amp * 0.25)
              : 0;
          const y =
            h / 2 +
            (Math.sin(x * 0.025 + phase) * amp + harmonic1 + harmonic2) *
              envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      phase += 0.05;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode, state, telephonyActive]);

  return (
    <div className="bg-[#0b0c0e] border border-[#23252a] rounded-lg p-3">
      {/* Visualizer header & control strip */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                state === "speaking"
                  ? "bg-[#27a644] animate-pulse"
                  : state === "listening"
                  ? "bg-[#38bdf8] animate-pulse"
                  : state === "thinking"
                  ? "bg-[#f59e0b] animate-pulse"
                  : telephonyActive
                  ? "bg-[#5e6ad2]"
                  : "bg-[#62666d]"
              }`}
            />
            <span className="text-xs font-mono font-medium text-[#f7f8f8] tracking-tight">
              {state === "speaking" && "AGENT SPEAKING"}
              {state === "listening" && "CALLER SPEECH DETECTED"}
              {state === "thinking" && "STREAMING INFERENCE"}
              {state === "idle" && (telephonyActive ? "AWAITING CALLER" : "LINE DISCONNECTED")}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#8a8f98] bg-[#141516] px-1.5 py-0.5 rounded border border-[#23252a]">
            {state === "speaking" ? "-14.2 dBFS" : state === "listening" ? "-22.8 dBFS" : "-64.0 dBFS"}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#141516] p-0.5 rounded-md border border-[#23252a]">
          <button
            onClick={() => setMode("spectrum")}
            title="36-Band Real-Time Spectrum"
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
              mode === "spectrum"
                ? "bg-[#1f2126] text-[#f7f8f8] shadow-sm"
                : "text-[#8a8f98] hover:text-[#d0d6e0]"
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>EQ</span>
          </button>
          <button
            onClick={() => setMode("oscilloscope")}
            title="Laboratory Oscilloscope"
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
              mode === "oscilloscope"
                ? "bg-[#1f2126] text-[#f7f8f8] shadow-sm"
                : "text-[#8a8f98] hover:text-[#d0d6e0]"
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Scope</span>
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative w-full h-[100px] rounded bg-[#090a0c] overflow-hidden border border-[#1a1b20]">
        <canvas
          ref={canvasRef}
          width={440}
          height={100}
          className="w-full h-full block"
        />

        {/* Technical HUD Overlay Watermark */}
        <div className="absolute top-1.5 left-2 flex items-center gap-2 pointer-events-none text-[9px] font-mono text-[#62666d]">
          <span>FFT 1024</span>
          <span>·</span>
          <span>HANNING</span>
          <span>·</span>
          <span>PEAK-HOLD 300ms</span>
        </div>
        <div className="absolute top-1.5 right-2 pointer-events-none text-[9px] font-mono text-[#62666d]">
          0 dBFS
        </div>
        <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-[#62666d]">
          -48 dBFS
        </div>
      </div>

      {/* Telephony Codec Strip */}
      <div className="mt-2.5 pt-2 border-t border-[#1c1d22] grid grid-cols-4 gap-1.5 text-[10px] font-mono">
        <div className="bg-[#141516] px-2 py-1 rounded border border-[#23252a]/70">
          <div className="text-[#8a8f98] text-[9px]">SAMPLE RATE</div>
          <div className="text-[#f7f8f8] font-medium">24,000 Hz</div>
        </div>
        <div className="bg-[#141516] px-2 py-1 rounded border border-[#23252a]/70">
          <div className="text-[#8a8f98] text-[9px]">CODEC</div>
          <div className="text-[#f7f8f8] font-medium">Opus 20ms</div>
        </div>
        <div className="bg-[#141516] px-2 py-1 rounded border border-[#23252a]/70">
          <div className="text-[#8a8f98] text-[9px]">ROUND TRIP</div>
          <div className="text-[#27a644] font-medium">182ms TTFA</div>
        </div>
        <div className="bg-[#141516] px-2 py-1 rounded border border-[#23252a]/70">
          <div className="text-[#8a8f98] text-[9px]">VAD CONF</div>
          <div className="text-[#f7f8f8] font-medium">99.2%</div>
        </div>
      </div>
    </div>
  );
};
