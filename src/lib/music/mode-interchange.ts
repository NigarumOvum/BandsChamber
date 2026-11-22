import { CHROMATIC } from "./notes";
import type { ScaleType } from "./types";

// ── Mode Interchange Detection ─────────────────────────────────────────────

/**
 * Detects borrowed chords from parallel modes.
 * A borrowed chord is one that doesn't belong to the current key's scale
 * but comes from a parallel mode (same root, different mode).
 */

export interface BorrowedChordInfo {
  chordRoot: string;
  chordQuality: string;
  sourceMode: ScaleType;
  originalQuality: string;
  isBorrowed: boolean;
}

/**
 * Parallel mode mappings — which modes share the same root but have different qualities.
 * Maps a scale degree in the home key to possible borrowed qualities from parallel modes.
 */
const PARALLEL_MODE_BORROWINGS: Record<number, { mode: ScaleType; quality: string }[]> = {
  // Degree 1 (tonic)
  0: [
    { mode: "Major", quality: "Major" },
    { mode: "Minor", quality: "Minor" },
    { mode: "Dorian", quality: "Minor" },
    { mode: "Phrygian", quality: "Minor" },
    { mode: "Lydian", quality: "Major" },
    { mode: "Mixolydian", quality: "Major" },
  ],
  // Degree 2 (supertonic)
  1: [
    { mode: "Major", quality: "Minor" },
    { mode: "Minor", quality: "Diminished" },
    { mode: "Dorian", quality: "Minor" },
    { mode: "Phrygian", quality: "Major" },
    { mode: "Lydian", quality: "Major" },
    { mode: "Mixolydian", quality: "Minor" },
  ],
  // Degree 3 (mediant)
  2: [
    { mode: "Major", quality: "Minor" },
    { mode: "Minor", quality: "Major" },
    { mode: "Dorian", quality: "Major" },
    { mode: "Phrygian", quality: "Major" },
    { mode: "Lydian", quality: "Minor" },
    { mode: "Mixolydian", quality: "Minor" },
  ],
  // Degree 4 (subdominant)
  3: [
    { mode: "Major", quality: "Major" },
    { mode: "Minor", quality: "Minor" },
    { mode: "Dorian", quality: "Major" },
    { mode: "Phrygian", quality: "Major" },
    { mode: "Lydian", quality: "Major" },
    { mode: "Mixolydian", quality: "Major" },
  ],
  // Degree 5 (dominant)
  4: [
    { mode: "Major", quality: "Major" },
    { mode: "Minor", quality: "Major" },
    { mode: "Dorian", quality: "Major" },
    { mode: "Phrygian", quality: "Minor" },
    { mode: "Lydian", quality: "Minor" },
    { mode: "Mixolydian", quality: "Minor" },
  ],
  // Degree 6 (submediant)
  5: [
    { mode: "Major", quality: "Minor" },
    { mode: "Minor", quality: "Major" },
    { mode: "Dorian", quality: "Minor" },
    { mode: "Phrygian", quality: "Major" },
    { mode: "Lydian", quality: "Minor" },
    { mode: "Mixolydian", quality: "Minor" },
  ],
  // Degree 7 (leading tone)
  6: [
    { mode: "Major", quality: "Diminished" },
    { mode: "Minor", quality: "Major" },
    { mode: "Dorian", quality: "Major" },
    { mode: "Phrygian", quality: "Major" },
    { mode: "Lydian", quality: "Diminished" },
    { mode: "Mixolydian", quality: "Diminished" },
  ],
};

/**
 * Diatonic chord qualities for each scale type at each degree.
 */
const DIATONIC_QUALITIES: Record<ScaleType, string[]> = {
  Major: ["Major", "Minor", "Minor", "Major", "Major", "Minor", "Diminished"],
  Minor: ["Minor", "Diminished", "Major", "Minor", "Minor", "Major", "Major"],
  Dorian: ["Minor", "Minor", "Major", "Major", "Minor", "Minor", "Major"],
  Phrygian: ["Minor", "Major", "Major", "Major", "Minor", "Major", "Major"],
  Lydian: ["Major", "Major", "Minor", "Major", "Minor", "Minor", "Diminished"],
  Mixolydian: ["Major", "Minor", "Minor", "Major", "Minor", "Minor", "Diminished"],
  Aeolian: ["Minor", "Diminished", "Major", "Minor", "Minor", "Major", "Major"],
  Locrian: ["Diminished", "Major", "Major", "Major", "Minor", "Major", "Major"],
  "Pentatonic Major": ["Major", "Minor", "Minor", "Major", "Major"],
  "Pentatonic Minor": ["Minor", "Minor", "Major", "Major", "Major"],
  Blues: ["Minor", "Minor", "Major", "Major", "Major"],
  "Harmonic Minor": ["Minor", "Diminished", "Augmented", "Minor", "Major", "Major", "Major"],
  "Melodic Minor": ["Minor", "Minor", "Augmented", "Minor", "Major", "Minor", "Diminished"],
  "Whole Tone": ["Augmented", "Augmented", "Augmented", "Augmented", "Augmented", "Augmented"],
  "Half Diminished": ["HalfDim7", "Major", "Major", "Major", "Minor", "Major", "Major"],
  "Japanese In": ["Minor", "Major", "Major", "Major", "Major"],
  "Japanese Yo": ["Major", "Major", "Major", "Major", "Major"],
  "Hungarian Minor": ["Minor", "Minor", "Augmented", "Minor", "Major", "Major", "Major"],
  "Double Harmonic": ["Minor", "Major", "Augmented", "Minor", "Major", "Major", "Diminished"],
  Prometheus: ["Minor", "Major", "Augmented", "Minor", "Major", "Minor", "Major"],
  Chromatic: ["Major", "Major", "Major", "Major", "Major", "Major", "Major", "Major", "Major", "Major", "Major", "Major"],
};

/**
 * Check if a chord quality is diatonic to a given scale at a given degree.
 */
function isDiatonic(scaleType: ScaleType, degreeIndex: number, quality: string): boolean {
  const qualities = DIATONIC_QUALITIES[scaleType];
  if (!qualities) return false;
  return qualities[degreeIndex % qualities.length] === quality;
}

/**
 * Detect mode interchange in a chord progression.
 * Returns information about which chords are borrowed from parallel modes.
 *
 * @param key Root note of the key
 * @param scaleType Home scale type (e.g., "Major", "Minor")
 * @param chords Array of { root, quality } objects
 * @returns Array of BorrowedChordInfo objects
 */
export function detectModeInterchange(
  key: string,
  scaleType: ScaleType,
  chords: { root: string; quality: string }[]
): BorrowedChordInfo[] {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return [];

  const scaleIntervals = getScaleIntervals(scaleType);
  const scaleNotes = scaleIntervals.map((interval) =>
    CHROMATIC[(keyIndex + interval) % 12]
  );

  return chords.map((chord) => {
    const rootIndex = CHROMATIC.indexOf(chord.root as (typeof CHROMATIC)[number]);
    if (rootIndex === -1) {
      return {
        chordRoot: chord.root,
        chordQuality: chord.quality,
        sourceMode: scaleType,
        originalQuality: "?",
        isBorrowed: false,
      };
    }

    const degreeIndex = scaleNotes.indexOf(chord.root as (typeof CHROMATIC)[number]);
    if (degreeIndex === -1) {
      // Root is outside the scale — definitely borrowed
      return {
        chordRoot: chord.root,
        chordQuality: chord.quality,
        sourceMode: scaleType,
        originalQuality: "Borrowed",
        isBorrowed: true,
      };
    }

    // Check if the quality matches the diatonic quality
    const isDiatonicChord = isDiatonic(scaleType, degreeIndex, chord.quality);

    if (!isDiatonicChord) {
      // Find which parallel mode this chord might come from
      const borrowings = PARALLEL_MODE_BORROWINGS[degreeIndex] || [];
      const sourceMode = borrowings.find((b) => b.quality === chord.quality)?.mode || "Unknown";

      return {
        chordRoot: chord.root,
        chordQuality: chord.quality,
        sourceMode: sourceMode as ScaleType,
        originalQuality: DIATONIC_QUALITIES[scaleType]?.[degreeIndex] || "?",
        isBorrowed: true,
      };
    }

    return {
      chordRoot: chord.root,
      chordQuality: chord.quality,
      sourceMode: scaleType,
      originalQuality: chord.quality,
      isBorrowed: false,
    };
  });
}

function getScaleIntervals(scaleType: ScaleType): number[] {
  const scales: Record<string, number[]> = {
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
  return scales[scaleType] || [0, 2, 4, 5, 7, 9, 11];
}
