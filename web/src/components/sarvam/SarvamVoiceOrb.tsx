import React, { useEffect, useRef } from "react";

export type SarvamVoiceState = "idle" | "listening" | "thinking" | "speaking";

interface SarvamVoiceOrbProps {
  state: SarvamVoiceState;
  size?: number;
  subtitles?: string;
}

export const SarvamVoiceOrb: React.FC<SarvamVoiceOrbProps> = ({
  state,
  size = 180,
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

      // 1. Ambient Glow with Sarvam Saffron & Warm Gold / Cyan Tones
      const auraGradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 2.2);
      if (state === "speaking") {
        auraGradient.addColorStop(0, "rgba(249, 115, 22, 0.4)"); // Saffron Orange
        auraGradient.addColorStop(0.5, "rgba(245, 158, 11, 0.2)"); // Amber
        auraGradient.addColorStop(1, "rgba(249, 115, 22, 0)");
      } else if (state === "listening") {
        auraGradient.addColorStop(0, "rgba(16, 185, 129, 0.4)"); // Emerald
        auraGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.15)"); // Cyan
        auraGradient.addColorStop(1, "rgba(16, 185, 129, 0)");
      } else if (state === "thinking") {
        auraGradient.addColorStop(0, "rgba(139, 92, 246, 0.35)"); // Violet
        auraGradient.addColorStop(0.5, "rgba(249, 115, 22, 0.15)");
        auraGradient.addColorStop(1, "rgba(139, 92, 246, 0)");
      } else {
        auraGradient.addColorStop(0, "rgba(249, 115, 22, 0.2)");
        auraGradient.addColorStop(0.6, "rgba(234, 88, 12, 0.06)");
        auraGradient.addColorStop(1, "rgba(249, 115, 22, 0)");
      }
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outward Soundwave Ripples
      const waveCount = state === "speaking" ? 4 : state === "listening" ? 3 : 2;
      for (let w = 0; w < waveCount; w++) {
        ctx.save();
        ctx.beginPath();
        const speed = state === "speaking" ? 0.045 : state === "listening" ? 0.03 : 0.015;
        const offset = (frame * speed + (w * Math.PI) / 2) % (Math.PI * 2);
        const waveRadius = baseRadius + (w + 1) * (state === "speaking" ? 18 : 12) + Math.sin(offset) * (state === "speaking" ? 9 : 4);

        ctx.arc(cx, cy, Math.max(10, waveRadius), 0, Math.PI * 2);
        ctx.strokeStyle = state === "speaking"
          ? `rgba(249, 115, 22, ${0.45 - w * 0.09})`
          : state === "listening"
          ? `rgba(16, 185, 129, ${0.45 - w * 0.1})`
          : state === "thinking"
          ? `rgba(139, 92, 246, ${0.35 - w * 0.1})`
          : `rgba(249, 115, 22, ${0.2 - w * 0.06})`;
        ctx.lineWidth = 1.5;
        if (state === "thinking") {
          ctx.setLineDash([6, 6]);
          ctx.rotate(frame * 0.02 * (w % 2 === 0 ? 1 : -1));
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Fluid Organic Sphere
      ctx.save();
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let r = baseRadius;
        if (state === "speaking") {
          r += Math.sin(angle * 6 + frame * 0.09) * 8 + Math.cos(angle * 3 - frame * 0.06) * 6;
        } else if (state === "listening") {
          r += Math.sin(angle * 8 + frame * 0.07) * 5 + Math.cos(angle * 2 + frame * 0.04) * 4;
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

      // Gradients reflecting Sarvam branding
      const coreGradient = ctx.createRadialGradient(cx - baseRadius * 0.25, cy - baseRadius * 0.25, 2, cx, cy, baseRadius);
      if (state === "speaking") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#fed7aa"); // orange-200
        coreGradient.addColorStop(0.7, "#f97316"); // orange-500
        coreGradient.addColorStop(1, "#9a3412");   // orange-800
      } else if (state === "listening") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#a7f3d0"); // emerald-200
        coreGradient.addColorStop(0.7, "#10b981"); // emerald-500
        coreGradient.addColorStop(1, "#064e3b");   // emerald-900
      } else if (state === "thinking") {
        coreGradient.addColorStop(0, "#ffffff");
        coreGradient.addColorStop(0.3, "#ddd6fe"); // violet-200
        coreGradient.addColorStop(0.7, "#8b5cf6"); // violet-500
        coreGradient.addColorStop(1, "#4c1d95");   // violet-900
      } else {
        coreGradient.addColorStop(0, "#ffedd5"); // orange-100
        coreGradient.addColorStop(0.4, "#fb923c"); // orange-400
        coreGradient.addColorStop(0.8, "#ea580c"); // orange-600
        coreGradient.addColorStop(1, "#7c2d12");   // orange-900
      }
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = state === "speaking" ? "#f97316" : state === "listening" ? "#10b981" : "#ea580c";
      ctx.shadowBlur = state === "speaking" ? 24 : 14;
      ctx.fill();
      ctx.restore();

      // 4. Gloss glint
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
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full select-none pointer-events-none"
      />
      {subtitles && (
        <div className="absolute -bottom-1 max-w-[90%] px-3 py-1 rounded-full bg-slate-900/95 border border-orange-500/30 text-center shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-medium text-orange-200 line-clamp-2 leading-tight">
            {subtitles}
          </p>
        </div>
      )}
    </div>
  );
};
