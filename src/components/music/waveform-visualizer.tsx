"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Activity, Play, Square } from "lucide-react";

// ── Waveform Visualizer ──────────────────────────────────────────────────────

/**
 * Real-time waveform visualization for audio input.
 * Uses canvas with frequency spectrum overlay.
 */

export function WaveformVisualizer({
  stream,
  showSpectrum = true,
}: {
  stream?: MediaStream | null;
  showSpectrum?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const setupAudio = useCallback(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    setIsAnalyzing(true);
  }, [stream]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyArray = new Uint8Array(bufferLength);

    const width = canvas.width;
    const height = canvas.height;

    const drawFrame = () => {
      animationRef.current = requestAnimationFrame(drawFrame);

      analyser.getByteTimeDomainData(dataArray);
      if (showSpectrum) {
        analyser.getByteFrequencyData(frequencyArray);
      }

      ctx.fillStyle = "var(--color-sand-5)";
      ctx.fillRect(0, 0, width, height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = "var(--color-copper)";
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw frequency spectrum
      if (showSpectrum) {
        const barWidth = (width / bufferLength) * 2.5;
        let barX = 0;

        ctx.globalAlpha = 0.3;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (frequencyArray[i] / 255) * height;

          ctx.fillStyle = `hsl(${(i / bufferLength) * 60 + 20}, 70%, 50%)`;
          ctx.fillRect(barX, height - barHeight, barWidth, barHeight);

          barX += barWidth + 1;
        }
        ctx.globalAlpha = 1.0;
      }
    };

    drawFrame();
  }, [showSpectrum]);

  useEffect(() => {
    if (stream) {
      setupAudio();
    }
  }, [stream, setupAudio]);

  useEffect(() => {
    if (isAnalyzing) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContextRef.current?.close();
    };
  }, [isAnalyzing, draw]);

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Waveform Visualizer"
      subtitle="Real-time audio visualization"
      eyebrow="Audio"
      icon={<Activity className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        <GlassSurface className="rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-auto"
          />
        </GlassSurface>

        {!stream && (
          <div className="text-sm text-[var(--color-foreground-muted)] text-center py-8">
            <p>Connect an audio stream to visualize waveform</p>
            <p className="text-xs mt-1">Use the tuner or microphone input</p>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
