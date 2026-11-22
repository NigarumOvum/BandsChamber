"use client";

import { useState } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LayoutList } from "lucide-react";

// ── Song Structure Timeline ──────────────────────────────────────────────────

/**
 * A visual timeline showing song sections (Intro, Verse, Chorus, Bridge, Outro)
 * with color coding and duration. Helps in the song studio and DAW for arranging.
 */

export interface SongSection {
  id: string;
  name: string;
  startBeat: number;
  duration: number; // in beats
  color: string;
}

const SECTION_COLORS: Record<string, string> = {
  "Intro": "#8B5CF6",
  "Verse": "#3B82F6",
  "Chorus": "#EF4444",
  "Bridge": "#F59E0B",
  "Outro": "#10B981",
  "Pre-Chorus": "#6366F1",
  "Solo": "#EC4899",
  "Interlude": "#14B8A6",
};

const DEFAULT_SECTIONS: SongSection[] = [
  { id: "1", name: "Intro", startBeat: 0, duration: 8, color: SECTION_COLORS["Intro"] },
  { id: "2", name: "Verse", startBeat: 8, duration: 16, color: SECTION_COLORS["Verse"] },
  { id: "3", name: "Chorus", startBeat: 24, duration: 16, color: SECTION_COLORS["Chorus"] },
  { id: "4", name: "Verse", startBeat: 40, duration: 16, color: SECTION_COLORS["Verse"] },
  { id: "5", name: "Chorus", startBeat: 56, duration: 16, color: SECTION_COLORS["Chorus"] },
  { id: "6", name: "Bridge", startBeat: 72, duration: 8, color: SECTION_COLORS["Bridge"] },
  { id: "7", name: "Chorus", startBeat: 80, duration: 16, color: SECTION_COLORS["Chorus"] },
  { id: "8", name: "Outro", startBeat: 96, duration: 8, color: SECTION_COLORS["Outro"] },
];

export function SongTimeline({
  sections = DEFAULT_SECTIONS,
  bpm = 120,
  onSectionsChange,
}: {
  sections?: SongSection[];
  bpm?: number;
  onSectionsChange?: (sections: SongSection[]) => void;
}) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);

  const totalBeats = sections.reduce((max, s) => Math.max(max, s.startBeat + s.duration), 0);
  const totalDuration = (totalBeats * 60) / (bpm * 4); // seconds
  const pixelsPerBeat = 20;

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Song Structure Timeline"
      subtitle="Visualize and arrange song sections"
      eyebrow="Arrange"
      icon={<LayoutList className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Timeline */}
        <GlassSurface className="rounded-lg overflow-hidden">
          <div
            className="overflow-x-auto"
            style={{ height: 120 }}
          >
            <div
              style={{
                width: totalBeats * pixelsPerBeat,
                position: "relative",
                height: "100%",
              }}
            >
              {/* Beat grid */}
              {Array.from({ length: totalBeats + 1 }, (_, i) => (
                <div
                  key={`beat-${i}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: i * pixelsPerBeat,
                    borderLeft: i % 4 === 0 ? "1px solid var(--color-sand-2)" : "1px solid var(--color-sand-3)",
                  }}
                >
                  {i % 4 === 0 && (
                    <span className="absolute top-0 left-1 text-[10px] text-[var(--color-foreground-muted)]">
                      {i}
                    </span>
                  )}
                </div>
              ))}

              {/* Sections */}
              {sections.map((section) => {
                const x = section.startBeat * pixelsPerBeat;
                const width = section.duration * pixelsPerBeat;
                const isSelected = selectedSection === section.id;

                return (
                  <div
                    key={section.id}
                    className="absolute top-8 bottom-8 cursor-pointer transition-all"
                    style={{
                      left: x,
                      width,
                      background: `${section.color}33`,
                      border: `2px solid ${isSelected ? section.color : "transparent"}`,
                      borderRadius: 4,
                    }}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <span
                      className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-medium"
                      style={{ color: section.color }}
                    >
                      {section.name}
                    </span>
                    <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-[var(--color-foreground-muted)]">
                      {section.duration} beats
                    </span>
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-copper)] z-10"
                style={{ left: currentBeat * pixelsPerBeat }}
              />
            </div>
          </div>
        </GlassSurface>

        {/* Section Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(SECTION_COLORS).map(([name, color]) => (
            <div
              key={name}
              className="flex items-center gap-1 text-xs"
            >
              <div
                className="w-3 h-3 rounded"
                style={{ background: color }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="text-sm text-[var(--color-foreground-muted)] space-y-1">
          <p>
            <strong>{sections.length}</strong> sections •{" "}
            <strong>{totalBeats}</strong> beats •{" "}
            <strong>{totalDuration.toFixed(1)}</strong>s at {bpm} BPM
          </p>
        </div>

        {/* Section Details */}
        {selectedSection && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Selected Section</h4>
            {sections
              .filter((s) => s.id === selectedSection)
              .map((section) => (
                <div
                  key={section.id}
                  className="text-xs p-2 rounded bg-[var(--color-sand-4)]"
                  style={{ borderLeft: `3px solid ${section.color}` }}
                >
                  <p><strong>{section.name}</strong></p>
                  <p>Beats: {section.startBeat} - {section.startBeat + section.duration}</p>
                  <p>
                    Duration: {((section.duration * 60) / (bpm * 4)).toFixed(1)}s
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
