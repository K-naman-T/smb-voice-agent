import React, { useEffect, useRef } from "react";

export type OrbAgentState = "idle" | "listening" | "thinking" | "speaking";

interface HolyWhiteVoiceOrbProps {
  state?: OrbAgentState;
  audioLevel?: number; // 0.0 to 1.0
  size?: number; // width & height in px
  className?: string;
  onClick?: () => void;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  angle: number;
  distance: number;
  speed: number;
  alpha: number;
  pulseSpeed: number;
}

interface Shockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export const HolyWhiteVoiceOrb: React.FC<HolyWhiteVoiceOrbProps> = ({
  state = "idle",
  audioLevel = 0,
  size = 220,
  className = "",
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const dpr = window.devicePixelRatio || 1;

    // Internal smoothed audio level for jitter-free fluid physics
    let smoothedAudio = 0;

    // Initialize celestial particles
    const particleCount = 18;
    const particles: Particle[] = Array.from({ length: particleCount }).map(() => ({
      x: 0,
      y: 0,
      radius: 0.7 + Math.random() * 1.5,
      angle: Math.random() * Math.PI * 2,
      distance: (size * 0.38) + Math.random() * (size * 0.22),
      speed: (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
      alpha: 0.2 + Math.random() * 0.6,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    }));

    // Acoustic shockwaves emitted when speaking or when sound peaks
    const shockwaves: Shockwave[] = [];
    let shockwaveCooldown = 0;

    const render = () => {
      time += 0.016;

      // Target canvas dimensions with DPR
      const w = size;
      const h = size;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const currentState = stateRef.current;
      const rawAudio = audioLevelRef.current;

      // Smooth audio level using linear interpolation
      const targetAudio = Math.min(1, Math.max(0, rawAudio));
      smoothedAudio += (targetAudio - smoothedAudio) * 0.22;

      // Simulated breathing motion when idle
      const idleBreathing = Math.sin(time * 1.8) * 0.03 + Math.cos(time * 2.7) * 0.02;
      const isSpeaking = currentState === "speaking";
      const isListening = currentState === "listening";
      const isThinking = currentState === "thinking";

      // Trigger acoustic shockwave rings when speaking or upon volume burst
      shockwaveCooldown -= 0.016;
      if ((isSpeaking && shockwaveCooldown <= 0) || (isListening && smoothedAudio > 0.45 && shockwaveCooldown <= 0)) {
        shockwaves.push({
          radius: size * 0.32,
          maxRadius: size * 0.54,
          alpha: isSpeaking ? 0.45 : 0.3,
          speed: isSpeaking ? 1.1 : 0.8,
        });
        shockwaveCooldown = isSpeaking ? 0.38 : 0.25;
      }

      // 1. Render Acoustic Shockwave Rings
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        const progress = (sw.radius - size * 0.32) / (sw.maxRadius - size * 0.32);
        const currentAlpha = sw.alpha * Math.max(0, 1 - progress);

        if (progress >= 1 || currentAlpha <= 0.01) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Subtle soft outer blur ring
        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius + 1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(235, 230, 220, ${(currentAlpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Volumetric Ambient Halos (The "Holy White" Radiance)
      const baseRadius = size * 0.33;
      const energy = smoothedAudio * 1.35 + (isSpeaking ? 0.28 : isListening ? 0.15 : 0);
      const dynamicRadius = baseRadius * (1 + idleBreathing + energy * 0.32);

      // Deep atmospheric glow behind the orb
      const outerGlow = ctx.createRadialGradient(cx, cy, dynamicRadius * 0.6, cx, cy, dynamicRadius * 1.8);
      outerGlow.addColorStop(0, "rgba(255, 255, 255, 0.42)");
      outerGlow.addColorStop(0.35, "rgba(245, 240, 232, 0.25)");
      outerGlow.addColorStop(0.7, "rgba(235, 228, 218, 0.08)");
      outerGlow.addColorStop(1, "rgba(251, 250, 248, 0)");
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Delicate iridescent aura ring (opal/pearl glancing light)
      const auraGradient = ctx.createRadialGradient(cx, cy, dynamicRadius * 0.88, cx, cy, dynamicRadius * 1.22);
      const opalTint = Math.sin(time * 1.2) * 0.04;
      auraGradient.addColorStop(0, `rgba(255, 255, 255, ${0.55 + opalTint})`);
      auraGradient.addColorStop(0.5, `rgba(240, 236, 245, ${0.35 + opalTint})`); // faint pearl lavender
      auraGradient.addColorStop(0.8, "rgba(235, 245, 240, 0.15)"); // faint pearl mint
      auraGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // 3. Organic Fluid Surface Deformation (Layered Harmonic Waves)
      const segments = 96;
      const points: { x: number; y: number }[] = [];
      const waveFreq1 = isThinking ? 5 : 3;
      const waveFreq2 = isThinking ? 7 : 4;
      const waveSpeed = isThinking ? time * 3.8 : time * 1.7;

      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const wave1 = Math.sin(theta * waveFreq1 + waveSpeed) * (3.5 + energy * 9);
        const wave2 = Math.cos(theta * waveFreq2 - waveSpeed * 0.8) * (2.0 + energy * 6);
        const wave3 = Math.sin(theta * 2 + time * 0.9) * 2;
        const r = dynamicRadius + wave1 + wave2 + wave3;
        points.push({
          x: cx + Math.cos(theta) * r,
          y: cy + Math.sin(theta) * r,
        });
      }

      // Draw the Organic Fluid Body
      ctx.save();
      ctx.beginPath();
      ctx.moveTo((points[0].x + points[segments - 1].x) / 2, (points[0].y + points[segments - 1].y) / 2);
      for (let i = 0; i < segments; i++) {
        const next = points[(i + 1) % segments];
        const midX = (points[i].x + next.x) / 2;
        const midY = (points[i].y + next.y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      ctx.closePath();

      // 4. Volumetric Spherical Shading (Holy Pearlescent Light)
      // Light source key light offset toward top-left (-0.28 R, -0.32 R)
      const lightX = cx - dynamicRadius * 0.28;
      const lightY = cy - dynamicRadius * 0.32;
      const bodyGrad = ctx.createRadialGradient(lightX, lightY, dynamicRadius * 0.08, cx, cy, dynamicRadius * 1.08);
      bodyGrad.addColorStop(0, "#ffffff"); // Pure incandescent white highlight
      bodyGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.99)");
      bodyGrad.addColorStop(0.55, "rgba(249, 247, 242, 0.96)"); // Warm stone alabaster
      bodyGrad.addColorStop(0.82, "rgba(238, 233, 224, 0.92)"); // Sub-surface depth
      bodyGrad.addColorStop(1.0, "rgba(224, 217, 206, 0.88)"); // Soft rim boundary

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 5. Fresnel Glancing Rim Stroke (Opalescent edge)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 6. Subsurface Swirling Core (Celestial Plasma)
      const swirlAngle = isThinking ? time * 2.2 : time * 0.7;
      const swirlOffset = dynamicRadius * 0.18;
      const swirlX = cx + Math.cos(swirlAngle) * swirlOffset;
      const swirlY = cy + Math.sin(swirlAngle) * swirlOffset;
      const coreGrad = ctx.createRadialGradient(swirlX, swirlY, 0, cx, cy, dynamicRadius * 0.75);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
      coreGrad.addColorStop(0.4, "rgba(255, 252, 245, 0.45)");
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // 7. Bright Specular Crest (Glossy porcelain / crystal bead)
      const specGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, dynamicRadius * 0.36);
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      specGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.65)");
      specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(lightX, lightY, dynamicRadius * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 8. Celestial Orbiting Starlets (Subtle micro-particles)
      ctx.save();
      for (const p of particles) {
        p.angle += p.speed;
        p.alpha += Math.sin(time * 3 + p.distance) * 0.01;
        const currentDist = p.distance + Math.sin(time * 1.5 + p.angle) * 4;
        const px = cx + Math.cos(p.angle) * currentDist;
        const py = cy + Math.sin(p.angle) * currentDist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.15, Math.min(0.85, p.alpha)).toFixed(2)})`;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 4;
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <div
      className={`holy-white-orb-wrapper relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: size, height: size }}
      />
    </div>
  );
};
