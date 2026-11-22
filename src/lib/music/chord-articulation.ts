import { CHROMATIC } from "./notes";

// ── Chord Strumming & Arpeggiation ──────────────────────────────────────────

/**
 * Add strumming patterns and arpeggiation styles to chord playback.
 * Makes the progression player and theory lab much more musical.
 */

export interface StrumPattern {
  name: string;
  description: string;
  strokes: Stroke[];
  bpm?: number; // optional default BPM
}

export interface Stroke {
  direction: "down" | "up";
  strings: number[]; // strings to strum (0 = highest/thinnest)
  offset: number; // beat offset (0-1 within a beat)
  velocity: number; // 0-1
}

export interface ArpeggioStyle {
  name: string;
  description: string;
  pattern: number[]; // note indices in order to play
  rhythm: number[]; // relative durations (1 = quarter, 0.5 = eighth, etc.)
}

export interface ArticulatedChord {
  root: string;
  quality: string;
  notes: number[]; // MIDI note numbers
  strumPattern?: StrumPattern;
  arpeggioStyle?: ArpeggioStyle;
  noteTimes: number[]; // scheduled start times for each note
}

/**
 * Common strumming patterns.
 */
export const STRUM_PATTERNS: StrumPattern[] = [
  {
    name: "Down",
    description: "All down strokes",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0, velocity: 0.8 },
    ],
  },
  {
    name: "Down-Up",
    description: "Basic down-up pattern",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0, velocity: 0.8 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 0.5, velocity: 0.6 },
    ],
  },
  {
    name: "Island",
    description: "Reggae-style offbeat strum",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3], offset: 0, velocity: 0.3 },
      { direction: "up", strings: [3, 2, 1, 0], offset: 0.5, velocity: 0.8 },
    ],
  },
  {
    name: "Folk",
    description: "Folk guitar pattern: D-D-U-U-D-U",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0, velocity: 0.8 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0.25, velocity: 0.7 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 0.5, velocity: 0.6 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 0.75, velocity: 0.6 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 1.0, velocity: 0.8 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 1.25, velocity: 0.6 },
    ],
  },
  {
    name: "Rock",
    description: "Rock rhythm: D-D-U-D-U-D",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0, velocity: 0.9 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0.5, velocity: 0.8 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 0.75, velocity: 0.7 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 1.0, velocity: 0.9 },
      { direction: "up", strings: [5, 4, 3, 2, 1, 0], offset: 1.25, velocity: 0.7 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 1.5, velocity: 0.9 },
    ],
  },
  {
    name: "Bossa Nova",
    description: "Bossa nova syncopated pattern",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3], offset: 0, velocity: 0.7 },
      { direction: "up", strings: [3, 2, 1, 0], offset: 0.375, velocity: 0.5 },
      { direction: "down", strings: [0, 1, 2, 3], offset: 0.75, velocity: 0.6 },
      { direction: "up", strings: [3, 2, 1, 0], offset: 1.125, velocity: 0.5 },
      { direction: "down", strings: [0, 1, 2, 3], offset: 1.5, velocity: 0.7 },
    ],
  },
  {
    name: "Percussive",
    description: "Percussive mute-strum pattern",
    strokes: [
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0, velocity: 0.9 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0.25, velocity: 0.2 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0.5, velocity: 0.9 },
      { direction: "down", strings: [0, 1, 2, 3, 4, 5], offset: 0.75, velocity: 0.2 },
    ],
  },
];

/**
 * Common arpeggio styles.
 */
export const ARPEGGIO_STYLES: ArpeggioStyle[] = [
  {
    name: "Broken Chord",
    description: "Root-5th-3rd-7th pattern",
    pattern: [0, 2, 1, 3],
    rhythm: [0.5, 0.5, 0.5, 1.0],
  },
  {
    name: "Alberti",
    description: "Middle-outer-middle-outer (classical)",
    pattern: [1, 0, 2, 3],
    rhythm: [0.5, 0.5, 0.5, 0.5],
  },
  {
    name: "Ascending",
    description: "Play notes from lowest to highest",
    pattern: [0, 1, 2, 3],
    rhythm: [0.25, 0.25, 0.25, 0.25],
  },
  {
    name: "Descending",
    description: "Play notes from highest to lowest",
    pattern: [3, 2, 1, 0],
    rhythm: [0.25, 0.25, 0.25, 0.25],
  },
  {
    name: "Waltz",
    description: "Root-3rd-5th waltz pattern",
    pattern: [0, 1, 2],
    rhythm: [1.0, 1.0, 2.0],
  },
  {
    name: "Classical",
    description: "Classical guitar arpeggio: P-i-m-a",
    pattern: [0, 3, 2, 1],
    rhythm: [0.5, 0.5, 0.5, 0.5],
  },
  {
    name: "Jazz",
    description: "Jazz comping arpeggio",
    pattern: [0, 2, 1, 3, 2],
    rhythm: [0.5, 0.5, 0.5, 0.5, 1.0],
  },
  {
    name: "Travis Pick",
    description: "Travis picking alternating bass",
    pattern: [0, 2, 1, 2, 3, 2, 0, 2],
    rhythm: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  },
];

/**
 * Get chord note intervals for a quality.
 */
function getChordIntervals(quality: string): number[] {
  const intervals: Record<string, number[]> = {
    "Major": [0, 4, 7],
    "Minor": [0, 3, 7],
    "Diminished": [0, 3, 6],
    "Augmented": [0, 4, 8],
    "Major 7": [0, 4, 7, 11],
    "Minor 7": [0, 3, 7, 10],
    "Dominant 7": [0, 4, 7, 10],
    "Minor 7 b5": [0, 3, 6, 10],
    "Diminished 7": [0, 3, 6, 9],
    "Major 9": [0, 4, 7, 11, 14],
    "Dominant 9": [0, 4, 7, 10, 14],
    "Minor 9": [0, 3, 7, 10, 14],
    "6": [0, 4, 7, 9],
    "Minor 6": [0, 3, 7, 9],
    "add9": [0, 4, 7, 14],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
    "Power": [0, 7],
  };

  return intervals[quality] || [0, 4, 7];
}

/**
 * Generate MIDI notes for a chord with strumming timing.
 *
 * @param root Chord root note
 * @param quality Chord quality
 * @param octave Base octave
 * @param strumPattern Optional strumming pattern
 * @param arpeggioStyle Optional arpeggio style
 * @param bpm BPM for timing calculation
 * @returns Articulated chord with note times
 */
export function generateArticulatedChord(
  root: string,
  quality: string,
  octave: number = 4,
  strumPattern?: StrumPattern,
  arpeggioStyle?: ArpeggioStyle,
  bpm: number = 120
): ArticulatedChord {
  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  if (rootIndex === -1) {
    return { root, quality, notes: [], noteTimes: [] };
  }

  const intervals = getChordIntervals(quality);
  const baseMidi = rootIndex + (octave + 1) * 12;
  const notes = intervals.map((interval) => baseMidi + interval);

  const beatDuration = 60 / bpm;
  let noteTimes: number[];

  if (arpeggioStyle) {
    // Arpeggiation: play notes in the pattern order
    const pattern = arpeggioStyle.pattern;
    const rhythm = arpeggioStyle.rhythm;
    noteTimes = new Array(notes.length).fill(0);

    let time = 0;
    for (let i = 0; i < pattern.length && i < notes.length; i++) {
      const noteIndex = pattern[i] % notes.length;
      noteTimes[noteIndex] = time;
      time += rhythm[i] * beatDuration;
    }
  } else if (strumPattern) {
    // Strumming: slight offset between strings
    const strumSpeed = 0.05; // seconds between strings
    noteTimes = notes.map((_, i) => i * strumSpeed);
  } else {
    // No articulation: all notes at once
    noteTimes = notes.map(() => 0);
  }

  return {
    root,
    quality,
    notes,
    strumPattern,
    arpeggioStyle,
    noteTimes,
  };
}

/**
 * Generate a sequence of articulated chords for a progression.
 *
 * @param chords Array of chords
 * @param octave Base octave
 * @param strumPattern Optional strumming pattern
 * @param arpeggioStyle Optional arpeggio style
 * @param bpm BPM
 * @param beatsPerChord Beats per chord
 * @returns Array of articulated chords with absolute times
 */
export function generateArticulatedProgression(
  chords: { root: string; quality: string }[],
  octave: number = 4,
  strumPattern?: StrumPattern,
  arpeggioStyle?: ArpeggioStyle,
  bpm: number = 120,
  beatsPerChord: number = 4
): (ArticulatedChord & { startTime: number; endTime: number })[] {
  const beatDuration = 60 / bpm;
  const chordDuration = beatsPerChord * beatDuration;

  return chords.map((chord, index) => {
    const articulated = generateArticulatedChord(
      chord.root,
      chord.quality,
      octave,
      strumPattern,
      arpeggioStyle,
      bpm
    );

    return {
      ...articulated,
      startTime: index * chordDuration,
      endTime: (index + 1) * chordDuration,
    };
  });
}

/**
 * Get a strum pattern by name.
 */
export function getStrumPattern(name: string): StrumPattern | undefined {
  return STRUM_PATTERNS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get an arpeggio style by name.
 */
export function getArpeggioStyle(name: string): ArpeggioStyle | undefined {
  return ARPEGGIO_STYLES.find((p) => p.name.toLowerCase() === name.toLowerCase());
}
