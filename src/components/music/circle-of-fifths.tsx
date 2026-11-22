"use client";

import { useState } from "react";
import { CHROMATIC } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Music } from "lucide-react";

// ── Circle of Fifths Visualization ─────────────────────────────────────────

/**
 * Interactive Circle of Fifths showing relationships between keys.
 * Clicking a key shows its related keys, scale, and common chords.
 */

// Circle of Fifths order (clockwise from C)
const CIRCLE_OF_FIFTHS = [
  { key: "C", sharps: 0, flats: 0, relativeMinor: "Am" },
  { key: "G", sharps: 1, flats: 0, relativeMinor: "Em" },
  { key: "D", sharps: 2, flats: 0, relativeMinor: "Bm" },
  { key: "A", sharps: 3, flats: 0, relativeMinor: "F#m" },
  { key: "E", sharps: 4, flats: 0, relativeMinor: "C#m" },
  { key: "B", sharps: 5, flats: 0, relativeMinor: "G#m" },
  { key: "F#", sharps: 6, flats: 0, relativeMinor: "D#m" },
  { key: "F", sharps: 0, flats: 1, relativeMinor: "Dm" },
  { key: "Bb", sharps: 0, flats: 2, relativeMinor: "Gm" },
  { key: "Eb", sharps: 0, flats: 3, relativeMinor: "Cm" },
  { key: "Ab", sharps: 0, flats: 4, relativeMinor: "Fm" },
  { key: "Db", sharps: 0, flats: 5, relativeMinor: "Bbm" },
] as const;

export function CircleOfFifths({
  onSelectKey,
}: {
  onSelectKey?: (key: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    onSelectKey?.(key);
  };

  const selected = CIRCLE_OF_FIFTHS.find((entry) => entry.key === selectedKey);

  // Get closely related keys (adjacent on the circle)
  const getRelatedKeys = (key: string) => {
    const index = CIRCLE_OF_FIFTHS.findIndex((entry) => entry.key === key);
    if (index === -1) return [];

    const prev = CIRCLE_OF_FIFTHS[(index - 1 + CIRCLE_OF_FIFTHS.length) % CIRCLE_OF_FIFTHS.length];
    const next = CIRCLE_OF_FIFTHS[(index + 1) % CIRCLE_OF_FIFTHS.length];
    return [prev, next];
  };

  const relatedKeys = selected ? getRelatedKeys(selected.key) : [];

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Circle of Fifths"
      subtitle="Key relationships and modulations"
      eyebrow="Theory"
      icon={<Music className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Circle visualization */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 280 280" className="w-full h-full">
              {/* Center circle */}
              <circle cx="140" cy="140" r="30" fill="none" stroke="var(--color-sand-2)" strokeWidth="1" />
              <text
                x="140"
                y="145"
                textAnchor="middle"
                className="fill-[var(--color-foreground)] text-xs font-bold"
              >
                {selectedKey || "C"}
              </text>

              {/* Outer circles for each key */}
              {CIRCLE_OF_FIFTHS.map((entry, index) => {
                const angle = (index / CIRCLE_OF_FIFTHS.length) * 2 * Math.PI - Math.PI / 2;
                const radius = 110;
                const x = 140 + radius * Math.cos(angle);
                const y = 140 + radius * Math.sin(angle);
                const isSelected = entry.key === selectedKey;
                const isRelated = relatedKeys.some((r) => r.key === entry.key);

                return (
                  <g
                    key={entry.key}
                    onClick={() => handleSelect(entry.key)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 22 : 18}
                      fill={isSelected ? "var(--color-copper)" : isRelated ? "var(--color-sand-3)" : "var(--color-sand-4)"}
                      stroke={isSelected ? "var(--color-foreground)" : "var(--color-sand-2)"}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-200"
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      className={`text-[10px] font-bold pointer-events-none ${
                        isSelected ? "fill-white" : "fill-[var(--color-foreground)]"
                      }`}
                    >
                      {entry.key}
                    </text>
                    {/* Show sharps/flats */}
                    {entry.sharps > 0 && (
                      <text
                        x={x}
                        y={y - 22}
                        textAnchor="middle"
                        className="fill-[var(--color-sand-2)] text-[8px] pointer-events-none"
                      >
                        {entry.sharps}♯
                      </text>
                    )}
                    {entry.flats > 0 && (
                      <text
                        x={x}
                        y={y - 22}
                        textAnchor="middle"
                        className="fill-[var(--color-sand-2)] text-[8px] pointer-events-none"
                      >
                        {entry.flats}♭
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Lines connecting related keys */}
              {selected &&
                CIRCLE_OF_FIFTHS.map((entry, index) => {
                  const angle = (index / CIRCLE_OF_FIFTHS.length) * 2 * Math.PI - Math.PI / 2;
                  const radius = 110;
                  const x = 140 + radius * Math.cos(angle);
                  const y = 140 + radius * Math.sin(angle);
                  const isRelated = relatedKeys.some((r) => r.key === entry.key);

                  if (!isRelated) return null;

                  return (
                    <line
                      key={`line-${entry.key}`}
                      x1="140"
                      y1="140"
                      x2={x}
                      y2={y}
                      stroke="var(--color-copper)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  );
                })}
            </svg>
          </div>
        </div>

        {/* Key details */}
        {selected && (
          <GlassSurface className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{selected.key} Major</h3>
              <span className="text-xs text-[var(--color-sand-2)]">
                {selected.sharps > 0
                  ? `${selected.sharps} sharp${selected.sharps > 1 ? "s" : ""}`
                  : selected.flats > 0
                    ? `${selected.flats} flat${selected.flats > 1 ? "s" : ""}`
                    : "No sharps or flats"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--color-sand-2)]">Relative Minor:</span>
                <span className="ml-1 font-semibold">{selected.relativeMinor}</span>
              </div>
              <div>
                <span className="text-[var(--color-sand-2)]">Parallel Minor:</span>
                <span className="ml-1 font-semibold">
                  {selected.key}{selected.key === "C" ? "m" : selected.key.includes("#") || selected.key.includes("b") ? " minor" : " minor"}
                </span>
              </div>
            </div>

            {relatedKeys.length > 0 && (
              <div>
                <span className="text-[var(--color-sand-2)] text-xs">Closely Related Keys:</span>
                <div className="flex gap-2 mt-1">
                  {relatedKeys.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => handleSelect(r.key)}
                      className="btn-gradient-border rounded-lg px-2 py-1 text-xs hover:-translate-y-0.5 transition"
                    >
                      {r.key} Major
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Diatonic chords */}
            <div>
              <span className="text-[var(--color-sand-2)] text-xs">Diatonic Chords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {getDiatonicChords(selected.key).map((chord) => (
                  <span
                    key={chord}
                    className="inline-block bg-[var(--color-sand-4)] rounded px-1.5 py-0.5 text-[10px] font-mono"
                  >
                    {chord}
                  </span>
                ))}
              </div>
            </div>
          </GlassSurface>
        )}

        {/* Legend */}
        <div className="text-[10px] text-[var(--color-sand-2)] space-y-1">
          <p>• Click a key to see its details and related keys</p>
          <p>• Related keys share at most 1 accidental difference</p>
          <p>• Move clockwise = up a perfect fifth | Counterclockwise = up a perfect fourth</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

/**
 * Get diatonic chords for a major key.
 */
function getDiatonicChords(key: string): string[] {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return [];

  // Major scale intervals and chord qualities
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  const qualities = ["", "m", "m", "", "", "m", "dim"];

  return intervals.map((interval, i) => {
    const root = CHROMATIC[(keyIndex + interval) % 12];
    return `${root}${qualities[i]}`;
  });
}
