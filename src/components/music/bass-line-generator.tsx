"use client";

import { useState, useCallback } from "react";
import { CHROMATIC, noteFrequency, intervalsToPitchClasses } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Guitar, Play, Download } from "lucide-react";
import { usePersistentState } from "@/lib/persist";

// ── Bass Line Generator ─────────────────────────────────────────────────────

/**
 * Generate bass lines from chord progressions.
 * Supports root-fifth patterns, walking bass, and syncopated patterns.
 */

type BassStyle = "root-fifth" | "walking" | "syncopated" | "chromatic";

interface BassNote {
  note: string;
  octave: number;
  duration: number; // In beats
}

const SCALE_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  "Pentatonic Major": [0, 2, 4, 7, 9],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
};

export function BassLineGenerator() {
  const [key, setKey] = usePersistentState("bass_key", "C");
  const [scale, setScale] = usePersistentState("bass_scale", "Major");
  const [style, setStyle] = usePersistentState<BassStyle>("bass_style", "root-fifth");
  const [chords, setChords] = useState<string[]>(["C", "G", "Am", "F"]);
  const [bpm, setBpm] = useState(120);
  const [bassLine, setBassLine] = useState<BassNote[]>([]);

  const generateBassLine = useCallback(() => {
    const notes: BassNote[] = [];
    const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
    if (keyIndex === -1) return;

    const scaleNotes = SCALE_INTERVALS[scale] || SCALE_INTERVALS.Major;

    for (const chord of chords) {
      const chordIndex = CHROMATIC.indexOf(chord as (typeof CHROMATIC)[number]);
      if (chordIndex === -1) continue;

      switch (style) {
        case "root-fifth": {
          // Root note for 2 beats, fifth for 2 beats
          const fifth = CHROMATIC[(chordIndex + 7) % 12];
          notes.push({ note: chord, octave: 2, duration: 2 });
          notes.push({ note: fifth, octave: 2, duration: 2 });
          break;
        }
        case "walking": {
          // Walking bass: 4 quarter notes per chord
          const scaleDegree = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
          notes.push({ note: chord, octave: 2, duration: 1 });
          notes.push({
            note: CHROMATIC[(chordIndex + scaleNotes[1] || 2) % 12],
            octave: 2,
            duration: 1,
          });
          notes.push({
            note: CHROMATIC[(chordIndex + scaleNotes[2] || 4) % 12],
            octave: 2,
            duration: 1,
          });
          notes.push({
            note: CHROMATIC[(chordIndex + scaleNotes[0]) % 12],
            octave: 2,
            duration: 1,
          });
          break;
        }
        case "syncopated": {
          // Syncopated: eighth note patterns
          notes.push({ note: chord, octave: 2, duration: 0.5 });
          notes.push({ note: chord, octave: 2, duration: 0.5 });
          notes.push({ note: CHROMATIC[(chordIndex + 3) % 12], octave: 2, duration: 1 });
          notes.push({ note: CHROMATIC[(chordIndex + 5) % 12], octave: 2, duration: 1 });
          break;
        }
        case "chromatic": {
          // Chromatic approach notes
          const approach = CHROMATIC[(chordIndex + 1) % 12];
          notes.push({ note: approach, octave: 2, duration: 1 });
          notes.push({ note: chord, octave: 2, duration: 1 });
          notes.push({ note: CHROMATIC[(chordIndex + 7) % 12], octave: 2, duration: 1 });
          notes.push({ note: CHROMATIC[(chordIndex + 5) % 12], octave: 2, duration: 1 });
          break;
        }
      }
    }

    setBassLine(notes);
  }, [key, scale, style, chords]);

  const playBassLine = useCallback(() => {
    let time = 0;
    const beatDuration = 60 / bpm;

    bassLine.forEach((note) => {
      const frequency = noteFrequency(note.note, note.octave);
      if (!frequency) return;

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + time);

        // Low-pass filter for bass sound
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime + time);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + note.duration * beatDuration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(ctx.currentTime + time);
        oscillator.stop(ctx.currentTime + time + note.duration * beatDuration);
      } catch {
        // Audio not available
      }

      time += note.duration * beatDuration;
    });
  }, [bassLine, bpm]);

  const exportAsText = useCallback(() => {
    const text = bassLine
      .map((n) => `${n.note}${n.octave} (${n.duration} beats)`)
      .join(" → ");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bass-line.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [bassLine]);

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Bass Line Generator"
      subtitle="Generate bass lines from chord progressions"
      eyebrow="Bass"
      icon={<Guitar className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-sand-2)]">Key:</label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
            >
              {CHROMATIC.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--color-sand-2)]">Scale:</label>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
            >
              {Object.keys(SCALE_INTERVALS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--color-sand-2)]">Style:</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as BassStyle)}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
            >
              <option value="root-fifth">Root-Fifth</option>
              <option value="walking">Walking Bass</option>
              <option value="syncopated">Syncopated</option>
              <option value="chromatic">Chromatic</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--color-sand-2)]">BPM:</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
              min={40}
              max={300}
            />
          </div>
        </div>

        {/* Chord input */}
        <div>
          <label className="text-xs text-[var(--color-sand-2)]">Chords (comma-separated):</label>
          <input
            type="text"
            value={chords.join(", ")}
            onChange={(e) => setChords(e.target.value.split(",").map((c) => c.trim()))}
            className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-3 py-2 text-sm mt-1"
            placeholder="C, G, Am, F"
          />
        </div>

        {/* Generate button */}
        <div className="flex gap-2">
          <button
            onClick={generateBassLine}
            className="flex-1 btn-gradient-border rounded-lg px-3 py-2 text-sm"
          >
            Generate
          </button>
          <button
            onClick={playBassLine}
            disabled={!bassLine.length}
            className="btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <Play className="h-4 w-4 inline mr-1" />
            Play
          </button>
          <button
            onClick={exportAsText}
            disabled={!bassLine.length}
            className="btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 inline mr-1" />
            Export
          </button>
        </div>

        {/* Bass line display */}
        {bassLine.length > 0 && (
          <GlassSurface className="p-3">
            <div className="flex flex-wrap gap-1">
              {bassLine.map((note, i) => (
                <span
                  key={i}
                  className="inline-block bg-[var(--color-sand-4)] rounded px-2 py-1 text-xs font-mono"
                >
                  {note.note}{note.octave}
                  <span className="text-[var(--color-sand-2)] ml-1">({note.duration}b)</span>
                </span>
              ))}
            </div>
          </GlassSurface>
        )}

        {/* Help text */}
        <div className="text-[10px] text-[var(--color-sand-2)] space-y-1">
          <p>• Root-Fifth: Simple root and fifth pattern</p>
          <p>• Walking Bass: Jazz-style walking bass line</p>
          <p>• Syncopated: Off-beat eighth note patterns</p>
          <p>• Chromatic: Approach notes from above</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
