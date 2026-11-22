import { CHROMATIC } from "./notes";

// ── Chord Recognition from Note Sets ────────────────────────────────────────

/**
 * Given an array of MIDI notes or pitch classes, determine the chord type
 * and inversion. Useful for analyzing imported MIDI files or user-input
 * note sequences.
 */

export interface ChordRecognitionResult {
  root: string;
  quality: string;
  inversion: number; // 0 = root position, 1 = first inversion, etc.
  confidence: number; // 0-1
  matchedNotes: string[];
  unmatchedNotes: string[];
}

/**
 * Chord template definitions with pitch class intervals.
 */
const CHORD_TEMPLATES: Array<{
  quality: string;
  intervals: number[];
  priority: number; // higher = preferred when multiple matches
}> = [
  { quality: "Major 9", intervals: [0, 4, 7, 11, 2], priority: 10 },
  { quality: "Minor 9", intervals: [0, 3, 7, 10, 2], priority: 10 },
  { quality: "Dominant 9", intervals: [0, 4, 7, 10, 2], priority: 10 },
  { quality: "Major 7", intervals: [0, 4, 7, 11], priority: 9 },
  { quality: "Minor 7", intervals: [0, 3, 7, 10], priority: 9 },
  { quality: "Dominant 7", intervals: [0, 4, 7, 10], priority: 9 },
  { quality: "Minor 7 b5", intervals: [0, 3, 6, 10], priority: 9 },
  { quality: "Diminished 7", intervals: [0, 3, 6, 9], priority: 9 },
  { quality: "Major 6/9", intervals: [0, 4, 7, 9, 2], priority: 9 },
  { quality: "6", intervals: [0, 4, 7, 9], priority: 8 },
  { quality: "Minor 6", intervals: [0, 3, 7, 9], priority: 8 },
  { quality: "add9", intervals: [0, 4, 7, 2], priority: 8 },
  { quality: "Major", intervals: [0, 4, 7], priority: 7 },
  { quality: "Minor", intervals: [0, 3, 7], priority: 7 },
  { quality: "Diminished", intervals: [0, 3, 6], priority: 7 },
  { quality: "Augmented", intervals: [0, 4, 8], priority: 7 },
  { quality: "sus2", intervals: [0, 2, 7], priority: 6 },
  { quality: "sus4", intervals: [0, 5, 7], priority: 6 },
  { quality: "Power", intervals: [0, 7], priority: 5 },
];

/**
 * Normalize pitch classes to a set (0-11 range).
 */
function normalizePitchClasses(notes: number[]): Set<number> {
  return new Set(notes.map((n) => ((n % 12) + 12) % 12));
}

/**
 * Calculate how well a template matches a set of pitch classes.
 */
function matchTemplate(
  pitchClasses: Set<number>,
  template: (typeof CHORD_TEMPLATES)[0],
  rootIndex: number
): { score: number; matched: number; total: number } {
  let matched = 0;
  const total = template.intervals.length;

  for (const interval of template.intervals) {
    const pitchClass = (rootIndex + interval) % 12;
    if (pitchClasses.has(pitchClass)) {
      matched++;
    }
  }

  // Score: ratio of matched notes, weighted by how many notes in the template
  const score = total > 0 ? matched / total : 0;
  return { score, matched, total };
}

/**
 * Determine the inversion based on the lowest note.
 */
function determineInversion(
  lowestNote: number,
  rootIndex: number,
  quality: string
): number {
  const template = CHORD_TEMPLATES.find((t) => t.quality === quality);
  if (!template) return 0;

  const lowestPitchClass = ((lowestNote % 12) + 12) % 12;
  const rootPitchClass = rootIndex % 12;

  if (lowestPitchClass === rootPitchClass) return 0;

  // Check which chord tone is the lowest
  for (let i = 1; i < template.intervals.length; i++) {
    const pitchClass = (rootIndex + template.intervals[i]) % 12;
    if (pitchClass === lowestPitchClass) {
      return i;
    }
  }

  return 0;
}

/**
 * Recognize a chord from a set of MIDI notes or pitch classes.
 *
 * @param notes Array of MIDI note numbers or pitch classes (0-11)
 * @param lowestNote Optional: the lowest note played (for inversion detection)
 * @returns Best matching chord with confidence score
 */
export function recognizeChord(
  notes: number[],
  lowestNote?: number
): ChordRecognitionResult | null {
  if (notes.length === 0) return null;

  const pitchClasses = normalizePitchClasses(notes);
  let bestMatch: ChordRecognitionResult | null = null;

  // Try each root note
  for (let rootIndex = 0; rootIndex < 12; rootIndex++) {
    // Try each template
    for (const template of CHORD_TEMPLATES) {
      const { score, matched, total } = matchTemplate(pitchClasses, template, rootIndex);

      // Only consider matches with at least 50% of notes matching
      if (score < 0.5) continue;

      // Calculate confidence based on match quality and unmatched notes
      const unmatchedCount = pitchClasses.size - matched;
      const confidence = Math.max(0, score - unmatchedCount * 0.1);

      // Check if this is a better match than current best
      if (
        !bestMatch ||
        confidence > bestMatch.confidence ||
        (confidence === bestMatch.confidence && template.priority > bestMatch.confidence)
      ) {
        const inversion = lowestNote !== undefined
          ? determineInversion(lowestNote, rootIndex, template.quality)
          : 0;

        const matchedNotes = template.intervals
          .filter((interval) => pitchClasses.has((rootIndex + interval) % 12))
          .map((interval) => CHROMATIC[(rootIndex + interval) % 12]);

        const unmatchedNotes = Array.from(pitchClasses)
          .filter((pc) => !matchedNotes.includes(CHROMATIC[pc]))
          .map((pc) => CHROMATIC[pc]);

        bestMatch = {
          root: CHROMATIC[rootIndex],
          quality: template.quality,
          inversion,
          confidence: Math.min(1, confidence),
          matchedNotes,
          unmatchedNotes,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Recognize chords from a sequence of note groups (e.g., MIDI chords).
 *
 * @param noteGroups Array of note arrays, each representing a chord
 * @returns Array of recognized chords
 */
export function recognizeChordSequence(
  noteGroups: number[][]
): (ChordRecognitionResult | null)[] {
  return noteGroups.map((notes, index) => {
    // Use the first note as the lowest for inversion detection
    const lowestNote = notes.length > 0 ? Math.min(...notes) : undefined;
    return recognizeChord(notes, lowestNote);
  });
}

/**
 * Get a display string for a recognized chord.
 */
export function formatRecognizedChord(result: ChordRecognitionResult | null): string {
  if (!result) return "Unknown";

  const inversionSuffix = result.inversion > 0 ? `/${CHROMATIC[(result.inversion + 3) % 12]}` : "";
  const qualityLabel =
    result.quality === "Minor" ? "m" :
    result.quality === "Major" ? "" :
    result.quality;

  return `${result.root}${qualityLabel}${inversionSuffix} (${Math.round(result.confidence * 100)}% confidence)`;
}
