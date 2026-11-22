import { CHROMATIC } from "./notes";
import type { ScaleType } from "./types";

// ── Scale/Chord Compatibility Checker ──────────────────────────────────────

/**
 * Determines which scales work well over which chords.
 * This is essential for improvisation and composition.
 */

export interface ScaleChordCompatibility {
  scale: ScaleType;
  chord: string;
  compatibility: "Perfect" | "Good" | "Okay" | "Avoid";
  description: string;
}

/**
 * Map of chord types to compatible scales.
 * Each entry lists scales that work well over the chord type.
 */
const CHORD_SCALE_MAP: Record<string, { scale: ScaleType; compatibility: "Perfect" | "Good" | "Okay"; reason: string }[]> = {
  Major: [
    { scale: "Major", compatibility: "Perfect", reason: "Ionian mode — the parent scale" },
    { scale: "Lydian", compatibility: "Good", reason: "Raised 4th adds brightness" },
    { scale: "Mixolydian", compatibility: "Good", reason: "Flat 7 adds bluesy flavor" },
    { scale: "Pentatonic Major", compatibility: "Good", reason: "Simplified major sound" },
    { scale: "Whole Tone", compatibility: "Okay", reason: "Dreamy, ambiguous sound" },
  ],
  Minor: [
    { scale: "Dorian", compatibility: "Perfect", reason: "Raised 6th adds jazz flavor" },
    { scale: "Minor", compatibility: "Perfect", reason: "Aeolian mode — the parent scale" },
    { scale: "Pentatonic Minor", compatibility: "Good", reason: "Simplified minor sound" },
    { scale: "Blues", compatibility: "Good", reason: "Added blue note for expressiveness" },
    { scale: "Phrygian", compatibility: "Okay", reason: "Flat 2 adds Spanish flavor" },
  ],
  "Major 7": [
    { scale: "Major", compatibility: "Perfect", reason: "Ionian mode — matches all chord tones" },
    { scale: "Lydian", compatibility: "Perfect", reason: "Raised 4th adds brightness" },
    { scale: "Melodic Minor", compatibility: "Good", reason: "Jazz standard over maj7" },
  ],
  "Minor 7": [
    { scale: "Dorian", compatibility: "Perfect", reason: "Raised 6th — jazz standard" },
    { scale: "Minor", compatibility: "Perfect", reason: "Aeolian mode — natural minor" },
    { scale: "Pentatonic Minor", compatibility: "Good", reason: "Simplified minor 7 sound" },
    { scale: "Blues", compatibility: "Good", reason: "Blue note adds expressiveness" },
  ],
  "Dominant 7": [
    { scale: "Mixolydian", compatibility: "Perfect", reason: "Flat 7 — jazz standard" },
    { scale: "Blues", compatibility: "Good", reason: "Blue notes match dominant sound" },
    { scale: "Lydian", compatibility: "Good", reason: "Raised 4th — altered sound" },
    { scale: "Harmonic Minor", compatibility: "Okay", reason: "From the V chord in harmonic minor" },
  ],
  "Dominant 9": [
    { scale: "Mixolydian", compatibility: "Perfect", reason: "Natural 9 — jazz standard" },
    { scale: "Blues", compatibility: "Good", reason: "Blue notes match dominant 9" },
  ],
  "Dominant 7 #9": [
    { scale: "Blues", compatibility: "Perfect", reason: "Hendrix chord — bluesy sound" },
    { scale: "Harmonic Minor", compatibility: "Good", reason: "From the V chord in harmonic minor" },
  ],
  "Dominant 7 b9": [
    { scale: "Harmonic Minor", compatibility: "Perfect", reason: "From the V chord in harmonic minor" },
    { scale: "Mixolydian", compatibility: "Good", reason: "Altered dominant sound" },
  ],
  Diminished: [
    { scale: "Half Diminished", compatibility: "Perfect", reason: "Matches diminished sound" },
    { scale: "Chromatic", compatibility: "Good", reason: "All notes available for passing tones" },
  ],
  "Diminished 7": [
    { scale: "Half Diminished", compatibility: "Perfect", reason: "Matches diminished 7 sound" },
    { scale: "Chromatic", compatibility: "Good", reason: "All notes available" },
  ],
  Augmented: [
    { scale: "Whole Tone", compatibility: "Perfect", reason: "Symmetrical — matches augmented" },
    { scale: "Chromatic", compatibility: "Good", reason: "All notes available" },
  ],
  "Augmented 7": [
    { scale: "Whole Tone", compatibility: "Perfect", reason: "Symmetrical dominant sound" },
    { scale: "Harmonic Minor", compatibility: "Good", reason: "From the III chord" },
  ],
  Power: [
    { scale: "Pentatonic Major", compatibility: "Good", reason: "Root and 5th — versatile" },
    { scale: "Pentatonic Minor", compatibility: "Good", reason: "Root and 5th — versatile" },
    { scale: "Blues", compatibility: "Good", reason: "Root and 5th with blue notes" },
  ],
  "Minor Maj7": [
    { scale: "Melodic Minor", compatibility: "Perfect", reason: "Jazz standard — minor with major 7th" },
    { scale: "Dorian", compatibility: "Good", reason: "Raised 6th adds color" },
  ],
  "Major 6/9": [
    { scale: "Major", compatibility: "Perfect", reason: "Add 6th and 9th to major" },
    { scale: "Mixolydian", compatibility: "Good", reason: "Jazz voicing" },
  ],
  "Major 9": [
    { scale: "Major", compatibility: "Perfect", reason: "Add 9th to major 7" },
    { scale: "Lydian", compatibility: "Good", reason: "Raised 4th adds brightness" },
  ],
  "Minor 9": [
    { scale: "Dorian", compatibility: "Perfect", reason: "Jazz standard — minor 9 sound" },
    { scale: "Minor", compatibility: "Good", reason: "Natural minor with 9th" },
  ],
  "Major 11": [
    { scale: "Lydian", compatibility: "Perfect", reason: "Raised 4th becomes 11th" },
    { scale: "Major", compatibility: "Good", reason: "Add 11th to major 7" },
  ],
  "Lydian Dominant": [
    { scale: "Lydian", compatibility: "Perfect", reason: "Raised 4th dominant sound" },
    { scale: "Melodic Minor", compatibility: "Good", reason: "4th mode of melodic minor" },
  ],
  "French Aug": [
    { scale: "Chromatic", compatibility: "Good", reason: "Exotic augmented sound" },
  ],
  "Italian Aug": [
    { scale: "Chromatic", compatibility: "Good", reason: "Simple augmented triad" },
  ],
  "German Aug": [
    { scale: "Chromatic", compatibility: "Good", reason: "Augmented with flat 6" },
  ],
  "sus2": [
    { scale: "Major", compatibility: "Good", reason: "Suspended 2nd — open sound" },
    { scale: "Dorian", compatibility: "Good", reason: "Suspended minor sound" },
  ],
  "sus4": [
    { scale: "Major", compatibility: "Good", reason: "Suspended 4th — tension" },
    { scale: "Lydian", compatibility: "Good", reason: "Raised 4th resolves" },
  ],
  "sus4 add9": [
    { scale: "Major", compatibility: "Good", reason: "Suspended with added 9th" },
    { scale: "Mixolydian", compatibility: "Good", reason: "Jazz suspended sound" },
  ],
  "add9": [
    { scale: "Major", compatibility: "Perfect", reason: "Add 9th to major triad" },
    { scale: "Pentatonic Major", compatibility: "Good", reason: "Simplified with 9th" },
  ],
  "6": [
    { scale: "Major", compatibility: "Perfect", reason: "Add 6th to major triad" },
    { scale: "Mixolydian", compatibility: "Good", reason: "Jazz 6th sound" },
  ],
  "Minor 6": [
    { scale: "Dorian", compatibility: "Perfect", reason: "Raised 6th — jazz standard" },
    { scale: "Minor", compatibility: "Good", reason: "Add 6th to minor triad" },
  ],
};

/**
 * Get compatible scales for a given chord type.
 *
 * @param chordType Chord quality (e.g., "Major", "Minor 7", "Dominant 7")
 * @returns Array of compatible scales with compatibility ratings
 */
export function getCompatibleScales(chordType: string): ScaleChordCompatibility[] {
  const mapEntry = CHORD_SCALE_MAP[chordType];
  if (!mapEntry) {
    // Fallback: suggest common scales
    return [
      { scale: "Major", chord: chordType, compatibility: "Okay", description: "General major scale" },
      { scale: "Minor", chord: chordType, compatibility: "Okay", description: "General minor scale" },
      { scale: "Pentatonic Major", chord: chordType, compatibility: "Okay", description: "Safe pentatonic option" },
      { scale: "Pentatonic Minor", chord: chordType, compatibility: "Okay", description: "Safe pentatonic option" },
    ];
  }

  return mapEntry.map((entry) => ({
    scale: entry.scale,
    chord: chordType,
    compatibility: entry.compatibility,
    description: entry.reason,
  }));
}

/**
 * Get compatible chords for a given scale.
 *
 * @param scaleType Scale type (e.g., "Major", "Dorian")
 * @returns Array of chord types that work well over the scale
 */
export function getCompatibleChords(scaleType: ScaleType): ScaleChordCompatibility[] {
  const compatible: ScaleChordCompatibility[] = [];

  // Search through the chord-scale map for chords that list this scale
  for (const [chordType, scales] of Object.entries(CHORD_SCALE_MAP)) {
    for (const entry of scales) {
      if (entry.scale === scaleType) {
        compatible.push({
          scale: scaleType,
          chord: chordType,
          compatibility: entry.compatibility,
          description: entry.reason,
        });
      }
    }
  }

  return compatible;
}

/**
 * Check if a specific scale works over a specific chord.
 *
 * @param scaleType Scale type
 * @param chordType Chord type
 * @returns Compatibility rating or null if not found
 */
export function checkScaleChordCompatibility(
  scaleType: ScaleType,
  chordType: string
): "Perfect" | "Good" | "Okay" | "Avoid" | null {
  const compatible = getCompatibleScales(chordType);
  const found = compatible.find((c) => c.scale === scaleType);
  return found?.compatibility || "Avoid";
}

/**
 * Get the diatonic chords for a scale in a given key.
 *
 * @param key Root note of the key
 * @param scaleType Scale type
 * @returns Array of diatonic chords with their roots and qualities
 */
export function getDiatonicChords(key: string, scaleType: ScaleType): { root: string; quality: string; degree: number }[] {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return [];

  // Scale intervals and diatonic chord qualities
  const scaleData: Record<string, { intervals: number[]; qualities: string[] }> = {
    Major: {
      intervals: [0, 2, 4, 5, 7, 9, 11],
      qualities: ["Major", "Minor", "Minor", "Major", "Major", "Minor", "Diminished"],
    },
    Minor: {
      intervals: [0, 2, 3, 5, 7, 8, 10],
      qualities: ["Minor", "Diminished", "Major", "Minor", "Minor", "Major", "Major"],
    },
    Dorian: {
      intervals: [0, 2, 3, 5, 7, 9, 10],
      qualities: ["Minor", "Minor", "Major", "Major", "Minor", "Minor", "Major"],
    },
    Phrygian: {
      intervals: [0, 1, 3, 5, 7, 8, 10],
      qualities: ["Minor", "Major", "Major", "Major", "Minor", "Major", "Major"],
    },
    Lydian: {
      intervals: [0, 2, 4, 6, 7, 9, 11],
      qualities: ["Major", "Major", "Minor", "Major", "Minor", "Minor", "Diminished"],
    },
    Mixolydian: {
      intervals: [0, 2, 4, 5, 7, 9, 10],
      qualities: ["Major", "Minor", "Minor", "Major", "Minor", "Minor", "Diminished"],
    },
    Aeolian: {
      intervals: [0, 2, 3, 5, 7, 8, 10],
      qualities: ["Minor", "Diminished", "Major", "Minor", "Minor", "Major", "Major"],
    },
    Locrian: {
      intervals: [0, 1, 3, 5, 6, 8, 10],
      qualities: ["Diminished", "Major", "Major", "Major", "Minor", "Major", "Major"],
    },
    "Pentatonic Major": {
      intervals: [0, 2, 4, 7, 9],
      qualities: ["Major", "Minor", "Minor", "Major", "Major"],
    },
    "Pentatonic Minor": {
      intervals: [0, 3, 5, 7, 10],
      qualities: ["Minor", "Minor", "Major", "Major", "Major"],
    },
    Blues: {
      intervals: [0, 3, 5, 6, 7, 10],
      qualities: ["Minor", "Minor", "Major", "Major", "Major", "Major"],
    },
    "Harmonic Minor": {
      intervals: [0, 2, 3, 5, 7, 8, 11],
      qualities: ["Minor", "Diminished", "Augmented", "Minor", "Major", "Major", "Major"],
    },
    "Melodic Minor": {
      intervals: [0, 2, 3, 5, 7, 9, 11],
      qualities: ["Minor", "Minor", "Augmented", "Minor", "Major", "Minor", "Diminished"],
    },
  };

  const data = scaleData[scaleType];
  if (!data) return [];

  return data.intervals.map((interval, index) => ({
    root: CHROMATIC[(keyIndex + interval) % 12],
    quality: data.qualities[index] || "Major",
    degree: index + 1,
  }));
}
