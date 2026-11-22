"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Volume2, Layers } from "lucide-react";
import { useAudio } from "@/components/music/audio-provider";
import { GlassSurface } from "@/components/ui/glass-surface";
import {
  GUITAR_TUNINGS,
  BASS_TUNINGS,
  type TuningPreset,
  type TuningString,
} from "@/lib/music/tunings";
import { playReferencePluck, type PluckInstrument } from "@/lib/music/instrument-synth";
import { CHROMATIC } from "@/lib/music/notes";

type FretboardMode = "guitar" | "bass";
type ScaleOverlay = "none" | "major" | "minor" | "pentatonic" | "blues";

const SCALE_PATTERNS: Record<ScaleOverlay, number[]> = {
  none: [],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};

const SCALE_NAMES: Record<ScaleOverlay, string> = {
  none: "No Scale",
  major: "Major Scale",
  minor: "Natural Minor",
  pentatonic: "Pentatonic",
  blues: "Blues",
};

type InteractiveFretboardProps = {
  mode?: FretboardMode;
  tuning?: TuningPreset;
  onTuningChange?: (tuning: TuningPreset) => void;
  scaleOverlay?: ScaleOverlay;
  onScaleChange?: (scale: ScaleOverlay) => void;
  showControls?: boolean;
  className?: string;
  onNoteClick?: (string: number, fret: number, note: string) => void;
  playOnHover?: boolean;
  rootNote?: string;
  onRootNoteChange?: (root: string) => void;
};

export function InteractiveFretboard({
  mode = "guitar",
  tuning: externalTuning,
  onTuningChange,
  scaleOverlay = "none",
  onScaleChange,
  showControls = true,
  className = "",
  onNoteClick,
  playOnHover = false,
  rootNote = "C",
  onRootNoteChange,
}: InteractiveFretboardProps) {
  const { getAudioContext } = useAudio();
  const [activeString, setActiveString] = useState<number | null>(null);
  const [activeFret, setActiveFret] = useState<number | null>(null);
  const [hoverPlayEnabled, setHoverPlayEnabled] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ string: number; fret: number } | null>(null);
  const [lastPlayed, setLastPlayed] = useState<{
    note: string;
    octave: number;
    frequency: number;
    stringLabel: string;
    fret: number;
  } | null>(null);
  const [localRootNote, setLocalRootNote] = useState(rootNote);

  const tunings = mode === "guitar" ? GUITAR_TUNINGS : BASS_TUNINGS;
  const currentTuning = externalTuning || tunings[0];
  const hoverPlayActive = playOnHover || hoverPlayEnabled;

  // Sync local root note with prop
  useEffect(() => {
    setLocalRootNote(rootNote);
  }, [rootNote]);

  // Sync tuning with external when it changes (for components that manage tuning externally)
  useEffect(() => {
    if (externalTuning && !showControls) {
      // When showControls is false, we're fully controlled externally
      // No action needed as we use externalTuning directly
    }
  }, [externalTuning, showControls]);

  const strings = useMemo(() => {
    return [...currentTuning.strings].reverse();
  }, [currentTuning]);

  const fretCount = 12;

  const getNoteInfoAtPosition = useCallback((stringIdx: number, fret: number) => {
    const stringData = strings[stringIdx];
    if (!stringData) return null;
    const openPitch = Math.round(69 + 12 * Math.log2(stringData.frequency / 440));
    const notePitch = openPitch + fret;
    return {
      note: CHROMATIC[notePitch % 12],
      octave: Math.floor(notePitch / 12) - 1,
      frequency: stringData.frequency * 2 ** (fret / 12),
      stringLabel: stringData.label,
    };
  }, [strings]);

  const getNoteAtPosition = useCallback((stringIdx: number, fret: number): string => {
    return getNoteInfoAtPosition(stringIdx, fret)?.note ?? "";
  }, [getNoteInfoAtPosition]);

  const isNoteInScale = useCallback((note: string): boolean => {
    if (scaleOverlay === "none") return false;
    const rootIndex = CHROMATIC.indexOf(localRootNote as (typeof CHROMATIC)[number]);
    if (rootIndex === -1) return false;
    const noteIndex = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]);
    if (noteIndex === -1) return false;
    const interval = (noteIndex - rootIndex + 12) % 12;
    return SCALE_PATTERNS[scaleOverlay].includes(interval);
  }, [scaleOverlay, localRootNote]);

  const handleNoteClick = useCallback((stringIdx: number, fret: number) => {
    const info = getNoteInfoAtPosition(stringIdx, fret);
    if (!info) return;

    const voice: PluckInstrument = mode === "bass" ? "bass" : "guitar-steel";
    playReferencePluck(getAudioContext(), info.frequency, voice);

    setActiveString(stringIdx);
    setActiveFret(fret);
    setLastPlayed({ ...info, fret });
    onNoteClick?.(stringIdx, fret, info.note);

    setTimeout(() => {
      setActiveString(null);
      setActiveFret(null);
    }, 300);
  }, [getAudioContext, mode, getNoteInfoAtPosition, onNoteClick]);

  const handleNoteHover = useCallback((stringIdx: number, fret: number, isEntering: boolean) => {
    setHoveredCell(isEntering ? { string: stringIdx, fret } : null);
    if (!hoverPlayActive || !isEntering) return;

    const info = getNoteInfoAtPosition(stringIdx, fret);
    if (!info) return;

    const voice: PluckInstrument = mode === "bass" ? "bass" : "guitar-steel";
    playReferencePluck(getAudioContext(), info.frequency, voice);
    setLastPlayed({ ...info, fret });
  }, [hoverPlayActive, getAudioContext, mode, getNoteInfoAtPosition]);

  return (
    <div className={`space-y-4 ${className}`}>
      {showControls && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-sand-2)]">
              Tuning
            </label>
            <select
              value={currentTuning.id}
              onChange={(e) => {
                const selected = tunings.find((t) => t.id === e.target.value);
                if (selected) onTuningChange?.(selected);
              }}
              className="glass-pill border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-[var(--color-mint)] outline-none"
            >
              {tunings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-sand-2)]">
              Scale
            </label>
            <select
              value={scaleOverlay}
              onChange={(e) => onScaleChange?.(e.target.value as ScaleOverlay)}
              className="glass-pill border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-[var(--color-mint)] outline-none"
            >
              {Object.entries(SCALE_NAMES).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-sand-2)]">
              Root
            </label>
            <select
              value={localRootNote}
              onChange={(e) => {
                setLocalRootNote(e.target.value);
                onRootNoteChange?.(e.target.value);
              }}
              className="glass-pill border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-[var(--color-mint)] outline-none"
            >
              {CHROMATIC.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setHoverPlayEnabled((current) => !current)}
            aria-pressed={hoverPlayActive}
            disabled={playOnHover}
            title={playOnHover ? "Hover play is enabled for this view" : "Play notes as you hover the fretboard"}
            className={`glass-pill flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition disabled:cursor-not-allowed ${
              hoverPlayActive ? "bg-[var(--color-mint)] text-black" : "text-[var(--color-sand-2)]"
            }`}
          >
            <Volume2 className="h-3 w-3" />
            {hoverPlayActive ? "Hover Play ON" : "Hover Play"}
          </button>
        </div>
      )}

      <GlassSurface className="panel glass-shine overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow">Interactive Fretboard</div>
            <h3 className="text-lg font-black">
              {mode === "guitar" ? "Guitar" : "Bass"} · {currentTuning.name}
            </h3>
          </div>
          {scaleOverlay !== "none" && (
            <div className="flex items-center gap-1.5 text-xs font-black text-[var(--color-mint)]">
              <Layers className="h-4 w-4" />
              <span>{SCALE_NAMES[scaleOverlay]} ({localRootNote})</span>
            </div>
          )}
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="min-w-[560px] space-y-1">
          {/* Fret numbers */}
          <div className="flex pl-[52px]">
            {Array.from({ length: fretCount }, (_, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[9px] font-bold text-[var(--color-sand-2)]"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Inlay strip (standard dot markers: 3, 5, 7, 9, double at 12) */}
          <div className="flex pl-[52px]" aria-hidden="true">
            {Array.from({ length: fretCount }, (_, i) => {
              const fret = i + 1;
              const hasSingleDot = [3, 5, 7, 9].includes(fret);
              return (
                <div key={fret} className="flex flex-1 items-center justify-center gap-1 py-0.5">
                  {hasSingleDot ? <span className="h-1.5 w-1.5 rounded-full bg-white/30" /> : null}
                  {fret === 12 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Strings */}
          {strings.map((stringData, stringIdx) => (
            <div key={stringData.label} className="flex items-center gap-1">
              {/* String label */}
              <div className="w-12 shrink-0 text-right text-xs font-black text-[var(--color-sand-2)]">
                {stringData.label}
              </div>

              {/* Frets */}
              {Array.from({ length: fretCount }, (_, i) => {
                const fret = i + 1;
                const note = getNoteAtPosition(stringIdx, fret);
                const isInScale = isNoteInScale(note);
                const isRoot = isInScale && note === localRootNote;
                const isActive = activeString === stringIdx && activeFret === fret;
                const isHovered = hoveredCell?.string === stringIdx && hoveredCell.fret === fret;

                return (
                  <button
                    key={fret}
                    type="button"
                    onClick={() => handleNoteClick(stringIdx, fret)}
                    onMouseEnter={() => handleNoteHover(stringIdx, fret, true)}
                    onMouseLeave={() => handleNoteHover(stringIdx, fret, false)}
                    onFocus={() => handleNoteHover(stringIdx, fret, true)}
                    onBlur={() => handleNoteHover(stringIdx, fret, false)}
                    aria-label={`${note}, ${stringData.label} string, fret ${fret}${isRoot ? ", root note" : isInScale ? ", in scale" : ""}`}
                    aria-pressed={isActive}
                    className={`relative h-10 flex-1 rounded-sm border transition-all ${
                      isActive
                        ? "border-[var(--color-mint)] bg-[var(--color-mint)] text-black shadow-lg shadow-emerald-500/30"
                        : isRoot
                          ? "border-[var(--color-copper)] bg-[var(--color-copper)]/35 text-white shadow-sm shadow-orange-500/20"
                          : isInScale
                            ? "border-[var(--color-brass)]/40 bg-[var(--color-brass)]/20 text-[var(--color-brass)] hover:bg-[var(--color-brass)]/30"
                            : "border-white/10 bg-white/5 text-[var(--color-sand-2)] hover:bg-white/10"
                    } ${isHovered && !isActive ? "ring-1 ring-white/50" : ""}`}
                    title={`${note} (${stringData.label} + ${fret})`}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                      {note}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          </div>
        </div>

        {/* Last played note readout */}
        <div className="mt-3 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px]">
          {lastPlayed ? (
            <>
              <span className="font-mono text-sm font-black text-[var(--color-mint)]">
                {lastPlayed.note}
                {lastPlayed.octave}
              </span>
              <span className="font-mono tabular-nums text-[var(--color-sand-2)]">
                {lastPlayed.frequency.toFixed(2)} Hz
              </span>
              <span className="text-[var(--color-sand-2)]">
                {lastPlayed.stringLabel} string · fret {lastPlayed.fret}
              </span>
              {isNoteInScale(lastPlayed.note) ? (
                <span className="rounded-full bg-[var(--color-brass)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-brass)]">
                  In {SCALE_NAMES[scaleOverlay]} ({localRootNote})
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[var(--color-sand-2)]">
              Click any fret to hear it. Enable Hover Play to audition scale shapes as you move across the neck.
            </span>
          )}
        </div>

        {scaleOverlay !== "none" ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-[var(--color-sand-2)]" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-copper)]" /> Root
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-brass)]" /> In scale
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-mint)]" /> Playing
            </span>
          </div>
        ) : null}

        {/* Open strings */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-sand-2)]">
            Open strings:
          </span>
          {strings.map((stringData, idx) => (
            <button
              key={stringData.label}
              type="button"
              onClick={() => handleNoteClick(idx, 0)}
              className="glass-pill px-2 py-1 text-[10px] font-black text-[var(--color-mint)] hover:bg-[var(--color-mint)] hover:text-black transition"
            >
              {stringData.note}
            </button>
          ))}
        </div>
      </GlassSurface>
    </div>
  );
}
