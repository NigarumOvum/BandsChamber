import { CHROMATIC } from "./notes";

// ── Cadence Detection ──────────────────────────────────────────────────────

/**
 * Detects common cadences in chord progressions.
 * A cadence is a sequence of chords that creates a sense of resolution or pause.
 */

export type CadenceType =
  | "Authentic"        // V-I (perfect cadence)
  | "Plagal"           // IV-I (church cadence)
  | "Half"             // V (incomplete cadence)
  | "Deceptive"        // V-vi (surprise cadence)
  | "Backdoor"         // bVII-bIII (jazz cadence)
  | "Ritardando"       // IV-VI (slowdown cadence)
  | "Imperfect"        // Any chord to I (other than V or IV)
  | "Phrygian Half";   // bII-I (Spanish flavor)

export interface CadenceInfo {
  type: CadenceType;
  description: string;
  chords: string[];
  startIndex: number;
  endIndex: number;
  strength: "strong" | "medium" | "weak";
}

/**
 * Common cadence patterns (using scale degrees).
 * Each pattern is defined as a sequence of scale degrees and chord qualities.
 */
const CADENCE_PATTERNS: Array<{
  type: CadenceType;
  description: string;
  degrees: number[];  // Scale degrees (1-indexed)
  qualities: string[]; // Expected chord qualities
  strength: "strong" | "medium" | "weak";
}> = [
  {
    type: "Authentic",
    description: "V → I (Perfect cadence — strongest resolution)",
    degrees: [5, 1],
    qualities: ["Major", "Major"],
    strength: "strong",
  },
  {
    type: "Plagal",
    description: "IV → I (Church cadence — 'Amen' cadence)",
    degrees: [4, 1],
    qualities: ["Major", "Major"],
    strength: "medium",
  },
  {
    type: "Half",
    description: "V (Incomplete cadence — expects resolution)",
    degrees: [5],
    qualities: ["Major"],
    strength: "medium",
  },
  {
    type: "Deceptive",
    description: "V → vi (Surprise cadence — avoids expected resolution)",
    degrees: [5, 6],
    qualities: ["Major", "Minor"],
    strength: "medium",
  },
  {
    type: "Backdoor",
    description: "bVII → bIII (Jazz cadence — smooth, bluesy resolution)",
    degrees: [7, 3],
    qualities: ["Major", "Minor"],
    strength: "medium",
  },
  {
    type: "Ritardando",
    description: "IV → VI (Slowdown cadence — gentle, open feeling)",
    degrees: [4, 6],
    qualities: ["Major", "Major"],
    strength: "weak",
  },
  {
    type: "Phrygian Half",
    description: "bII → I (Spanish/Flamenco flavor)",
    degrees: [2, 1],
    qualities: ["Major", "Major"],
    strength: "medium",
  },
];

/**
 * Get scale degrees for a key and scale type.
 */
function getScaleDegrees(key: string, scaleType: string): string[] {
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return [];

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

  const intervals = scales[scaleType] || [0, 2, 4, 5, 7, 9, 11];
  return intervals.map((interval) => CHROMATIC[(keyIndex + interval) % 12]);
}

/**
 * Detect cadences in a chord progression.
 *
 * @param key Root note of the key
 * @param scaleType Scale type (e.g., "Major", "Minor")
 * @param chords Array of chord roots in the progression
 * @returns Array of detected cadences with their positions and types
 */
export function detectCadences(
  key: string,
  scaleType: string,
  chords: { root: string; quality: string }[]
): CadenceInfo[] {
  const scaleNotes = getScaleDegrees(key, scaleType);
  if (scaleNotes.length === 0) return [];

  const cadences: CadenceInfo[] = [];

  // Check each pattern against the progression
  for (const pattern of CADENCE_PATTERNS) {
    for (let i = 0; i <= chords.length - pattern.degrees.length; i++) {
      let matches = true;

      for (let j = 0; j < pattern.degrees.length; j++) {
        const chord = chords[i + j];
        const expectedDegree = pattern.degrees[j];
        const expectedQuality = pattern.qualities[j];

        // Find the scale degree of the chord root
        const chordRootIndex = CHROMATIC.indexOf(chord.root as (typeof CHROMATIC)[number]);
        if (chordRootIndex === -1) {
          matches = false;
          break;
        }

        // Check if the chord root matches the expected scale degree
        const expectedNote = scaleNotes[expectedDegree - 1];
        if (!expectedNote || chord.root !== expectedNote) {
          matches = false;
          break;
        }

        // Check if the chord quality matches (if specified)
        if (expectedQuality && !chord.quality.includes(expectedQuality)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        cadences.push({
          type: pattern.type,
          description: pattern.description,
          chords: chords.slice(i, i + pattern.degrees.length).map((c) => c.root),
          startIndex: i,
          endIndex: i + pattern.degrees.length - 1,
          strength: pattern.strength,
        });
      }
    }
  }

  // Detect Imperfect cadences (any chord to I, except V-I and IV-I)
  const tonicNote = scaleNotes[0];
  for (let i = 1; i < chords.length; i++) {
    if (chords[i].root === tonicNote) {
      const prevChord = chords[i - 1];
      // Skip if already detected as Authentic or Plagal
      const isAuthentic = cadences.some(
        (c) => c.type === "Authentic" && c.endIndex === i
      );
      const isPlagal = cadences.some(
        (c) => c.type === "Plagal" && c.endIndex === i
      );

      if (!isAuthentic && !isPlagal) {
        cadences.push({
          type: "Imperfect",
          description: `${prevChord.root} → I (Imperfect cadence)`,
          chords: [prevChord.root, tonicNote],
          startIndex: i - 1,
          endIndex: i,
          strength: "weak",
        });
      }
    }
  }

  return cadences;
}

/**
 * Get a human-readable label for a cadence type.
 */
export function getCadenceLabel(cadenceType: CadenceType): string {
  const labels: Record<CadenceType, string> = {
    "Authentic": "Perfect Cadence (V-I)",
    "Plagal": "Church Cadence (IV-I)",
    "Half": "Half Cadence (V)",
    "Deceptive": "Deceptive Cadence (V-vi)",
    "Backdoor": "Backdoor Cadence (bVII-bIII)",
    "Ritardando": "Ritardando Cadence (IV-VI)",
    "Imperfect": "Imperfect Cadence",
    "Phrygian Half": "Phrygian Half Cadence (bII-I)",
  };
  return labels[cadenceType];
}
