'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export type AgentState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

interface AgentAudioVisualizerProps {
  state: AgentState;
  audioTrack?: MediaStream;
  className?: string;
  barCount?: number;
}

export function AgentAudioVisualizer({
  state,
  audioTrack,
  className = '',
  barCount = 32,
}: AgentAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const smoothDataRef = useRef<number[]>(new Array(barCount).fill(0));

  const [isActive, setIsActive] = useState(false);

  const smoothData = useCallback((newData: number[], smoothFactor = 0.3) => {
    return newData.map((value, i) => {
      const current = smoothDataRef.current[i] || 0;
      return current + (value - current) * smoothFactor;
    });
  }, []);

  useEffect(() => {
    if (!audioTrack || !canvasRef.current) return;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(audioTrack);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);

    analyserRef.current = analyser;
    setIsActive(true);

    return () => {
      source.disconnect();
      audioContext.close();
      setIsActive(false);
    };
  }, [audioTrack]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const maxAmplitude = height * 0.35;

      let data: number[];

      if (isActive && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const step = Math.floor(dataArray.length / barCount);
        data = [];
        for (let i = 0; i < barCount; i++) {
          data.push(dataArray[i * step] || 0);
        }
      } else {
        const time = Date.now() / 1000;
        data = [];
        for (let i = 0; i < barCount; i++) {
          let amplitude: number;
          if (state === 'connecting' || state === 'idle') {
            amplitude = Math.sin(time * 2 + i * 0.3) * 0.2 + 0.2;
          } else if (state === 'thinking' || state === 'listening') {
            amplitude = Math.sin(time * 4 + i * 0.5) * 0.3 + 0.3;
          } else if (state === 'speaking') {
            amplitude = Math.random() * 0.5 + 0.5;
          } else {
            amplitude = 0.1;
          }
          data.push(amplitude * 255);
        }
      }

      const smoothedData = smoothData(data);
      smoothDataRef.current = smoothedData;

      const barWidth = width / barCount;
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        const amplitude = (smoothedData[i] / 255) * maxAmplitude;
        const x = i * barWidth + gap / 2;
        const barH = Math.max(4, amplitude * 2);

        const gradient = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);

        if (state === 'speaking') {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 1)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.8)');
        } else if (state === 'thinking' || state === 'listening') {
          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
          gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.9)');
          gradient.addColorStop(1, 'rgba(168, 85, 247, 0.6)');
        } else if (state === 'connecting') {
          gradient.addColorStop(0, 'rgba(251, 191, 36, 0.5)');
          gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.8)');
          gradient.addColorStop(1, 'rgba(251, 191, 36, 0.5)');
        } else {
          gradient.addColorStop(0, 'rgba(161, 161, 170, 0.4)');
          gradient.addColorStop(0.5, 'rgba(161, 161, 170, 0.6)');
          gradient.addColorStop(1, 'rgba(161, 161, 170, 0.4)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barH, barWidth - gap, barH * 2, 4);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, state, barCount, smoothData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full h-28"
      />

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            state === 'speaking'
              ? 'bg-emerald-400 animate-pulse'
              : state === 'thinking' || state === 'listening'
              ? 'bg-purple-400 animate-pulse'
              : state === 'connecting'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-zinc-500'
          }`}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {state === 'speaking'
            ? 'Speaking'
            : state === 'thinking'
            ? 'Thinking'
            : state === 'listening'
            ? 'Listening'
            : state === 'connecting'
            ? 'Connecting'
            : 'Ready'}
        </span>
      </div>
    </motion.div>
  );
}