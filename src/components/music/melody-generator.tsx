"use client";

import { useState, useCallback } from "react";
import { CHROMATIC, noteFrequency } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Music, Play, Download } from "lucide-react";
import { usePersistentState } from "@/lib/persist";

// ── Melody Generator ────────────────────────────────────────────────────────

/**
 * Generate melodies from selected scale.
 * Supports pentatonic-based, blues-style, and jazz-style patterns.
 */

type MelodyStyle = "pentatonic" | "blues" | "jazz" | "random";

interface MelodyNote {
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
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export function MelodyGenerator() {
  const [key, setKey] = usePersistentState("melody_key", "C");
  const [scale, setScale] = usePersistentState("melody_scale", "Pentatonic Major");
  const [style, setStyle] = usePersistentState<MelodyStyle>("melody_style", "pentatonic");
  const [bpm, setBpm] = useState(120);
  const [numBars, setNumBars] = useState(4);
  const [melody, setMelody] = useState<MelodyNote[]>([]);

  const generateMelody = useCallback(() => {
    const notes: MelodyNote[] = [];
    const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
    if (keyIndex === -1) return;

    const scaleNotes = SCALE_INTERVALS[scale] || SCALE_INTERVALS["Pentatonic Major"];
    const scalePitchClasses = scaleNotes.map((interval) =>
      CHROMATIC[(keyIndex + interval) % 12]
    );

    const bars = numBars;
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;

    let currentBeat = 0;
    let currentOctave = 4;
    let lastNoteIndex = Math.floor(scalePitchClasses.length / 2);

    while (currentBeat < totalBeats) {
      let noteIndex: number;
      let duration: number;

      switch (style) {
        case "pentatonic": {
          // Pentatonic: stepwise motion with occasional leaps
          const step = Math.random() > 0.7 ? 2 : Math.random() > 0.5 ? 1 : -1;
          noteIndex = Math.max(0, Math.min(scalePitchClasses.length - 1, lastNoteIndex + step));
          duration = Math.random() > 0.7 ? 2 : Math.random() > 0.5 ? 1 : 0.5;
          break;
        }
        case "blues": {
          // Blues: bend-like patterns, blue notes
          noteIndex = Math.floor(Math.random() * scalePitchClasses.length);
          duration = Math.random() > 0.6 ? 1.5 : Math.random() > 0.3 ? 1 : 0.5;
          // Add some repetition for blues feel
          if (Math.random() > 0.7) {
            notes.push({
              note: scalePitchClasses[noteIndex],
              octave: currentOctave,
              duration,
            });
            currentBeat += duration;
            continue;
          }
          break;
        }
        case "jazz": {
          // Jazz: chromatic approach notes, wider leaps
          if (Math.random() > 0.6) {
            // Chromatic approach
            noteIndex = (lastNoteIndex + 1) % scalePitchClasses.length;
          } else {
            noteIndex = Math.floor(Math.random() * scalePitchClasses.length);
          }
          duration = Math.random() > 0.5 ? 1 : 0.5;
          break;
        }
        case "random":
        default: {
          noteIndex = Math.floor(Math.random() * scalePitchClasses.length);
          duration = [0.5, 1, 1, 2][Math.floor(Math.random() * 4)];
          break;
        }
      }

      // Octave changes
      if (noteIndex > lastNoteIndex + 2) currentOctave = Math.min(5, currentOctave + 1);
      if (noteIndex < lastNoteIndex - 2) currentOctave = Math.max(3, currentOctave - 1);

      notes.push({
        note: scalePitchClasses[noteIndex],
        octave: currentOctave,
        duration,
      });

      lastNoteIndex = noteIndex;
      currentBeat += duration;
    }

    setMelody(notes);
  }, [key, scale, style, bpm, numBars]);

  const playMelody = useCallback(() => {
    let time = 0;
    const beatDuration = 60 / bpm;

    melody.forEach((note) => {
      const frequency = noteFrequency(note.note, note.octave);
      if (!frequency) return;

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + time);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + note.duration * beatDuration * 0.9);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(ctx.currentTime + time);
        oscillator.stop(ctx.currentTime + time + note.duration * beatDuration);
      } catch {
        // Audio not available
      }

      time += note.duration * beatDuration;
    });
  }, [melody, bpm]);

  const exportAsText = useCallback(() => {
    const text = melody
      .map((n) => `${n.note}${n.octave} (${n.duration} beats)`)
      .join(" → ");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "melody.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [melody]);

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Melody Generator"
      subtitle="Generate melodies from selected scale"
      eyebrow="Melody"
      icon={<Music className="h-5 w-5 text-[var(--color-copper)]" />}
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
              onChange={(e) => setStyle(e.target.value as MelodyStyle)}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
            >
              <option value="pentatonic">Pentatonic</option>
              <option value="blues">Blues</option>
              <option value="jazz">Jazz</option>
              <option value="random">Random</option>
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

          <div>
            <label className="text-xs text-[var(--color-sand-2)]">Bars:</label>
            <input
              type="number"
              value={numBars}
              onChange={(e) => setNumBars(Number(e.target.value))}
              className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs mt-1"
              min={1}
              max={16}
            />
          </div>
        </div>

        {/* Generate button */}
        <div className="flex gap-2">
          <button
            onClick={generateMelody}
            className="flex-1 btn-gradient-border rounded-lg px-3 py-2 text-sm"
          >
            Generate
          </button>
          <button
            onClick={playMelody}
            disabled={!melody.length}
            className="btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <Play className="h-4 w-4 inline mr-1" />
            Play
          </button>
          <button
            onClick={exportAsText}
            disabled={!melody.length}
            className="btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 inline mr-1" />
            Export
          </button>
        </div>

        {/* Melody display */}
        {melody.length > 0 && (
          <GlassSurface className="p-3">
            <div className="flex flex-wrap gap-1">
              {melody.map((note, i) => (
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
          <p>• Pentatonic: Stepwise motion with occasional leaps</p>
          <p>• Blues: Repetitive patterns with blue notes</p>
          <p>• Jazz: Chromatic approach notes and wider leaps</p>
          <p>• Random: Fully random note selection</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
