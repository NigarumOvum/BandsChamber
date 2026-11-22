import { CHROMATIC } from "./notes";
import type { ScaleType } from "./types";

// ── Scale degree to Roman numeral mapping ──────────────────────────────────

export type RomanNumeralCase = "major" | "minor";

/**
 * Map scale degrees (1-7) to Roman numerals for a given scale type.
 * Major scales use uppercase for major/diminished, lowercase for minor.
 * Minor scales follow natural minor conventions.
 */
const ROMAN_MAP: Record<ScaleType, string[]> = {
  // Major (Ionian)
  Major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  // Minor (Aeolian)
  Minor: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
  // Modes
  Dorian: ["i", "ii", "bIII", "IV", "V", "vi", "vii"],
  Phrygian: ["i", "II", "bIII", "bIV", "bV", "VI", "VII"],
  Lydian: ["I", "II", "iii", "IV", "v", "vi", "vii"],
  Mixolydian: ["I", "ii", "iii", "IV", "v", "vi", "vii°"],
  Aeolian: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
  Locrian: ["i°", "II", "bIII", "bIV", "bV", "vi", "vii"],
  // Pentatonic
  "Pentatonic Major": ["I", "ii", "iii", "IV", "V"],
  "Pentatonic Minor": ["i", "ii", "III", "IV", "V"],
  // Blues
  Blues: ["i", "ii", "III", "IV", "V"],
  // Harmonic/Melodic Minor
  "Harmonic Minor": ["i", "ii°", "III+", "iv", "V", "VI", "vii"],
  "Melodic Minor": ["i", "ii", "III+", "iv", "V", "vi", "vii°"],
  // Extended scales
  "Whole Tone": ["I+", "II+", "III+", "IV+", "V+", "VI+"],
  "Half Diminished": ["iø", "II", "bIII", "bIV", "bV", "vi", "vii"],
  "Japanese In": ["i", "II", "III", "IV", "V"],
  "Japanese Yo": ["I", "II", "III", "IV", "V"],
  "Hungarian Minor": ["i", "ii", "III+", "iv", "V", "VI", "vii"],
  "Double Harmonic": ["i", "II", "III+", "iv", "V", "VI", "vii°"],
  Prometheus: ["i", "II", "III+", "iv", "V", "vi", "vii"],
  Chromatic: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"],
};

/**
 * Get the Roman numeral for a given scale degree (0-indexed) in a scale.
 */
export function getRomanNumeral(scaleType: ScaleType, degreeIndex: number): string {
  const map = ROMAN_MAP[scaleType];
  if (!map) return `${degreeIndex + 1}`;
  return map[degreeIndex % map.length] || `${degreeIndex + 1}`;
}

/**
 * Generate Roman numeral analysis for a chord progression in a given key and scale.
 * @param key Root note (e.g., "C", "D#")
 * @param chordRoots Array of chord root notes (e.g., ["C", "G", "Am", "F"])
 * @param scaleType The scale type defining the key
 * @returns Array of Roman numerals corresponding to each chord
 */
export function romanNumerals(key: string, chordRoots: string[], scaleType: ScaleType): string[] {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return chordRoots.map(() => "?");

  const scaleIntervals = getScaleIntervals(scaleType);
  const scaleNotes = scaleIntervals.map((interval) =>
    CHROMATIC[(keyIndex + interval) % 12]
  );

  return chordRoots.map((root) => {
    const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
    if (rootIndex === -1) return "?";

    // Find the degree index (pitch class distance from key)
    const degreeIndex = scaleNotes.indexOf(root as (typeof CHROMATIC)[number]);
    if (degreeIndex === -1) {
      // Chord root is outside the scale — mark as borrowed
      const semitoneDistance = (rootIndex - keyIndex + 12) % 12;
      return `b${getRomanNumeral(scaleType, semitoneDistance)}`;
    }
    return getRomanNumeral(scaleType, degreeIndex);
  });
}

/**
 * Get the intervals for a scale type.
 */
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
