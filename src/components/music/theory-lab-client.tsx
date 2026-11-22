"use client";

import { useEffect, useMemo } from "react";
import { Book, Layers, Music, Play, RotateCcw, Sparkles, Piano, Guitar, ChevronUp, ChevronDown } from "lucide-react";

import { CollapsibleCard } from "@/components/collapsible-card";
import { InfoTooltip } from "@/components/info-tooltip";
import { ChordHowToPlay } from "@/components/music/chord-how-to-play";
import { PianoKeyboard } from "@/components/music/piano-keyboard";
import { InteractiveFretboard } from "@/components/music/interactive-fretboard";
import { useI18n } from "@/components/language-provider";
import { SoundIndicator } from "@/components/ui/sound-indicator";
import { ScaleInstrumentVisuals, ScaleTheory, NoteButtons, ScaleTypeButtons } from "@/components/music/scale-visuals";
import { useCurrentUserId, usePersistentState } from "@/lib/persist";
import { SplitViewFullScreen } from "@/components/split-view-fullscreen";
import { useAudio } from "@/components/music/audio-provider";
import { KEYBOARD_VOICES, playKeyboardNote, playKeyboardNotes, preloadVoice, type KeyboardVoice } from "@/lib/music/keyboard-synth";
import { CHROMATIC, noteFrequency } from "@/lib/music/notes";
import { GUITAR_TUNINGS } from "@/lib/music/tunings";

const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  "Pentatonic Major": [0, 2, 4, 7, 9],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
  "Whole Tone": [0, 2, 4, 6, 8, 10],
  "Half Diminished": [0, 1, 3, 6, 8, 10],
  "Japanese In": [0, 1, 5, 7, 8],
  "Japanese Yo": [0, 2, 5, 7, 8],
  "Hungarian Minor": [0, 2, 3, 6, 7, 8, 11],
  "Double Harmonic": [0, 1, 4, 6, 7, 8, 11],
  Prometheus: [0, 3, 4, 6, 7, 9, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const CHORDS: Record<string, number[]> = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
  "Major 7": [0, 4, 7, 11],
  "Minor 7": [0, 3, 7, 10],
  "Dominant 7": [0, 4, 7, 10],
  "Minor 7 b5": [0, 3, 6, 10],
  "Diminished 7": [0, 3, 6, 9],
  "Major 9": [0, 4, 7, 11, 14],
  "Dominant 9": [0, 4, 7, 10, 14],
  "Minor 9": [0, 3, 7, 10, 14],
  6: [0, 4, 7, 9],
  "Minor 6": [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "Major 6/9": [0, 4, 7, 9, 14],
  "Dominant 7 #9": [0, 4, 7, 10, 15],
  "Dominant 7 b9": [0, 4, 7, 10, 13],
  "Minor Maj7": [0, 3, 7, 11],
  "Augmented 7": [0, 4, 8, 10],
  "Major 11": [0, 4, 7, 11, 14, 17],
  "Lydian Dominant": [0, 4, 8, 10],
  "French Aug": [0, 4, 6, 10],
  "Italian Aug": [0, 4, 10],
  "German Aug": [0, 4, 6, 10],
  Power: [0, 7],
  "sus4 add9": [0, 5, 7, 14],
};

type ChordNotePitch = { label: string; pitch: number };

function invertNotes(notes: string[], inversion: number): ChordNotePitch[] {
  const base: ChordNotePitch[] = notes.map((note) => ({
    label: note,
    pitch: CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]),
  }));

  if (inversion === 0) return base;

  const offset = inversion % notes.length;
  const rotated = [...base.slice(offset), ...base.slice(0, offset)];
  const result: ChordNotePitch[] = [];

  for (const entry of rotated) {
    const pitch = entry.pitch;
    if (result.length === 0) {
      result.push({ label: entry.label, pitch });
      continue;
    }
    const prev = result[result.length - 1].pitch;
    let adjusted = pitch;
    while (adjusted < prev) adjusted += 12;
    while (adjusted - 12 >= prev) adjusted -= 12;
    result.push({ label: entry.label, pitch: adjusted });
  }
  return result;
}

function getNotes(root: string, intervals: number[]) {
  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  return intervals.map((interval) => CHROMATIC[(rootIndex + interval) % 12]);
}

const INTERVAL_NAMES: Record<number, string> = {
  1: "m2",
  2: "M2",
  3: "m3",
  4: "M3",
  5: "P4",
  6: "TT",
  7: "P5",
  8: "m6",
  9: "M6",
  10: "m7",
  11: "M7",
};

function intervalName(root: string, note: string) {
  const gap = (CHROMATIC.indexOf(note as (typeof CHROMATIC)[number]) - CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]) + 12) % 12;
  return gap === 0 ? "R" : INTERVAL_NAMES[gap] ?? "";
}

function diatonicTriads(scale: string[]): string[][] {
  const chords: string[][] = [];
  for (let i = 0; i < scale.length; i += 1) {
    chords.push([
      scale[i],
      scale[(i + 2) % scale.length],
      scale[(i + 4) % scale.length],
    ]);
  }
  return chords;
}

function triadQuality(root: string, third: string, fifth: string): string {
  const rootIdx = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  const thirdIdx = CHROMATIC.indexOf(third as (typeof CHROMATIC)[number]);
  const fifthIdx = CHROMATIC.indexOf(fifth as (typeof CHROMATIC)[number]);
  const thirdGap = (thirdIdx - rootIdx + 12) % 12;
  const fifthGap = (fifthIdx - rootIdx + 12) % 12;
  if (thirdGap === 4 && fifthGap === 7) return "M";
  if (thirdGap === 3 && fifthGap === 7) return "m";
  if (thirdGap === 3 && fifthGap === 6) return "dim";
  if (thirdGap === 4 && fifthGap === 8) return "aug";
  return "";
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

function romanNumeral(degree: number, quality: string) {
  const base = ROMAN_NUMERALS[degree] ?? `${degree + 1}`;
  if (quality === "M") return base;
  if (quality === "m") return base.toLowerCase();
  if (quality === "dim") return `${base.toLowerCase()}°`;
  return `${base}+`;
}

export function TheoryLabClient() {
  const { getAudioContext } = useAudio();
  const { t } = useI18n();
  const userId = useCurrentUserId();
  const [scaleRoot, setScaleRoot] = usePersistentState("theory_scale_root", "C", { userId });
  const [chordRoot, setChordRoot] = usePersistentState("theory_chord_root", "C", { userId });
  const [scaleType, setScaleType] = usePersistentState("theory_scale_type", "Major", { userId });
  const [chordType, setChordType] = usePersistentState("theory_chord_type", "Major", { userId });
  const [inversion, setInversion] = usePersistentState("theory_inversion", 0, { userId });
  const [highlightMode, setHighlightMode] = usePersistentState<"scale" | "chord" | "none">("theory_highlight", "scale", { userId });
  const [keyboardVoice, setKeyboardVoice] = usePersistentState<KeyboardVoice>("theory_voice", "piano", { userId });
  const [keyboardOctave, setKeyboardOctave] = usePersistentState("theory_octave", 4, { userId });

  const playFrequency = (frequency: number) => {
    playKeyboardNote(getAudioContext(), frequency, keyboardVoice);
  };

  const playNoteAtOctave = (note: string, octave = keyboardOctave) => {
    playFrequency(noteFrequency(note, octave));
  };

  // Preload real instrument samples in the background; playback stays live regardless.
  useEffect(() => {
    void preloadVoice(getAudioContext(), keyboardVoice).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardVoice]);

  const scaleNotes = getNotes(scaleRoot, SCALES[scaleType]);
  const scaleIntervals = SCALES[scaleType];
  const allScaleTypes = Object.keys(SCALES);
  const chordNotes = invertNotes(getNotes(chordRoot, CHORDS[chordType]), inversion).map((entry) => entry.label);
  const activeNotes = highlightMode === "scale" ? scaleNotes : highlightMode === "chord" ? chordNotes : [];

  const chordFrequencies = useMemo(
    () => invertNotes(getNotes(chordRoot, CHORDS[chordType]), inversion).map((entry) => noteFrequency(entry.label, keyboardOctave)),
    [chordRoot, chordType, inversion, keyboardOctave],
  );

  const playNotes = (notes: string[]) => {
    const frequencies = notes.map((note) => noteFrequency(note, keyboardOctave));
    playKeyboardNotes(getAudioContext(), frequencies, keyboardVoice);
  };

  return (
    <SplitViewFullScreen className="space-y-6" showControls={false}>
      {/* 1. Scale & Keyboard Lab — piano + fretboard + scale explorer */}
      <CollapsibleCard
        defaultOpen={true}
        title="Scales & Keyboard"
        subtitle={`${highlightMode === "scale" ? "Scale" : highlightMode === "chord" ? "Chord" : "—"} · ${scaleRoot} ${scaleType}`}
        eyebrow="Explore"
        icon={<Piano className="h-5 w-5 text-[var(--color-copper)]" />}
        headerActions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "scale" ? "none" : "scale")}
              className={`glass-pill flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[10px] font-black transition-all min-h-[32px] ${
                highlightMode === "scale"
                  ? "border-[var(--color-copper)] bg-[var(--color-copper)] text-white shadow-lg"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <Music className="h-3 w-3" />
              <span className="hidden sm:inline">Scale</span>
            </button>
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "chord" ? "none" : "chord")}
              className={`glass-pill flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[10px] font-black transition-all min-h-[32px] ${
                highlightMode === "chord"
                  ? "border-[var(--color-copper)] bg-[var(--color-copper)] text-white shadow-lg"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">Chord</span>
            </button>
            <InfoTooltip
              content="Toggle between scale and chord highlighting modes on the keyboard."
              position="left"
              size="sm"
            />
          </div>
        }
      >
        <div className="space-y-4 sm:space-y-6">
          {/* Scale Controls */}
          <div className="flex flex-col sm:flex-wrap sm:flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 bg-black/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
              <span className="field-label">Root</span>
              <NoteButtons value={scaleRoot} onChange={setScaleRoot} ariaLabel="Select scale root note" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
              <span className="field-label">Scale</span>
              <ScaleTypeButtons types={allScaleTypes} value={scaleType} onChange={setScaleType} />
            </div>
            <button
              type="button"
              onClick={() => { setHighlightMode("scale"); playNotes(scaleNotes); }}
              title="Play Scale"
              className="glass-pill btn-sound flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-[var(--color-brass)] hover:text-black min-h-[36px]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play Scale
            </button>
          </div>

          {/* Split View: Piano Keyboard + Fretboard */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {/* Piano Keyboard */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--color-copper)]">
                  <Piano className="h-4 w-4" />
                  <span>Piano</span>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                <PianoKeyboard
                  activeNotes={activeNotes}
                  startOctave={keyboardOctave}
                  voice={keyboardVoice}
                  onVoiceChange={setKeyboardVoice}
                  showInstrumentSelector
                  onNotePlay={(note, frequency) => {
                    const midi = 69 + 12 * Math.log2(frequency / 440);
                    setKeyboardOctave(Math.max(1, Math.min(6, Math.floor(midi / 12) - 1)));
                    playFrequency(frequency);
                  }}
                />
              </div>
            </div>

            {/* Interactive Fretboard */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--color-brass)]">
                  <Guitar className="h-4 w-4" />
                  <span>Fretboard</span>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                <InteractiveFretboard
                  mode="guitar"
                  tuning={GUITAR_TUNINGS[0]}
                  showControls={true}
                  scaleOverlay={scaleType === "Major" ? "major" : scaleType === "Minor" ? "minor" : scaleType === "Pentatonic Major" ? "pentatonic" : scaleType === "Blues" ? "blues" : "none"}
                  onScaleChange={(scale) => {
                    if (scale === "major") setScaleType("Major");
                    else if (scale === "minor") setScaleType("Minor");
                    else if (scale === "pentatonic") setScaleType("Pentatonic Major");
                    else if (scale === "blues") setScaleType("Blues");
                  }}
                  rootNote={scaleRoot}
                  onRootNoteChange={setScaleRoot}
                  className="scale-90 origin-top"
                />
              </div>
            </div>
          </div>

          {/* Scale Notes Display */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 bg-black/20">
            {scaleNotes.map((n, i) => (
              <button
                key={`${n}-${i}`}
                type="button"
                onClick={() => playNoteAtOctave(n)}
                title={`Play ${n}`}
                className="glass-pill btn-sound flex min-w-[44px] sm:min-w-[50px] flex-col items-center border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-2 hover:border-[var(--color-brass)] min-h-[44px]"
              >
                <span className="text-[7px] sm:text-[8px] font-black uppercase opacity-40">{i + 1}</span>
                <span className="text-sm sm:text-sm font-black">{n}</span>
                <span className="flex items-center gap-1 text-[7px] sm:text-[8px] font-bold uppercase text-[var(--color-brass)]/70">
                  <SoundIndicator className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{intervalName(scaleRoot, n)}
                </span>
              </button>
            ))}
          </div>

          {/* Scale Instrument Visuals */}
          <ScaleInstrumentVisuals
            notes={scaleNotes}
            root={scaleRoot}
            voice={keyboardVoice}
            onPlayNote={(note) => playNoteAtOctave(note)}
          />

          {/* Diatonic Triads */}
          <div className="rounded-xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 sm:p-4">
            <div className="mb-2 sm:mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[0.55rem] sm:text-[0.62rem]">Chords in Key</span>
                <InfoTooltip
                  content="The 7 triads built from each scale degree. Click to play."
                  position="top"
                  size="sm"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-[var(--color-sand-2)] hidden sm:block">Tap to play</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {diatonicTriads(scaleNotes).map((triad, degree) => {
                const quality = triadQuality(triad[0], triad[1], triad[2]);
                const chordTypeName = quality === "M" ? "Major" : quality === "m" ? "Minor" : quality === "dim" ? "Diminished" : quality === "aug" ? "Augmented" : "";
                return (
                  <button
                    key={`${triad.join("-")}-${degree}`}
                    type="button"
                    onClick={() => {
                      if (chordTypeName) {
                        setChordRoot(triad[0]);
                        setChordType(chordTypeName);
                        setInversion(0);
                      }
                      setHighlightMode("chord");
                      playKeyboardNotes(getAudioContext(), triad.map((n) => noteFrequency(n, keyboardOctave)), keyboardVoice, 90);
                    }}
                    className="glass-pill btn-sound flex flex-col items-start border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-2 transition hover:border-[var(--color-berry)] min-h-[44px]"
                    title={`${triad.join(" ")} — tap to play`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-[var(--color-berry)]">{romanNumeral(degree, quality)}</span>
                    <span className="flex items-center gap-1 text-sm font-black">
                      <SoundIndicator className="h-3 w-3" />
                      {triad[0]}{quality === "m" ? "m" : quality === "dim" ? "°" : quality === "aug" ? "+" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scale Theory */}
          <div className="rounded-xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 sm:p-4">
            <div className="mb-2 sm:mb-3 flex items-center gap-2">
              <span className="eyebrow text-[0.55rem] sm:text-[0.62rem]">Intervals</span>
              <InfoTooltip
                content="Interval patterns and note relationships in this scale."
                position="top"
                size="sm"
              />
            </div>
            <ScaleTheory
              intervals={scaleIntervals}
              intervalNames={INTERVAL_NAMES}
              notes={scaleNotes}
              root={scaleRoot}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* 2. Chord Constructor & Inversions */}
      <CollapsibleCard
        defaultOpen={false}
        title="Chords"
        subtitle={`${chordRoot} ${chordType}${inversion > 0 ? ` (inv. ${inversion})` : ""}`}
        eyebrow="Build"
        icon={<Layers className="h-5 w-5 text-[var(--color-berry)]" />}
        headerActions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => { setHighlightMode("chord"); playKeyboardNotes(getAudioContext(), chordFrequencies, keyboardVoice, 90); }}
              title="Arpeggiate"
              className="glass-pill btn-sound flex items-center gap-1 px-3 sm:px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-[var(--color-berry)] hover:text-black min-h-[32px]"
            >
              <Play className="h-3 w-3 fill-current" />
              <span className="hidden sm:inline">Arpeggiate</span>
            </button>
            <InfoTooltip
              content="Build and explore different chord types with inversions."
              position="left"
              size="sm"
            />
          </div>
        }
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="field-label">Root</span>
              <InfoTooltip
                content="Starting note for the chord."
                position="top"
                size="sm"
              />
            </div>
            <NoteButtons value={chordRoot} onChange={setChordRoot} ariaLabel="Select chord root note" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="field-label">Type</span>
              <InfoTooltip
                content="Choose from 30 chord types."
                position="top"
                size="sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Object.keys(CHORDS).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChordType(type)}
                  className={`glass-pill px-2.5 sm:px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition min-h-[32px] ${
                    chordType === type
                      ? "bg-[var(--color-berry)] text-black"
                      : "text-[var(--color-sand-2)] hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="field-label">Inversion</span>
              <InfoTooltip
                content="Which note is in the bass."
                position="top"
                size="sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[0, 1, 2].map((inv) => (
                <button
                  key={inv}
                  type="button"
                  onClick={() => setInversion(inv)}
                  className={`glass-pill px-2.5 sm:px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition min-h-[32px] ${
                    inversion === inv
                      ? "bg-[var(--color-berry)] text-black"
                      : "text-[var(--color-sand-2)] hover:text-white"
                  }`}
                >
                  {inv === 0 ? "Root" : `Inv ${inv}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {chordNotes.map((n, i) => (
              <button
                key={`${n}-${i}`}
                type="button"
                onClick={() => playNoteAtOctave(n)}
                title={`Play ${n}`}
                className="glass-pill btn-sound flex min-w-[44px] sm:min-w-[50px] flex-col items-center border-white/10 bg-white/5 px-3 sm:px-4 py-2 hover:border-[var(--color-berry)] min-h-[44px]"
              >
                <span className="text-[7px] sm:text-[8px] font-black uppercase opacity-40">{i + 1}</span>
                <span className="text-sm font-black">{n}</span>
                <span className="flex items-center gap-1 text-[7px] sm:text-[8px] font-bold uppercase text-[var(--color-berry)]/70">
                  <SoundIndicator className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{intervalName(chordRoot, n)}
                </span>
              </button>
            ))}
          </div>

          <PianoKeyboard
            activeNotes={chordNotes}
            startOctave={keyboardOctave}
            voice={keyboardVoice}
            onVoiceChange={setKeyboardVoice}
            showInstrumentSelector
            onNotePlay={(note, frequency) => {
              const midi = 69 + 12 * Math.log2(frequency / 440);
              setKeyboardOctave(Math.max(1, Math.min(6, Math.floor(midi / 12) - 1)));
              playFrequency(frequency);
            }}
          />

          <ChordHowToPlay
            chordLabel={`${chordRoot} ${chordType} · ${inversion === 0 ? t("theory.rootPosition") : t("theory.inversionN").replace("{n}", String(inversion))}`}
            root={chordRoot}
            notes={chordNotes}
          />
        </div>
      </CollapsibleCard>
    </SplitViewFullScreen>
  );
}
