import React, { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface NeuralVoiceOrbProps {
  state: OrbState;
  size?: number;
  className?: string;
  subtitles?: string;
}

export const NeuralVoiceOrb: React.FC<NeuralVoiceOrbProps> = ({
  state,
  size = 220,
  className = "",
  subtitles
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseRadius = size * 0.28;

      // 1. Outermost ambient glow aura
      const auraGradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 2.2);
      if (state === "speaking") {
        auraGradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
        auraGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.18)");
        auraGradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      } else if (state === "listening") {
        auraGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
        auraGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.15)");
        auraGradient.addColorStop(1, "rgba(16, 185, 129, 0)");
      } else if (state === "thinking") {
        auraGradient.addColorStop(0, "rgba(245, 158, 11, 0.3)");
        auraGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.15)");
        auraGradient.addColorStop(1, "rgba(245, 158, 11, 0)");
      } else {
        auraGradient.addColorStop(0, "rgba(99, 102, 241, 0.18)");
        auraGradient.addColorStop(0.6, "rgba(59, 130, 246, 0.08)");
        auraGradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      }
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Ripple waves
      const waveCount = state === "speaking" ? 4 : state === "listening" ? 3 : 2;
      for (let w = 0; w < waveCount; w++) {
        ctx.save();
        ctx.beginPath();
        const speed = state === "speaking" ? 0.04 : state === "listening" ? 0.03 : 0.015;
        const offset = (frame * speed + (w * Math.PI) / 2) % (Math.PI * 2);
        const waveRadius = baseRadius + (w + 1) * (state === "speaking" ? 18 : 12) + Math.sin(offset) * (state === "speaking" ? 8 : 4);
        
        ctx.arc(cx, cy, Math.max(10, waveRadius), 0, Math.PI * 2);
        ctx.strokeStyle = state === "speaking" 
          ? `rgba(99, 102, 241, ${0.4 - w * 0.08})`
          : state === "listening"
          ? `rgba(16, 185, 129, ${0.45 - w * 0.1})`
          : state === "thinking"
          ? `rgba(245, 158, 11, ${0.35 - w * 0.1})`
          : `rgba(99, 102, 241, ${0.2 - w * 0.06})`;
        ctx.lineWidth = 1.5;
        if (state === "thinking") {
          ctx.setLineDash([8, 8]);
          ctx.rotate(frame * 0.02 * (w % 2 === 0 ? 1 : -1));
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Fluid undulating organic sphere
      ctx.save();
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let r = baseRadius;
        if (state === "speaking") {
          r += Math.sin(angle * 5 + frame * 0.08) * 8 + Math.cos(angle * 3 - frame * 0.05) * 6;
        } else if (state === "listening") {
          r += Math.sin(angle * 7 + frame * 0.06) * 5 + Math.cos(angle * 2 + frame * 0.03) * 4;
        } else if (state === "thinking") {
          r += Math.sin(angle * 4 + frame * 0.1) * 4;
        } else {
          r += Math.sin(frame * 0.03) * 2;
        }
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const coreGradient = ctx.createRadialGradient(cx - baseRadius * 0.25, cy - baseRadius * 0.25, 2, cx, cy, baseRadius);
      if (state === "speaking") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#67e8f9"); // cyan-300
        coreGradient.addColorStop(0.7, "#6366f1"); // indigo-500
        coreGradient.addColorStop(1, "#312e81");   // indigo-900
      } else if (state === "listening") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#a7f3d0"); // emerald-200
        coreGradient.addColorStop(0.7, "#10b981"); // emerald-500
        coreGradient.addColorStop(1, "#064e3b");   // emerald-900
      } else if (state === "thinking") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#fde68a"); // amber-200
        coreGradient.addColorStop(0.7, "#f59e0b"); // amber-500
        coreGradient.addColorStop(1, "#78350f");   // amber-900
      } else {
        coreGradient.addColorStop(0, "#e0e7ff");
        coreGradient.addColorStop(0.4, "#818cf8"); // indigo-400
        coreGradient.addColorStop(0.8, "#4338ca"); // indigo-700
        coreGradient.addColorStop(1, "#1e1b4b");   // indigo-950
      }
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = state === "speaking" ? "#6366f1" : state === "listening" ? "#10b981" : "#4338ca";
      ctx.shadowBlur = state === "speaking" ? 22 : 12;
      ctx.fill();
      ctx.restore();

      // 4. Central reflective glint
      ctx.beginPath();
      ctx.ellipse(cx - baseRadius * 0.32, cy - baseRadius * 0.35, baseRadius * 0.22, baseRadius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, size]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full select-none pointer-events-none"
      />
      {subtitles && (
        <div className="absolute -bottom-2 max-w-[85%] px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-center shadow-lg backdrop-blur-md">
          <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-tight">
            {subtitles}
          </p>
        </div>
      )}
    </div>
  );
};
