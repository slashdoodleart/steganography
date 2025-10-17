import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { WaveformPoint } from "./utils/api";

interface AudioWaveformProps {
  audioFile?: File | null;
  highlightRegions?: { start: number; end: number }[];
  isProcessing?: boolean;
  variant?: "light" | "dark";
  waveform?: WaveformPoint[];
}

export function AudioWaveform({
  audioFile,
  highlightRegions = [],
  isProcessing = false,
  variant = "dark",
  waveform,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bars, setBars] = useState<number[]>([]);

  const fallbackBars = useMemo(
    () => Array.from({ length: 120 }, () => Math.random() * 0.8 + 0.2),
    []
  );

  const normalizedBars = useMemo(() => {
    const barCount = 120;
    if (waveform && waveform.length > 0) {
      const sorted = [...waveform].sort((a, b) => a.position - b.position);
      const step = (sorted.length - 1) / Math.max(barCount - 1, 1);
      return Array.from({ length: barCount }, (_, index) => {
        const sampleIndex = Math.min(sorted.length - 1, Math.round(index * step));
        return Math.min(Math.abs(sorted[sampleIndex].amplitude), 1);
      });
    }
    return fallbackBars;
  }, [waveform, fallbackBars]);

  useEffect(() => {
    setBars(normalizedBars);
  }, [normalizedBars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
  const barWidth = width / Math.max(bars.length, 1);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      bars.forEach((amplitude, index) => {
        const x = index * barWidth;
        const barHeight = amplitude * height * 0.8;
        const y = (height - barHeight) / 2;

        // Check if this bar is in a highlighted region
        const position = bars.length > 1 ? index / (bars.length - 1) : 0;
        const isHighlighted = highlightRegions.some(
          (region) => position >= region.start && position <= region.end
        );

        // Set color based on variant and highlight
        if (variant === "light") {
          ctx.fillStyle = isHighlighted ? "#404040" : "#B0B0B0";
        } else {
          ctx.fillStyle = isHighlighted ? "#D0D0D0" : "#505050";
        }

        ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
      });
    };

    draw();
  }, [bars, highlightRegions, variant]);

  return (
    <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-[#303030]">
      <canvas
        ref={canvasRef}
        width={800}
        height={128}
        className="w-full h-full"
      />

      {isProcessing && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}

      {!audioFile && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[#808080]">Upload audio to view waveform</p>
        </div>
      )}
    </div>
  );
}
