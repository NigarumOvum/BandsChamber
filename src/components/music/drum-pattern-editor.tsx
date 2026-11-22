"use client";

import { useState, useCallback, useRef } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Drum, Play, Square, Download } from "lucide-react";
import { RHYTHM_PATTERNS, getRhythmCategories, type RhythmCategory } from "@/lib/music/rhythm-patterns";

// ── Drum Pattern Editor ────────────────────────────────────────────────────

/**
 * Visual drum pattern editor with step sequencer grid.
 * Supports preset patterns and MIDI export.
 */

const DRUM_SOUNDS = ["Kick", "Snare", "Hi-Hat", "Clap", "Tom", "Crash"] as const;
const STEPS = 16; // 16-step sequencer

type GridState = Record<string, boolean[]>;

export function DrumPatternEditor() {
  const [grid, setGrid] = useState<GridState>(() => {
    const initial: GridState = {};
    for (const sound of DRUM_SOUNDS) {
      initial[sound] = new Array(STEPS).fill(false);
    }
    return initial;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(120);
  const [selectedCategory, setSelectedCategory] = useState<RhythmCategory | "All">("All");
  const intervalRef = useRef<number | null>(null);

  const toggleStep = useCallback((sound: string, step: number) => {
    setGrid((prev) => {
      const newGrid = { ...prev };
      const soundGrid = [...(newGrid[sound] || new Array(STEPS).fill(false))];
      soundGrid[step] = !soundGrid[step];
      newGrid[sound] = soundGrid;
      return newGrid;
    });
  }, []);

  const playPattern = useCallback(() => {
    let step = 0;
    const stepDuration = (60 / bpm / 4) * 1000; // 16th notes

    intervalRef.current = window.setInterval(() => {
      setCurrentStep(step);

      // Play sounds for this step
      for (const sound of DRUM_SOUNDS) {
        if (grid[sound]?.[step]) {
          playDrumSound(sound);
        }
      }

      step = (step + 1) % STEPS;
    }, stepDuration);

    setIsPlaying(true);
  }, [grid, bpm]);

  const stopPattern = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  const playDrumSound = useCallback((sound: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      switch (sound) {
        case "Kick":
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.8, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        case "Snare":
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          break;
        case "Hi-Hat":
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          break;
        case "Clap":
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          break;
        case "Tom":
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(100, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.6, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        case "Crash":
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          break;
      }

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  const loadPreset = useCallback((presetName: string) => {
    const preset = RHYTHM_PATTERNS.find((p) => p.name === presetName);
    if (!preset) return;

    const newGrid: GridState = {};
    for (const sound of DRUM_SOUNDS) {
      newGrid[sound] = new Array(STEPS).fill(false);
    }

    // Map preset beats to drum sounds
    for (const beat of preset.beats) {
      const step = (beat.position - 1) * 2; // Convert to 16th note grid
      if (beat.accent === "strong") {
        newGrid["Kick"][step] = true;
      } else if (beat.accent === "medium") {
        newGrid["Snare"][step] = true;
      }
      // Add hi-hat on all beats
      newGrid["Hi-Hat"][step] = true;
      if (step + 1 < STEPS) {
        newGrid["Hi-Hat"][step + 1] = true;
      }
    }

    setGrid(newGrid);
    setBpm(preset.bpm);
  }, []);

  const exportMIDI = useCallback(() => {
    // Simple MIDI export - creates a basic MIDI file with drum track
    const midiData = createMidiFile(grid, bpm);
    const blob = new Blob([midiData], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drum-pattern.mid";
    a.click();
    URL.revokeObjectURL(url);
  }, [grid, bpm]);

  const filteredPatterns =
    selectedCategory === "All"
      ? RHYTHM_PATTERNS
      : RHYTHM_PATTERNS.filter((p) => p.category === selectedCategory);

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Drum Pattern Editor"
      subtitle="Step sequencer with presets and MIDI export"
      eyebrow="Rhythm"
      icon={<Drum className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? stopPattern : playPattern}
            className={`btn-gradient-border rounded-full p-2 ${
              isPlaying ? "bg-red-500/20" : "bg-green-500/20"
            }`}
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--color-sand-2)]">BPM:</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs"
              min={40}
              max={300}
            />
          </div>

          <button
            onClick={exportMIDI}
            className="btn-gradient-border rounded-lg px-2 py-1 text-xs ml-auto"
          >
            <Download className="h-3 w-3 inline mr-1" />
            Export MIDI
          </button>
        </div>

        {/* Sequencer Grid */}
        <GlassSurface className="p-3 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Step indicators */}
            <div className="flex mb-2 ml-20">
              {Array.from({ length: STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center text-[8px] ${
                    i % 4 === 0 ? "font-bold" : ""
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Drum rows */}
            {DRUM_SOUNDS.map((sound) => (
              <div key={sound} className="flex items-center mb-1">
                <span className="w-16 text-xs text-[var(--color-sand-2)]">{sound}</span>
                <div className="flex-1 flex gap-0.5">
                  {grid[sound]?.map((active, step) => (
                    <button
                      key={step}
                      onClick={() => toggleStep(sound, step)}
                      className={`flex-1 h-6 rounded-sm transition-all ${
                        active
                          ? "bg-[var(--color-copper)]"
                          : step === currentStep
                            ? "bg-[var(--color-sand-3)]"
                            : step % 4 === 0
                              ? "bg-[var(--color-sand-4)]"
                              : "bg-[var(--color-sand-4)]/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassSurface>

        {/* Presets */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-sand-2)]">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as RhythmCategory | "All")}
              className="bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded px-2 py-1 text-xs"
            >
              <option value="All">All</option>
              {getRhythmCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1">
            {filteredPatterns.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset.name)}
                className="btn-gradient-border rounded-lg px-2 py-1 text-[10px] hover:-translate-y-0.5 transition"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Help text */}
        <div className="text-[10px] text-[var(--color-sand-2)] space-y-1">
          <p>• Click cells to toggle drum hits on/off</p>
          <p>• Load presets to get started quickly</p>
          <p>• Export your pattern as a MIDI file</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

/**
 * Create a simple MIDI file from the drum grid.
 */
function createMidiFile(grid: GridState, bpm: number): ArrayBuffer {
  // MIDI header
  const header = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // chunk size
    0x00, 0x00, // format 0
    0x00, 0x01, // 1 track
    0x00, 0x3c, // 60 ticks per quarter
  ]);

  // Calculate tempo (microseconds per quarter note)
  const tempo = Math.round(60000000 / bpm);
  const tempoMeta = new Uint8Array([
    0xff, 0x51, 0x03, // tempo meta event
    (tempo >> 16) & 0xff,
    (tempo >> 8) & 0xff,
    tempo & 0xff,
  ]);

  // Build track data
  const trackData: number[] = [];

  // Add tempo
  trackData.push(0); // delta time
  for (const byte of tempoMeta) {
    trackData.push(byte);
  }

  // Add note events for each drum sound
  const drumNotes: Record<string, number> = {
    Kick: 36,
    Snare: 38,
    "Hi-Hat": 42,
    Clap: 39,
    Tom: 41,
    Crash: 49,
  };

  for (const sound of DRUM_SOUNDS) {
    const note = drumNotes[sound] || 36;
    let lastStep = -1;

    for (let step = 0; step < STEPS; step++) {
      const delta = grid[sound]?.[step] ? step - lastStep - 1 : step - lastStep;
      lastStep = step;

      if (grid[sound]?.[step]) {
        // Note on
        trackData.push(0);
        trackData.push(0x90); // Note on channel 10 (drums)
        trackData.push(note);
        trackData.push(0x40); // velocity
        // Note off
        trackData.push(1);
        trackData.push(0x80); // Note off
        trackData.push(note);
        trackData.push(0);
      } else if (delta > 0) {
        trackData.push(delta);
      }
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
