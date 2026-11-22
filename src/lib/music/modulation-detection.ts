import { CHROMATIC } from "./notes";

// ── Modulation Detection ─────────────────────────────────────────────────────

/**
 * Detect key changes within a progression or MIDI track.
 * Identify pivot chords and suggest smooth modulation paths between keys
 * using the circle of fifths relationships.
 */

export interface ModulationPoint {
  index: number;
  fromKey: string;
  toKey: string;
  pivotChord?: string;
  type: ModulationType;
  smoothness: "smooth" | "moderate" | "abrupt";
}

export type ModulationType =
  | "Relative Major/Minor"
  | "Dominant Pivot"
  | "Common Chord"
  | "Chromatic Mediant"
  | "Direct"
  | "Sequence";

/**
 * Circle of Fifths order for finding closely related keys.
 */
const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db"];

/**
 * Get the distance between two keys on the circle of fifths.
 */
function getKeyDistance(key1: string, key2: string): number {
  const index1 = CIRCLE_OF_FIFTHS.indexOf(key1 as (typeof CIRCLE_OF_FIFTHS)[number]);
  const index2 = CIRCLE_OF_FIFTHS.indexOf(key2 as (typeof CIRCLE_OF_FIFTHS)[number]);
  if (index1 === -1 || index2 === -1) return 6;

  const distance = Math.abs(index1 - index2);
  return Math.min(distance, 12 - distance);
}

/**
 * Get the relative minor/major of a key.
 */
function getRelativeKey(key: string, mode: "Major" | "Minor"): string {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return key;

  if (mode === "Major") {
    // Relative minor is 3 semitones down
    return CHROMATIC[(keyIndex + 9) % 12];
  } else {
    // Relative major is 3 semitones up
    return CHROMATIC[(keyIndex + 3) % 12];
  }
}

/**
 * Check if a chord is diatonic to a key.
 */
function isChordDiatonic(
  chordRoot: string,
  chordQuality: string,
  key: string,
  scaleType: string
): boolean {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return false;

  const chordRootIndex = CHROMATIC.indexOf(chordRoot as (typeof CHROMATIC)[number]);
  if (chordRootIndex === -1) return false;

  // Get scale intervals
  const scales: Record<string, number[]> = {
    "Major": [0, 2, 4, 5, 7, 9, 11],
    "Minor": [0, 2, 3, 5, 7, 8, 10],
    "Dorian": [0, 2, 3, 5, 7, 9, 10],
    "Phrygian": [0, 1, 3, 5, 7, 8, 10],
    "Lydian": [0, 2, 4, 6, 7, 9, 11],
    "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
  };

  const intervals = scales[scaleType] || scales["Major"];
  const scaleNotes = intervals.map((interval) => CHROMATIC[(keyIndex + interval) % 12]);

  return scaleNotes.includes(chordRoot as (typeof CHROMATIC)[number]);
}

/**
 * Find common chords between two keys (potential pivot chords).
 */
function findPivotChords(
  fromKey: string,
  toKey: string,
  scaleType: string
): string[] {
  const fromKeyIndex = CHROMATIC.indexOf(fromKey as (typeof CHROMATIC)[number]);
  const toKeyIndex = CHROMATIC.indexOf(toKey as (typeof CHROMATIC)[number]);
  if (fromKeyIndex === -1 || toKeyIndex === -1) return [];

  const scales: Record<string, number[]> = {
    "Major": [0, 2, 4, 5, 7, 9, 11],
    "Minor": [0, 2, 3, 5, 7, 8, 10],
  };

  const intervals = scales[scaleType] || scales["Major"];

  const fromNotes = new Set(intervals.map((i) => CHROMATIC[(fromKeyIndex + i) % 12]));
  const toNotes = new Set(intervals.map((i) => CHROMATIC[(toKeyIndex + i) % 12]));

  const common = Array.from(fromNotes).filter((note) => toNotes.has(note));
  return common;
}

/**
 * Detect modulations in a chord progression.
 *
 * @param chords Array of chords with their positions
 * @param initialKey The starting key
 * @param scaleType The scale type (Major/Minor)
 * @returns Array of detected modulation points
 */
export function detectModulations(
  chords: { root: string; quality: string }[],
  initialKey: string,
  scaleType: string = "Major"
): ModulationPoint[] {
  const modulations: ModulationPoint[] = [];
  let currentKey = initialKey;

  for (let i = 1; i < chords.length; i++) {
    const chord = chords[i];
    const chordRootIndex = CHROMATIC.indexOf(chord.root as (typeof CHROMATIC)[number]);
    if (chordRootIndex === -1) continue;

    // Check if the chord is diatonic to the current key
    if (!isChordDiatonic(chord.root, chord.quality, currentKey, scaleType)) {
      // Potential modulation detected
      // Try to find the new key
      let newKey: string | null = null;
      let modulationType: ModulationType = "Direct";
      let smoothness: ModulationPoint["smoothness"] = "abrupt";

      // Check for relative major/minor modulation
      const relativeKey = getRelativeKey(currentKey, scaleType === "Major" ? "Major" : "Minor");
      if (isChordDiatonic(chord.root, chord.quality, relativeKey, scaleType)) {
        newKey = relativeKey;
        modulationType = "Relative Major/Minor";
        smoothness = "smooth";
      }

      // Check for dominant pivot
      if (!newKey) {
        const dominantIndex = (chordRootIndex + 7) % 12;
        const dominantKey = CHROMATIC[dominantIndex];
        if (isChordDiatonic(chord.root, chord.quality, dominantKey, scaleType)) {
          newKey = dominantKey;
          modulationType = "Dominant Pivot";
          smoothness = "smooth";
        }
      }

      // Check for common chord modulation
      if (!newKey) {
        for (const potentialKey of CIRCLE_OF_FIFTHS) {
          if (potentialKey === currentKey) continue;
          if (isChordDiatonic(chord.root, chord.quality, potentialKey, scaleType)) {
            const distance = getKeyDistance(currentKey, potentialKey);
            newKey = potentialKey;
            if (distance <= 2) {
              modulationType = "Common Chord";
              smoothness = "smooth";
            } else if (distance <= 4) {
              modulationType = "Chromatic Mediant";
              smoothness = "moderate";
            } else {
              modulationType = "Direct";
              smoothness = "abrupt";
            }
            break;
          }
        }
      }

      // Check for sequence modulation (parallel movement)
      if (!newKey && i >= 2) {
        const prevChord = chords[i - 1];
        const prevChordIndex = CHROMATIC.indexOf(prevChord.root as (typeof CHROMATIC)[number]);
        if (prevChordIndex !== -1) {
          const interval = (chordRootIndex - prevChordIndex + 12) % 12;
          if (interval > 0 && interval < 6) {
            // Possible sequence
            const sequenceKeyIndex = (CHROMATIC.indexOf(currentKey as (typeof CHROMATIC)[number]) + interval + 12) % 12;
            const sequenceKey = CHROMATIC[sequenceKeyIndex];
            if (isChordDiatonic(chord.root, chord.quality, sequenceKey, scaleType)) {
              newKey = sequenceKey;
              modulationType = "Sequence";
              smoothness = "moderate";
            }
          }
        }
      }

      if (newKey) {
        const pivotChords = findPivotChords(currentKey, newKey, scaleType);
        const pivotChord = pivotChords.length > 0 ? pivotChords[0] : undefined;

        modulations.push({
          index: i,
          fromKey: currentKey,
          toKey: newKey,
          pivotChord,
          type: modulationType,
          smoothness,
        });

        currentKey = newKey;
      }
    }
  }

  return modulations;
}

/**
 * Suggest a smooth modulation path between two keys using the circle of fifths.
 */
export function suggestModulationPath(
  fromKey: string,
  toKey: string
): string[] {
  const fromIndex = CIRCLE_OF_FIFTHS.indexOf(fromKey as (typeof CIRCLE_OF_FIFTHS)[number]);
  const toIndex = CIRCLE_OF_FIFTHS.indexOf(toKey as (typeof CIRCLE_OF_FIFTHS)[number]);

  if (fromIndex === -1 || toIndex === -1) {
    return [fromKey, toKey];
  }

  const path: string[] = [fromKey];

  // Determine direction (clockwise or counterclockwise)
  const clockwise = (toIndex - fromIndex + 12) % 12;
  const counterclockwise = (fromIndex - toIndex + 12) % 12;

  if (clockwise <= counterclockwise) {
    // Go clockwise
    for (let i = 1; i < clockwise; i++) {
      path.push(CIRCLE_OF_FIFTHS[(fromIndex + i) % 12]);
    }
  } else {
    // Go counterclockwise
    for (let i = 1; i < counterclockwise; i++) {
      path.push(CIRCLE_OF_FIFTHS[(fromIndex - i + 12) % 12]);
    }
  }

  path.push(toKey);
  return path;
}

/**
 * Get a human-readable description of a modulation.
 */
export function formatModulation(modulation: ModulationPoint): string {
  const pivotInfo = modulation.pivotChord ? ` (pivot: ${modulation.pivotChord})` : "";
  return `${modulation.fromKey} → ${modulation.toKey} (${modulation.type}, ${modulation.smoothness})${pivotInfo}`;
}
