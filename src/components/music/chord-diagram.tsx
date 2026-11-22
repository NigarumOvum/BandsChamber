"use client";

import { useState } from "react";
import { CHROMATIC } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Guitar } from "lucide-react";

// ── Chord Diagram Generator ──────────────────────────────────────────────────

/**
 * Generate visual chord diagrams showing finger positions on a fretboard
 * for any chord type and inversion.
 */

export interface ChordDiagramProps {
  root: string;
  quality: string;
  inversion?: number;
  strings?: number; // 4-6
  frets?: number; // number of frets to show
  showFretNumbers?: boolean;
}

const CHORD_INTERVALS: Record<string, number[]> = {
  "Major": [0, 4, 7],
  "Minor": [0, 3, 7],
  "Diminished": [0, 3, 6],
  "Augmented": [0, 4, 8],
  "Major 7": [0, 4, 7, 11],
  "Minor 7": [0, 3, 7, 10],
  "Dominant 7": [0, 4, 7, 10],
  "Minor 7 b5": [0, 3, 6, 10],
  "Diminished 7": [0, 3, 6, 9],
  "6": [0, 4, 7, 9],
  "Minor 6": [0, 3, 7, 9],
  "add9": [0, 4, 7, 14],
  "sus2": [0, 2, 7],
  "sus4": [0, 5, 7],
  "Power": [0, 7],
};

// Standard guitar tuning (E2, A2, D3, G3, B3, E4)
const GUITAR_TUNING = [82, 55, 36, 26, 19, 12]; // MIDI note numbers

export function ChordDiagram({
  root,
  quality,
  inversion = 0,
  strings = 6,
  frets = 5,
  showFretNumbers = true,
}: ChordDiagramProps) {
  const [hoveredFret, setHoveredFret] = useState<number | null>(null);

  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  if (rootIndex === -1) return null;

  const intervals = CHORD_INTERVALS[quality] || [0, 4, 7];
  const baseMidi = rootIndex + 4 * 12; // Start at octave 4

  // Calculate finger positions
  const fingerPositions = calculateFingerPositions(
    intervals,
    baseMidi,
    strings,
    frets,
    inversion
  );

  const qualityLabel =
    quality === "Minor" ? "m" :
    quality === "Major" ? "" :
    quality;

  return (
    <CollapsibleCard
      defaultOpen={true}
      title={`${root}${qualityLabel} Chord Diagram`}
      subtitle="Fretboard visualization"
      eyebrow="Chords"
      icon={<Guitar className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="flex flex-col items-center gap-4">
        <GlassSurface className="rounded-lg p-4">
          <svg
            width={strings * 30 + 40}
            height={frets * 30 + 60}
            viewBox={`0 0 ${strings * 30 + 40} ${frets * 30 + 60}`}
          >
            {/* Nut */}
            <line
              x1={20}
              y1={20}
              x2={20 + (strings - 1) * 30}
              y2={20}
              stroke="var(--color-foreground)"
              strokeWidth={fingerPositions.startFret === 0 ? 4 : 1}
            />

            {/* Fret lines */}
            {Array.from({ length: frets }, (_, i) => (
              <line
                key={`fret-${i}`}
                x1={20}
                y1={20 + (i + 1) * 30}
                x2={20 + (strings - 1) * 30}
                y2={20 + (i + 1) * 30}
                stroke="var(--color-sand-2)"
                strokeWidth={1}
              />
            ))}

            {/* String lines */}
            {Array.from({ length: strings }, (_, i) => (
              <line
                key={`string-${i}`}
                x1={20 + i * 30}
                y1={20}
                x2={20 + i * 30}
                y2={20 + frets * 30}
                stroke="var(--color-sand-2)"
                strokeWidth={1}
              />
            ))}

            {/* Fret numbers */}
            {showFretNumbers &&
              Array.from({ length: frets }, (_, i) => (
                <text
                  key={`fret-num-${i}`}
                  x={10}
                  y={25 + i * 30}
                  className="fill-[var(--color-foreground-muted)] text-xs"
                  textAnchor="middle"
                >
                  {fingerPositions.startFret + i + 1}
                </text>
              ))}

            {/* Finger positions */}
            {fingerPositions.positions.map((pos, i) => (
              <g
                key={`finger-${i}`}
                onMouseEnter={() => setHoveredFret(i)}
                onMouseLeave={() => setHoveredFret(null)}
              >
                {pos.type === "finger" ? (
                  <circle
                    cx={20 + pos.string * 30}
                    cy={20 + pos.fret * 30}
                    r={12}
                    fill="var(--color-copper)"
                    className="cursor-pointer transition-all"
                    style={{
                      opacity: hoveredFret === i ? 1 : 0.8,
                      transform: hoveredFret === i ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    <title>{CHROMATIC[(rootIndex + pos.noteOffset) % 12]}</title>
                  </circle>
                ) : pos.type === "mute" ? (
                  <text
                    x={20 + pos.string * 30}
                    y={15}
                    className="fill-[var(--color-foreground-muted)] text-sm"
                    textAnchor="middle"
                  >
                    ×
                  </text>
                ) : pos.type === "open" ? (
                  <circle
                    cx={20 + pos.string * 30}
                    cy={15}
                    r={5}
                    fill="none"
                    stroke="var(--color-copper)"
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            ))}
          </svg>
        </GlassSurface>

        {/* Chord info */}
        <div className="text-sm text-[var(--color-foreground-muted)] space-y-1">
          <p>
            <strong>{root}{qualityLabel}</strong> • {strings}-string •{" "}
            {fingerPositions.startFret > 0
              ? `Barre at fret ${fingerPositions.startFret}`
              : "Open position"}
          </p>
          <p>
            Notes:{" "}
            {intervals
              .map((interval) => CHROMATIC[(rootIndex + interval) % 12])
              .join(", ")}
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

function calculateFingerPositions(
  intervals: number[],
  baseMidi: number,
  strings: number,
  frets: number,
  inversion: number
) {
  const positions: Array<{
    string: number;
    fret: number;
    type: "finger" | "open" | "mute";
    noteOffset: number;
  }> = [];

  const activeStrings = Math.min(strings, 6);
  const startFret = inversion > 0 ? 5 : 0;

  // Map intervals to strings
  const notesPerString = Math.ceil(intervals.length / activeStrings);

  for (let s = 0; s < activeStrings; s++) {
    const stringTuning = GUITAR_TUNING[5 - s]; // Reverse order (low E first)
    const intervalIndex = s * notesPerString;

    if (intervalIndex < intervals.length) {
      const interval = intervals[intervalIndex];
      const targetMidi = baseMidi + interval + inversion * 12;

      // Calculate fret position
      let fret = targetMidi - stringTuning;
      if (fret < 0) fret = 0; // Open string
      if (fret > frets + startFret) {
        positions.push({ string: s, fret: 0, type: "mute", noteOffset: interval });
        continue;
      }

      const relativeFret = fret - startFret;
      if (relativeFret >= 0 && relativeFret < frets) {
        positions.push({
          string: s,
          fret: relativeFret,
          type: "finger",
          noteOffset: interval,
        });
      } else if (fret === 0) {
        positions.push({ string: s, fret: 0, type: "open", noteOffset: interval });
      }
    } else {
      // No note for this string
      positions.push({ string: s, fret: 0, type: "mute", noteOffset: 0 });
    }
  }

  return { positions, startFret };
}
