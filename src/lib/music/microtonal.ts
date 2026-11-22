import { CHROMATIC } from "./notes";

// ── Microtonal Support ──────────────────────────────────────────────────────

/**
 * Support for quarter-tone and other microtonal scales.
 * Useful for Middle Eastern, Indian, and avant-garde music.
 */

export interface MicrotonalScale {
  name: string;
  description: string;
  cents: number[]; // intervals in cents from root (100 cents = 1 semitone)
  origin?: string;
}

export interface MicrotonalNote {
  pitchClass: string; // e.g., "C", "C##" (quarter-tone sharp)
  cents: number; // cents above root
  frequency: number; // frequency at octave 4
}

const A4 = 440;

/**
 * Common microtonal scales.
 */
export const MICROTONAL_SCALES: MicrotonalScale[] = [
  {
    name: "Quarter Tone",
    description: "24-tone equal temperament — every semitone split in half",
    cents: Array.from({ length: 24 }, (_, i) => i * 50),
  },
  {
    name: "Middle Eastern Maqam",
    description: "Common Arabic maqam with quarter-tone intervals",
    cents: [0, 100, 150, 200, 300, 400, 500, 550, 700, 800, 900, 1000],
    origin: "Arabic",
  },
  {
    name: "Indian Shruti (22-tone)",
    description: "Approximation of 22 shrutis in 12-tone equal temperament",
    cents: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050],
    origin: "Indian",
  },
  {
    name: "Just Intonation Major",
    description: "Pure intervals based on harmonic series",
    cents: [0, 204, 386, 498, 588, 702, 884, 1000],
  },
  {
    name: "Pythagorean Major",
    description: "Based on perfect fifths (3:2 ratio)",
    cents: [0, 204, 386, 498, 588, 702, 884, 996],
  },
  {
    name: "Wholetone",
    description: "All whole steps — Debussy, Scriabin",
    cents: [0, 200, 400, 600, 800, 1000],
  },
  {
    name: "Harmonic Series (partial 1-8)",
    description: "First 8 harmonics of the harmonic series",
    cents: [0, 1200, 1902, 2409, 2773, 3113, 3432, 3717],
  },
  {
    name: "Turkish Maqam",
    description: "Turkish classical music scale with neutral intervals",
    cents: [0, 100, 250, 350, 450, 550, 700, 800, 950, 1050, 1200],
    origin: "Turkish",
  },
  {
    name: "Jewish Scale",
    description: "Also known as the Freygish scale with quarter-tone inflections",
    cents: [0, 100, 300, 400, 500, 600, 700, 800, 900, 1000],
  },
  {
    name: "31-ET (approximation)",
    description: "31-tone equal temperament — used in Scandinavian folk music",
    cents: Array.from({ length: 13 }, (_, i) => Math.round(i * 1200 / 31)),
  },
];

/**
 * Calculate the frequency of a microtonal note.
 *
 * @param cents Cents above A4 (440 Hz)
 * @returns Frequency in Hz
 */
export function microtonalFrequency(cents: number): number {
  return A4 * Math.pow(2, cents / 1200);
}

/**
 * Generate notes for a microtonal scale in a given key.
 *
 * @param root Root note (e.g., "C")
 * @param scale Microtonal scale definition
 * @param octave Octave number
 * @returns Array of microtonal notes with frequencies
 */
export function generateMicrotonalScale(
  root: string,
  scale: MicrotonalScale,
  octave: number = 4
): MicrotonalNote[] {
  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  if (rootIndex === -1) return [];

  // Base frequency for the root note
  const rootMidi = rootIndex + (octave + 1) * 12;
  const rootFrequency = A4 * Math.pow(2, (rootMidi - 69) / 12);

  return scale.cents.map((cents, index) => {
    const frequency = rootFrequency * Math.pow(2, cents / 1200);

    // Generate pitch class label
    let pitchClass = CHROMATIC[rootIndex];
    const semitones = Math.floor(cents / 100);
    const remainingCents = cents % 100;

    if (semitones > 0) {
      pitchClass = CHROMATIC[(rootIndex + semitones) % 12];
    }

    // Add quarter-tone accidentals
    let accidental = "";
    if (remainingCents === 50) {
      accidental = "‡"; // quarter-tone sharp
    } else if (remainingCents === -50) {
      accidental = "♭‡"; // quarter-tone flat
    }

    return {
      pitchClass: `${pitchClass}${accidental}`,
      cents,
      frequency,
    };
  });
}

/**
 * Convert cents to a human-readable interval string.
 */
export function centsToInterval(cents: number): string {
  const semitones = Math.floor(cents / 100);
  const remaining = cents % 100;

  const intervalNames = [
    "Unison", "Minor 2nd", "Major 2nd", "Minor 3rd", "Major 3rd",
    "Perfect 4th", "Tritone", "Perfect 5th", "Minor 6th", "Major 6th",
    "Minor 7th", "Major 7th", "Octave"
  ];

  const intervalName = intervalNames[Math.min(semitones, intervalNames.length - 1)] || `${semitones} semitones`;

  if (remaining === 50) {
    return `${intervalName} + quarter-tone`;
  } else if (remaining === -50) {
    return `${intervalName} - quarter-tone`;
  } else if (remaining !== 0) {
    return `${intervalName} + ${remaining} cents`;
  }

  return intervalName;
}

/**
 * Get the nearest equal-tempered note for a microtonal pitch.
 */
export function nearestEqualTempered(cents: number): { note: string; deviation: number } {
  const semitones = Math.round(cents / 100);
  const deviation = cents - semitones * 100;
  const noteIndex = semitones % 12;
  const note = CHROMATIC[Math.max(0, noteIndex) % 12];

  return { note, deviation };
}

/**
 * Format a microtonal scale for display.
 */
export function formatMicrotonalScale(scale: MicrotonalScale): string {
  const originInfo = scale.origin ? ` (${scale.origin})` : "";
  return `${scale.name}${originInfo}: ${scale.cents.length} notes — ${scale.description}`;
}
