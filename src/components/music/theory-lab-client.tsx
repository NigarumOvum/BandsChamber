"use client";

import { useEffect, useMemo } from "react";
import { Layers, Music, Play, Piano, Guitar } from "lucide-react";

import { CollapsibleCard } from "@/components/collapsible-card";
import { ChordHowToPlay } from "@/components/music/chord-how-to-play";
import { PianoKeyboard } from "@/components/music/piano-keyboard";
import { InteractiveFretboard } from "@/components/music/interactive-fretboard";
import { SoundIndicator } from "@/components/ui/sound-indicator";
import { NoteButtons, ScaleTypeButtons } from "@/components/music/scale-visuals";
import { useCurrentUserId, usePersistentState } from "@/lib/persist";
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

  useEffect(() => {
    void preloadVoice(getAudioContext(), keyboardVoice).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardVoice]);

  const scaleNotes = getNotes(scaleRoot, SCALES[scaleType]);
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
    <div className="space-y-4">
      {/* ─── Scales, Keyboard & Fretboard ─── */}
      <CollapsibleCard
        defaultOpen={true}
        title="Scales"
        subtitle={`${scaleRoot} ${scaleType}`}
        eyebrow="Explore"
        icon={<Piano className="h-5 w-5 text-[var(--color-copper)]" />}
        headerActions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "scale" ? "none" : "scale")}
              className={`glass-pill flex items-center gap-1 px-2 py-1 text-[10px] font-black transition-all min-h-[28px] ${
                highlightMode === "scale"
                  ? "bg-[var(--color-copper)] text-white shadow-sm"
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Highlight scale notes"
            >
              <Music className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setHighlightMode(highlightMode === "chord" ? "none" : "chord")}
              className={`glass-pill flex items-center gap-1 px-2 py-1 text-[10px] font-black transition-all min-h-[28px] ${
                highlightMode === "chord"
                  ? "bg-[var(--color-copper)] text-white shadow-sm"
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Highlight chord notes"
            >
              <Layers className="h-3 w-3" />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Compact controls row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Root</span>
              <NoteButtons value={scaleRoot} onChange={setScaleRoot} ariaLabel="Select scale root note" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Scale</span>
              <ScaleTypeButtons types={allScaleTypes} value={scaleType} onChange={setScaleType} />
            </div>
            <button
              type="button"
              onClick={() => { setHighlightMode("scale"); playNotes(scaleNotes); }}
              className="glass-pill btn-sound flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-[var(--color-brass)] hover:text-black min-h-[28px]"
            >
              <Play className="h-3 w-3 fill-current" />
              <span className="hidden sm:inline">Play</span>
            </button>
          </div>

          {/* Piano + Fretboard side by side */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-x-auto -mx-3 px-3">
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
            <div className="overflow-x-auto -mx-3 px-3">
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

          {/* Diatonic triads — compact row */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="eyebrow text-[0.55rem]">Chords in Key</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                    className="glass-pill btn-sound flex items-center gap-1.5 border-white/10 bg-white/5 px-2.5 py-1.5 transition hover:border-[var(--color-berry)] min-h-[32px]"
                    title={`${triad.join(" ")} — tap to play`}
                  >
                    <span className="text-[9px] font-black uppercase text-[var(--color-berry)]">{romanNumeral(degree, quality)}</span>
                    <span className="text-sm font-black">
                      {triad[0]}{quality === "m" ? "m" : quality === "dim" ? "°" : quality === "aug" ? "+" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ─── Chord Constructor ─── */}
      <CollapsibleCard
        defaultOpen={false}
        title="Chords"
        subtitle={`${chordRoot} ${chordType}${inversion > 0 ? ` (inv. ${inversion})` : ""}`}
        eyebrow="Build"
        icon={<Layers className="h-5 w-5 text-[var(--color-berry)]" />}
        headerActions={
          <button
            type="button"
            onClick={() => { setHighlightMode("chord"); playKeyboardNotes(getAudioContext(), chordFrequencies, keyboardVoice, 90); }}
            className="glass-pill btn-sound flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-[var(--color-berry)] hover:text-black min-h-[28px]"
            title="Arpeggiate"
          >
            <Play className="h-3 w-3 fill-current" />
            <span className="hidden sm:inline">Play</span>
          </button>
        }
      >
        <div className="space-y-3">
          {/* Compact controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Root</span>
              <NoteButtons value={chordRoot} onChange={setChordRoot} ariaLabel="Select chord root note" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-sand-2)]">Inv</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((inv) => (
                  <button
                    key={inv}
                    type="button"
                    onClick={() => setInversion(inv)}
                    className={`glass-pill px-2 py-1 text-[10px] font-black uppercase transition min-h-[28px] ${
                      inversion === inv ? "bg-[var(--color-berry)] text-black" : "text-[var(--color-sand-2)] hover:text-white"
                    }`}
                  >
                    {inv === 0 ? "R" : inv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chord types — compact grid */}
          <div className="flex flex-wrap gap-1">
            {Object.keys(CHORDS).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChordType(type)}
                className={`glass-pill px-2 py-1 text-[9px] font-black uppercase tracking-widest transition min-h-[28px] ${
                  chordType === type
                    ? "bg-[var(--color-berry)] text-black"
                    : "text-[var(--color-sand-2)] hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Chord notes */}
          <div className="flex flex-wrap gap-1.5">
            {chordNotes.map((n, i) => (
              <button
                key={`${n}-${i}`}
                type="button"
                onClick={() => playNoteAtOctave(n)}
                className="glass-pill btn-sound flex items-center gap-1 border-white/10 bg-white/5 px-2.5 py-1.5 hover:border-[var(--color-berry)] min-h-[32px]"
              >
                <span className="text-sm font-black">{n}</span>
                <span className="text-[8px] font-bold uppercase text-[var(--color-berry)]/70">
                  {intervalName(chordRoot, n)}
                </span>
              </button>
            ))}
          </div>

          <ChordHowToPlay
            chordLabel={`${chordRoot} ${chordType}`}
            root={chordRoot}
            notes={chordNotes}
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}
