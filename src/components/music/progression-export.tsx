"use client";

import { useState, useCallback } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Download, FileMusic } from "lucide-react";

// ── Progression Export ───────────────────────────────────────────────────────

/**
 * Export chord progressions as MIDI files.
 * Creates a simple MIDI file with chord notes on channel 1.
 */

export function ProgressionExport({
  chords,
  bpm = 120,
}: {
  chords: { root: string; quality: string; duration?: number }[];
  bpm?: number;
}) {
  const [exporting, setExporting] = useState(false);

  const exportAsMIDI = useCallback(() => {
    setExporting(true);
    try {
      const midiData = createChordMidi(chords, bpm);
      const blob = new Blob([midiData], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "progression.mid";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export failed
    } finally {
      setExporting(false);
    }
  }, [chords, bpm]);

  const exportAsText = useCallback(() => {
    const text = chords.map((c) => `${c.root}${c.quality}`).join(" | ");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "progression.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [chords]);

  if (!chords.length) {
    return null;
  }

  return (
    <CollapsibleCard
      defaultOpen={false}
      title="Export Progression"
      subtitle="Download as MIDI or text"
      eyebrow="Export"
      icon={<FileMusic className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Chord preview */}
        <GlassSurface className="p-3">
          <div className="flex flex-wrap gap-2">
            {chords.map((chord, i) => (
              <span
                key={i}
                className="inline-block bg-[var(--color-sand-4)] rounded px-2 py-1 text-xs font-mono"
              >
                {chord.root}
                {chord.quality === "Major" ? "" : chord.quality === "Minor" ? "m" : chord.quality}
              </span>
            ))}
          </div>
        </GlassSurface>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={exportAsMIDI}
            disabled={exporting}
            className="flex-1 btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 inline mr-1" />
            {exporting ? "Exporting..." : "Export MIDI"}
          </button>
          <button
            onClick={exportAsText}
            className="btn-gradient-border rounded-lg px-3 py-2 text-sm"
          >
            <Download className="h-4 w-4 inline mr-1" />
            Export Text
          </button>
        </div>

        {/* Help text */}
        <div className="text-[10px] text-[var(--color-sand-2)] space-y-1">
          <p>• MIDI export creates a simple file with chord notes</p>
          <p>• Text export creates a plain text chord chart</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

/**
 * Create a MIDI file from chord progression.
 */
function createChordMidi(
  chords: { root: string; quality: string; duration?: number }[],
  bpm: number
): ArrayBuffer {
  const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const chordIntervals: Record<string, number[]> = {
    Major: [0, 4, 7],
    Minor: [0, 3, 7],
    "Major 7": [0, 4, 7, 11],
    "Minor 7": [0, 3, 7, 10],
    "Dominant 7": [0, 4, 7, 10],
    Diminished: [0, 3, 6],
    Augmented: [0, 4, 8],
  };

  // MIDI header
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // chunk size
    0x00, 0x00, // format 0
    0x00, 0x01, // 1 track
    0x00, 0x3c, // 60 ticks per quarter
  ]);

  // Tempo
  const tempo = Math.round(60000000 / bpm);
  const tempoMeta = new Uint8Array([
    0xff, 0x51, 0x03,
    (tempo >> 16) & 0xff,
    (tempo >> 8) & 0xff,
    tempo & 0xff,
  ]);

  // Build track data
  const trackData: number[] = [];
  trackData.push(0); // delta time
  for (const byte of tempoMeta) {
    trackData.push(byte);
  }

  // Add chord events
  for (const chord of chords) {
    const rootIndex = CHROMATIC.indexOf(chord.root);
    if (rootIndex === -1) continue;

    const intervals = chordIntervals[chord.quality] || [0, 4, 7];
    const beats = chord.duration || 4;

    // Note on for each chord note
    for (const interval of intervals) {
      const note = rootIndex + interval + 24; // MIDI note number (start at C2)
      trackData.push(0); // delta time
      trackData.push(0x90); // Note on channel 1
      trackData.push(note);
      trackData.push(0x40); // velocity
    }

    // Wait for duration
    trackData.push(beats * 60); // ticks (60 ticks per quarter)

    // Note off for each chord note
    for (const interval of intervals) {
      const note = rootIndex + interval + 24;
      trackData.push(0); // delta time
      trackData.push(0x80); // Note off channel 1
      trackData.push(note);
      trackData.push(0);
    }
  }

  // End of track
  trackData.push(0);
  trackData.push(0xff);
  trackData.push(0x2f);
  trackData.push(0x00);

  // Track header
  const trackHeader = new Uint8Array([
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackData.length >> 24) & 0xff,
    (trackData.length >> 16) & 0xff,
    (trackData.length >> 8) & 0xff,
    trackData.length & 0xff,
  ]);

  // Combine all parts
  const result = new Uint8Array(header.length + trackHeader.length + trackData.length);
  result.set(header, 0);
  result.set(trackHeader, header.length);
  result.set(new Uint8Array(trackData), header.length + trackHeader.length);

  return result.buffer;
}
