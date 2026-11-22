"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Layers, Music, PlayCircle, Plus, Repeat, Trash2, Zap, Headphones, Minus, Plus as PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { CollapsibleCard } from "@/components/collapsible-card";
import { useI18n } from "@/components/language-provider";
import { useCurrentUserId, usePersistentState } from "@/lib/persist";
import { useAudio } from "@/components/music/audio-provider";
import { playKeyboardNote, preloadVoice, KEYBOARD_VOICES, type KeyboardVoice } from "@/lib/music/keyboard-synth";
import { CHROMATIC, noteFrequency } from "@/lib/music/notes";
import {
  PROGRESSION_CATEGORIES,
  PROGRESSION_PRESETS,
  transposePreset,
  type ProgressionPreset,
} from "@/lib/music/progression-presets";

const NOTES: string[] = [...CHROMATIC];
const QUALITIES = ["Maj", "min", "7", "maj7", "min7", "dim", "sus4", "sus2", "aug", "dim7"];
const ROMAN_NUMERALS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const DEGREE_ROOTS = [0, 2, 4, 5, 7, 9, 11];
const FUNCTIONS: Record<string, string> = {
  I: "Tonic",
  IV: "Subdominant",
  V: "Dominant",
  vi: "Tonic (rel.)",
  ii: "Subdominant (rel.)",
  iii: "Tonic (rel.)",
  "vii°": "Dominant (rel.)",
};

interface Chord {
  id: string;
  root: string;
  quality: string;
}

function analyzeChord(chord: Chord, keyRoot: string): { numeral: string; functionLabel: string } | null {
  const keyIndex = NOTES.indexOf(keyRoot as (typeof NOTES)[number]);
  const chordIndex = NOTES.indexOf(chord.root as (typeof NOTES)[number]);
  if (keyIndex === -1 || chordIndex === -1) return null;

  const distance = (chordIndex - keyIndex + 12) % 12;
  let degreeIndex = -1;
  for (let i = 0; i < DEGREE_ROOTS.length; i += 1) {
    if ((DEGREE_ROOTS[i] - distance + 12) % 12 === 0 || (distance - DEGREE_ROOTS[i] + 12) % 12 === 0) {
      degreeIndex = i;
      break;
    }
  }
  if (degreeIndex === -1) return null;

  const numeral = ROMAN_NUMERALS[degreeIndex];
  const quality = chord.quality.replace(/[0-9]/g, "").toLowerCase();
  const isMinorLike = quality.startsWith("min") || quality.startsWith("dim");
  const rendered = isMinorLike && numeral === numeral.toLowerCase()
    ? numeral
    : !isMinorLike && numeral !== numeral.toUpperCase()
      ? numeral.toUpperCase()
      : numeral;

  return {
    numeral: rendered,
    functionLabel: FUNCTIONS[rendered] || "",
  };
}

function analyzeCadence(progression: Chord[], keyRoot: string): { label: string; description: string } | null {
  if (progression.length < 2) return null;
  const last = analyzeChord(progression[progression.length - 1], keyRoot);
  const prev = analyzeChord(progression[progression.length - 2], keyRoot);
  if (!last || !prev) return null;
  const lastNumeral = last.numeral.toUpperCase();
  const prevNumeral = prev.numeral.toUpperCase();
  if (lastNumeral === "I") {
    if (prevNumeral === "V") return { label: "Authentic (V→I)", description: "The strongest resolution — dominant to tonic." };
    if (prevNumeral === "IV") return { label: "Plagal (IV→I)", description: "The 'Amen' cadence — subdominant to tonic." };
    if (prevNumeral === "VII") return { label: "Leading tone (vii°→I)", description: "The leading tone resolves into the tonic." };
  }
  if (lastNumeral === "V") {
    if (prevNumeral === "II") return { label: "Half cadence (ii→V)", description: "Pauses on the dominant, unresolved." };
    return { label: "Half cadence (→V)", description: "Ends on the dominant, unresolved." };
  }
  if (lastNumeral === "VI") return { label: "Deceptive (→vi)", description: "A tonic was expected, but the relative minor answered." };
  return null;
}

export function ProgressionClient() {
  const { getAudioContext } = useAudio();
  const { t, locale } = useI18n();
  const userId = useCurrentUserId();
  const [progression, setProgression] = usePersistentState<Chord[]>("progression_chords", [], { userId });
  const [root, setRoot] = usePersistentState("progression_root", "C", { userId });
  const [quality, setQuality] = usePersistentState("progression_quality", "Maj", { userId });
  const [keyRoot, setKeyRoot] = usePersistentState("progression_key", "C", { userId });
  const [bpm, setBpm] = usePersistentState("progression_bpm", 80, { userId });
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = usePersistentState("progression_loop", false, { userId });
  const [presetCategory, setPresetCategory] = usePersistentState("progression_category", "All", { userId });
  const [activeChordId, setActiveChordId] = useState<string | null>(null);
  const [keyboardVoice, setKeyboardVoice] = usePersistentState<KeyboardVoice>("progression_voice", "electric-piano", { userId });
  const [keyboardOctave, setKeyboardOctave] = usePersistentState("progression_octave", 3, { userId });
  const playingRef = useRef(false);

  const chordIntervals: Record<string, number[]> = {
    Maj: [0, 4, 7],
    min: [0, 3, 7],
    "7": [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dim: [0, 3, 6],
    sus4: [0, 5, 7],
    sus2: [0, 2, 7],
    aug: [0, 4, 8],
    dim7: [0, 3, 6, 9],
  };

  const pluralSuffix = (() => {
    if (locale === "de") return progression.length === 1 ? "" : "e";
    if (locale === "ru") {
      const n = progression.length % 100;
      const d = n % 10;
      if (d === 1 && n !== 11) return "";
      if (d >= 2 && d <= 4 && (n < 10 || n >= 20)) return "а";
      return "ов";
    }
    return progression.length === 1 ? "" : "s";
  })();

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  // Preload real instrument samples in the background; playback stays live regardless.
  useEffect(() => {
    void preloadVoice(getAudioContext(), keyboardVoice).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardVoice]);

  const filteredPresets = useMemo(() => {
    if (presetCategory === "All") return PROGRESSION_PRESETS;
    return PROGRESSION_PRESETS.filter((preset) => preset.category === presetCategory);
  }, [presetCategory]);

  const playChord = (chord: Chord, delay = 0) => {
    const ctx = getAudioContext();
    const startTime = ctx.currentTime + delay;
    const intervals = chordIntervals[chord.quality] ?? [0, 4, 7];
    const rootIndex = CHROMATIC.indexOf(chord.root as (typeof CHROMATIC)[number]);
    const frequencies = intervals.map((interval) =>
      noteFrequency(CHROMATIC[(rootIndex + interval) % 12], keyboardOctave),
    );
    frequencies.forEach((frequency, idx) => {
      playKeyboardNote(ctx, frequency, keyboardVoice, startTime + idx * 0.03);
    });
  };

  const playProgression = () => {
    if (progression.length === 0) return;
    if (isPlaying) {
      playingRef.current = false;
      setIsPlaying(false);
      setActiveChordId(null);
      return;
    }

    setIsPlaying(true);
    playingRef.current = true;
    const beatMs = 60000 / bpm;

    const runPass = () => {
      if (!playingRef.current) return;
      progression.forEach((chord, idx) => {
        setTimeout(() => {
          if (!playingRef.current) return;
          setActiveChordId(chord.id);
          playChord(chord);
          if (idx === progression.length - 1) {
            setTimeout(() => {
              if (!playingRef.current) return;
              if (loopPlayback) {
                runPass();
              } else {
                playingRef.current = false;
                setIsPlaying(false);
                setActiveChordId(null);
              }
            }, beatMs * 0.85);
          }
        }, idx * beatMs);
      });
    };

    runPass();
  };

  const applyPreset = (preset: ProgressionPreset) => {
    const chords = transposePreset(preset, keyRoot);
    setProgression(chords.map((chord) => ({ id: crypto.randomUUID(), ...chord })));
    toast.success(`Loaded ${preset.name} in ${keyRoot}`);
  };

  const transposeAll = (semitones: number) => {
    if (progression.length === 0) return;
    setProgression((current) => current.map((chord) => {
      const index = NOTES.indexOf(chord.root as (typeof NOTES)[number]);
      if (index === -1) return chord;
      return { ...chord, root: NOTES[(index + semitones + 12) % 12] };
    }));
    toast.success(`Transposed ${semitones > 0 ? "+" : ""}${semitones} st`);
  };

  const exportProgression = () => {
    const blob = new Blob([JSON.stringify({ key: keyRoot, bpm, chords: progression }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "progression.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Progression exported");
  };

  return (
    <div className="space-y-4">
      {/* ─── Progression Builder ─── */}
      <CollapsibleCard
        defaultOpen={true}
        title="Progressions"
        subtitle={`${progression.length} chord${pluralSuffix}`}
        eyebrow="Build"
        icon={<Music className="h-5 w-5 text-[var(--color-copper)]" />}
        headerActions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLoopPlayback(!loopPlayback)}
              aria-pressed={loopPlayback}
              className={`glass-pill flex items-center gap-1 px-2 py-1 text-[10px] font-black transition min-h-[28px] ${
                loopPlayback ? "bg-[var(--color-copper)]/20 text-[var(--color-copper)]" : "opacity-60 hover:opacity-100"
              }`}
              title="Loop"
            >
              <Repeat className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={progression.length === 0}
              onClick={playProgression}
              className="glass-pill btn-sound flex items-center gap-1 bg-[var(--color-copper)] px-2.5 py-1 text-[10px] font-black uppercase text-white disabled:opacity-30 min-h-[28px]"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isPlaying ? "Stop" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={exportProgression}
              disabled={progression.length === 0}
              className="glass-pill p-1 text-[10px] font-black disabled:opacity-30 min-h-[28px] min-w-[28px]"
              title="Export"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Compact playback settings */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <Headphones className="h-3 w-3 shrink-0 text-[var(--color-brass)]" />
              <select
                value={keyboardVoice}
                onChange={(e) => setKeyboardVoice(e.target.value as KeyboardVoice)}
                className="field py-1 text-[11px] font-bold"
              >
                {KEYBOARD_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">BPM</span>
              <button type="button" onClick={() => setBpm((b) => Math.max(40, b - 5))} className="glass-pill flex h-6 w-6 items-center justify-center text-sm font-black text-[var(--color-sand-2)] hover:text-white"><Minus className="h-2.5 w-2.5" /></button>
              <span className="min-w-[2rem] text-center text-sm font-black tabular-nums">{bpm}</span>
              <button type="button" onClick={() => setBpm((b) => Math.min(240, b + 5))} className="glass-pill flex h-6 w-6 items-center justify-center text-sm font-black text-[var(--color-sand-2)] hover:text-white"><PlusIcon className="h-2.5 w-2.5" /></button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Key</span>
              <select value={keyRoot} onChange={(e) => setKeyRoot(e.target.value)} className="field py-1 text-[11px] font-bold">
                {NOTES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => transposeAll(-1)} disabled={progression.length === 0} className="glass-pill px-1.5 py-1 text-[10px] font-black disabled:opacity-30 min-h-[28px]">−</button>
              <button type="button" onClick={() => transposeAll(1)} disabled={progression.length === 0} className="glass-pill px-1.5 py-1 text-[10px] font-black disabled:opacity-30 min-h-[28px]">+</button>
            </div>
          </div>

          {/* Chord timeline */}
          <div className="flex min-h-[80px] flex-wrap gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] bg-black/15 p-2.5">
            {progression.length === 0 ? (
              <div className="flex w-full items-center justify-center py-4 text-[11px] text-[var(--color-sand-2)]">
                Add chords or load a preset
              </div>
            ) : null}
            {progression.map((chord, idx) => {
              const analysis = analyzeChord(chord, keyRoot);
              return (
                <motion.div
                  key={chord.id}
                  layout
                  role="button"
                  tabIndex={0}
                  aria-label={`Play ${chord.root}${chord.quality}`}
                  className={`group btn-sound relative flex h-16 sm:h-20 w-[3rem] sm:w-[3.5rem] cursor-pointer flex-col items-center justify-center rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-copper)] ${
                    activeChordId === chord.id
                      ? "border-[var(--color-mint)] bg-[var(--color-success-surface)] shadow-[0_0_16px_rgba(34,197,94,0.2)]"
                      : "song-list-item border-[var(--color-stroke)]"
                  }`}
                  onClick={() => playChord(chord)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      playChord(chord);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setProgression(progression.filter((item) => item.id !== chord.id));
                    }}
                    className="absolute -right-0.5 -top-0.5 scale-70 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                  <span className="text-base font-black leading-none">{chord.root}</span>
                  <span className="text-[7px] font-bold uppercase text-[var(--color-brass)]">{chord.quality}</span>
                  {analysis ? (
                    <span className="mt-0.5 text-[7px] font-black text-[var(--color-mint)]">{analysis.numeral}</span>
                  ) : (
                    <span className="mt-0.5 text-[7px] font-bold text-zinc-500">#{idx + 1}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Cadence detection */}
          {(() => {
            const cadence = analyzeCadence(progression, keyRoot);
            return cadence ? (
              <div className="flex items-center gap-2 rounded-lg border-l-4 border-l-[var(--color-mint)] bg-black/15 px-3 py-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--color-mint)]" />
                <div>
                  <span className="text-[10px] font-black uppercase text-[var(--color-mint)]">{cadence.label}</span>
                  <p className="text-[11px] text-[var(--color-sand-2)]">{cadence.description}</p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Add chord form — compact */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Root</span>
              <select value={root} onChange={(e) => setRoot(e.target.value)} className="field py-1 text-[11px] font-bold">
                {NOTES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Type</span>
              <select value={quality} onChange={(e) => setQuality(e.target.value)} className="field py-1 text-[11px] font-bold">
                {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setProgression([...progression, { id: crypto.randomUUID(), root, quality }])}
              className="glass-pill flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase min-h-[32px]"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
            {progression.length > 0 && (
              <button
                type="button"
                onClick={() => setProgression([])}
                className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:underline min-h-[32px]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* ─── Presets Library ─── */}
      <CollapsibleCard
        defaultOpen={true}
        title="Presets"
        subtitle={`${filteredPresets.length} progressions`}
        eyebrow="Library"
        icon={<Layers className="h-5 w-5 text-[var(--color-brass)]" />}
        headerActions={
          <select
            value={presetCategory}
            onChange={(e) => setPresetCategory(e.target.value)}
            className="field w-auto py-1 text-[11px] font-bold"
          >
            <option value="All">All</option>
            {PROGRESSION_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className="song-list-item rounded-xl p-3 text-left transition hover:border-[var(--color-copper)] min-h-[44px]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-black text-[var(--color-foreground)]">{preset.name}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-brass)]">{preset.category}</span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-sand-2)]">{preset.description}</p>
              <p className="mt-1.5 font-mono text-[10px] font-bold text-[var(--color-copper)]">
                {preset.chords.map((chord) => `${chord.root}${chord.quality === "Maj" ? "" : chord.quality}`).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      </CollapsibleCard>
    </div>
  );
}
