import { CHROMATIC } from "./notes";

// ── Key Signature Data ─────────────────────────────────────────────────────

/**
 * Key signature data for all 12 major and minor keys.
 * Shows the number of sharps or flats and which notes are affected.
 */

export interface KeySignature {
  key: string;
  mode: "Major" | "Minor";
  sharps: number;
  flats: number;
  accidentalNotes: string[]; // Notes with sharps or flats
  relativeMinor?: string;
  relativeMajor?: string;
}

/**
 * Key signature order of sharps: F, C, G, D, A, E, B
 * Key signature order of flats: B, E, A, D, G, C, F
 */
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"] as const;
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"] as const;

/**
 * Major key signatures for all 12 keys.
 */
export const MAJOR_KEY_SIGNATURES: KeySignature[] = [
  { key: "C", mode: "Major", sharps: 0, flats: 0, accidentalNotes: [], relativeMinor: "A" },
  { key: "G", mode: "Major", sharps: 1, flats: 0, accidentalNotes: ["F#"], relativeMinor: "E" },
  { key: "D", mode: "Major", sharps: 2, flats: 0, accidentalNotes: ["F#", "C#"], relativeMinor: "B" },
  { key: "A", mode: "Major", sharps: 3, flats: 0, accidentalNotes: ["F#", "C#", "G#"], relativeMinor: "F#" },
  { key: "E", mode: "Major", sharps: 4, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#"], relativeMinor: "C#" },
  { key: "B", mode: "Major", sharps: 5, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#"], relativeMinor: "G#" },
  { key: "F#", mode: "Major", sharps: 6, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#", "E#"], relativeMinor: "D#" },
  { key: "C#", mode: "Major", sharps: 7, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#", "E#", "B#"], relativeMinor: "A#" },
  { key: "F", mode: "Major", sharps: 0, flats: 1, accidentalNotes: ["Bb"], relativeMinor: "D" },
  { key: "Bb", mode: "Major", sharps: 0, flats: 2, accidentalNotes: ["Bb", "Eb"], relativeMinor: "G" },
  { key: "Eb", mode: "Major", sharps: 0, flats: 3, accidentalNotes: ["Bb", "Eb", "Ab"], relativeMinor: "C" },
  { key: "Ab", mode: "Major", sharps: 0, flats: 4, accidentalNotes: ["Bb", "Eb", "Ab", "Db"], relativeMinor: "F" },
  { key: "Db", mode: "Major", sharps: 0, flats: 5, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb"], relativeMinor: "Bb" },
  { key: "Gb", mode: "Major", sharps: 0, flats: 6, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb"], relativeMinor: "Eb" },
  { key: "Cb", mode: "Major", sharps: 0, flats: 7, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"], relativeMinor: "Ab" },
];

/**
 * Minor key signatures for all 12 keys.
 */
export const MINOR_KEY_SIGNATURES: KeySignature[] = [
  { key: "A", mode: "Minor", sharps: 0, flats: 0, accidentalNotes: [], relativeMajor: "C" },
  { key: "E", mode: "Minor", sharps: 1, flats: 0, accidentalNotes: ["F#"], relativeMajor: "G" },
  { key: "B", mode: "Minor", sharps: 2, flats: 0, accidentalNotes: ["F#", "C#"], relativeMajor: "D" },
  { key: "F#", mode: "Minor", sharps: 3, flats: 0, accidentalNotes: ["F#", "C#", "G#"], relativeMajor: "A" },
  { key: "C#", mode: "Minor", sharps: 4, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#"], relativeMajor: "E" },
  { key: "G#", mode: "Minor", sharps: 5, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#"], relativeMajor: "B" },
  { key: "D#", mode: "Minor", sharps: 6, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#", "E#"], relativeMajor: "F#" },
  { key: "A#", mode: "Minor", sharps: 7, flats: 0, accidentalNotes: ["F#", "C#", "G#", "D#", "A#", "E#", "B#"], relativeMajor: "C#" },
  { key: "D", mode: "Minor", sharps: 0, flats: 1, accidentalNotes: ["Bb"], relativeMajor: "F" },
  { key: "G", mode: "Minor", sharps: 0, flats: 2, accidentalNotes: ["Bb", "Eb"], relativeMajor: "Bb" },
  { key: "C", mode: "Minor", sharps: 0, flats: 3, accidentalNotes: ["Bb", "Eb", "Ab"], relativeMajor: "Eb" },
  { key: "F", mode: "Minor", sharps: 0, flats: 4, accidentalNotes: ["Bb", "Eb", "Ab", "Db"], relativeMajor: "Ab" },
  { key: "Bb", mode: "Minor", sharps: 0, flats: 5, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb"], relativeMajor: "Db" },
  { key: "Eb", mode: "Minor", sharps: 0, flats: 6, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb"], relativeMajor: "Gb" },
  { key: "Ab", mode: "Minor", sharps: 0, flats: 7, accidentalNotes: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"], relativeMajor: "Cb" },
];

/**
 * Get the key signature for a given key and mode.
 */
export function getKeySignature(key: string, mode: "Major" | "Minor" = "Major"): KeySignature | null {
  const signatures = mode === "Major" ? MAJOR_KEY_SIGNATURES : MINOR_KEY_SIGNATURES;
  return signatures.find((sig) => sig.key === key) || null;
}

/**
 * Get all key signatures (major and minor).
 */
export function getAllKeySignatures(): KeySignature[] {
  return [...MAJOR_KEY_SIGNATURES, ...MINOR_KEY_SIGNATURES];
}

/**
 * Get the key signature label for display (e.g., "2 sharps", "3 flats").
 */
export function getKeySignatureLabel(key: string, mode: "Major" | "Minor" = "Major"): string {
  const sig = getKeySignature(key, mode);
  if (!sig) return "Unknown";
  if (sig.sharps === 0 && sig.flats === 0) return "No sharps or flats";
  if (sig.sharps > 0) return `${sig.sharps} sharp${sig.sharps > 1 ? "s" : ""}`;
  if (sig.flats > 0) return `${sig.flats} flat${sig.flats > 1 ? "s" : ""}`;
  return "Unknown";
}

/**
 * Get the accidental symbols for a key signature.
 */
export function getAccidentalSymbols(key: string, mode: "Major" | "Minor" = "Major"): string[] {
  const sig = getKeySignature(key, mode);
  if (!sig) return [];
  return sig.accidentalNotes.map((note) => {
    if (note.includes("#")) return "♯";
    if (note.includes("b")) return "♭";
    return "♮";
  });
}

/**
 * Get the relative minor of a major key.
 */
export function getRelativeMinor(majorKey: string): string | null {
  const sig = getKeySignature(majorKey, "Major");
  return sig?.relativeMinor || null;
}

/**
 * Get the relative major of a minor key.
 */
export function getRelativeMajor(minorKey: string): string | null {
  const sig = getKeySignature(minorKey, "Minor");
  return sig?.relativeMajor || null;
}

/**
 * Get closely related keys (keys that share at most 1 accidental difference).
 */
export function getCloselyRelatedKeys(key: string, mode: "Major" | "Minor" = "Major"): string[] {
  const related: string[] = [];
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return related;

  if (mode === "Major") {
    // Dominant key (5th)
    related.push(`${CHROMATIC[(keyIndex + 7) % 12]} Major`);
    // Subdominant key (4th)
    related.push(`${CHROMATIC[(keyIndex + 5) % 12]} Major`);
    // Relative minor
    const relMinor = getRelativeMinor(key);
    if (relMinor) related.push(`${relMinor} Minor`);
    // Minor of dominant
    const dominantKey = CHROMATIC[(keyIndex + 7) % 12];
    const dominantRelMinor = getRelativeMinor(dominantKey);
    if (dominantRelMinor) related.push(`${dominantRelMinor} Minor`);
    // Minor of subdominant
    const subdominantKey = CHROMATIC[(keyIndex + 5) % 12];
    const subdominantRelMinor = getRelativeMinor(subdominantKey);
    if (subdominantRelMinor) related.push(`${subdominantRelMinor} Minor`);
  } else {
    // Relative major
    const relMajor = getRelativeMajor(key);
    if (relMajor) related.push(`${relMajor} Major`);
    // Dominant minor (5th)
    related.push(`${CHROMATIC[(keyIndex + 7) % 12]} Minor`);
    // Subdominant minor (4th)
    related.push(`${CHROMATIC[(keyIndex + 5) % 12]} Minor`);
    // Major of dominant minor
    const dominantKey = CHROMATIC[(keyIndex + 7) % 12];
    const dominantRelMajor = getRelativeMajor(dominantKey);
    if (dominantRelMajor) related.push(`${dominantRelMajor} Major`);
    // Major of subdominant minor
    const subdominantKey = CHROMATIC[(keyIndex + 5) % 12];
    const subdominantRelMajor = getRelativeMajor(subdominantKey);
    if (subdominantRelMajor) related.push(`${subdominantRelMajor} Major`);
  }

  return related;
}
