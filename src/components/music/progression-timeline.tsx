"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ProgressionChord } from "@/lib/music/progression-presets";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Play, Square } from "lucide-react";

// ── Progression Timeline Visualization ───────────────────────────────────────

/**
 * Visual timeline showing chord durations, measure boundaries, and a playhead.
 * Makes the progression builder feel more like a real DAW.
 */

const BEAT_WIDTH = 80;
const BEATS_PER_MEASURE = 4;

export function ProgressionTimeline({
  chords,
  beatsPerChord = 4,
  bpm = 120,
  isPlaying,
  currentBeat,
  onPlay,
  onStop,
}: {
  chords: ProgressionChord[];
  beatsPerChord?: number;
  bpm?: number;
  isPlaying: boolean;
  currentBeat: number;
  onPlay: () => void;
  onStop: () => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const totalBeats = chords.length * beatsPerChord;

  // Auto-scroll playhead
  useEffect(() => {
    if (isPlaying && timelineRef.current) {
      const playheadX = currentBeat * BEAT_WIDTH;
      const container = timelineRef.current;
      const containerWidth = container.clientWidth;

      if (playheadX > container.scrollLeft + containerWidth - 100) {
        container.scrollTo({ left: playheadX - 100, behavior: "smooth" });
      }
    }
  }, [currentBeat, isPlaying]);

  // Format chord label
  const formatChord = (chord: ProgressionChord) => {
    const qualityMap: Record<string, string> = {
      "Maj": "",
      "min": "m",
      "7": "7",
      "Maj7": "maj7",
      "min7": "m7",
      "min9": "m9",
      "Maj9": "maj9",
      "Dominant 9": "9",
      "sus4": "sus4",
      "Power": "5",
    };
    const quality = qualityMap[chord.quality] || chord.quality;
    return `${chord.root}${quality}`;
  };

  // Get chord color based on function
  const getChordColor = (index: number) => {
    const colors = [
      "bg-blue-500/30 border-blue-500",
      "bg-purple-500/30 border-purple-500",
      "bg-green-500/30 border-green-500",
      "bg-yellow-500/30 border-yellow-500",
      "bg-red-500/30 border-red-500",
      "bg-pink-500/30 border-pink-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Progression Timeline"
      subtitle="Visual timeline with playhead"
      eyebrow="DAW"
      icon={<Play className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? onStop : onPlay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-copper)] text-white hover:opacity-90 transition-opacity"
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Stop" : "Play"}
          </button>
          <span className="text-sm text-[var(--color-foreground-muted)]">
            {currentBeat.toFixed(1)} / {totalBeats} beats • {bpm} BPM
          </span>
        </div>

        {/* Timeline */}
        <GlassSurface className="rounded-lg overflow-hidden">
          <div
            ref={timelineRef}
            className="overflow-x-auto"
            style={{ height: 120 }}
          >
            <div style={{ width: totalBeats * BEAT_WIDTH, position: "relative" }}>
              {/* Measure grid */}
              {Array.from({ length: totalBeats / BEATS_PER_MEASURE + 1 }, (_, i) => {
                const x = i * BEATS_PER_MEASURE * BEAT_WIDTH;
                return (
                  <div
                    key={`measure-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: x,
                      borderLeft: "2px solid var(--color-sand-2)",
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] text-[var(--color-foreground-muted)]">
                      {i + 1}
                    </span>
                  </div>
                );
              })}

              {/* Beat grid */}
              {Array.from({ length: totalBeats + 1 }, (_, i) => {
                if (i % BEATS_PER_MEASURE === 0) return null;
                const x = i * BEAT_WIDTH;
                return (
                  <div
                    key={`beat-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: x,
                      borderLeft: "1px solid var(--color-sand-3)",
                    }}
                  />
                );
              })}

              {/* Chord blocks */}
              {chords.map((chord, index) => {
                const x = index * beatsPerChord * BEAT_WIDTH;
                const width = beatsPerChord * BEAT_WIDTH;
                const isActive = currentBeat >= x / BEAT_WIDTH && currentBeat < (x + width) / BEAT_WIDTH;

                return (
                  <div
                    key={index}
                    className={`absolute top-16 bottom-16 border-2 rounded transition-all ${getChordColor(index)}`}
                    style={{
                      left: x,
                      width,
                      opacity: isActive ? 1 : 0.7,
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold">
                      {formatChord(chord)}
                    </span>
                  </div>
                );
              })}

              {/* Playhead */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-copper)] z-10 transition-all"
                  style={{ left: currentBeat * BEAT_WIDTH }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-[var(--color-copper)] rotate-45 transform" />
                </div>
              )}
            </div>
          </div>
        </GlassSurface>
      </div>
    </CollapsibleCard>
  );
}
