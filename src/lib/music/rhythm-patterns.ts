// ── Rhythm Pattern Library ─────────────────────────────────────────────────

/**
 * Preset rhythm patterns for metronome and practice.
 * Each pattern defines a sequence of beats with accent and subdivision info.
 */

export interface RhythmPattern {
  name: string;
  category: RhythmCategory;
  timeSignature: string;
  bpm: number;
  beats: BeatInfo[];
  description: string;
}

export type RhythmCategory =
  | "Straight"
  | "Swing"
  | "Shuffle"
  | "Latin"
  | "Jazz"
  | "Rock"
  | "Electronic"
  | "Folk";

export interface BeatInfo {
  position: number; // Beat number (1-based)
  accent: "strong" | "medium" | "weak" | "none";
  subdivisions?: SubdivisionInfo[];
}

export interface SubdivisionInfo {
  position: number; // Subdivision within the beat (0 = downbeat)
  type: "e" | "&" | "a" | "b"; // e, &, a, b for 16th notes
  accent: "strong" | "medium" | "weak" | "none";
}

/**
 * Preset rhythm patterns.
 */
export const RHYTHM_PATTERNS: RhythmPattern[] = [
  {
    name: "Straight 4/4",
    category: "Straight",
    timeSignature: "4/4",
    bpm: 120,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "medium" },
      { position: 3, accent: "medium" },
      { position: 4, accent: "weak" },
    ],
    description: "Standard straight 4/4 with strong downbeat",
  },
  {
    name: "Straight 3/4 (Waltz)",
    category: "Straight",
    timeSignature: "3/4",
    bpm: 100,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "weak" },
      { position: 3, accent: "weak" },
    ],
    description: "Classic waltz pattern: ONE-two-three",
  },
  {
    name: "Straight 6/8",
    category: "Straight",
    timeSignature: "6/8",
    bpm: 90,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "weak" },
      { position: 3, accent: "weak" },
      { position: 4, accent: "medium" },
      { position: 5, accent: "weak" },
      { position: 6, accent: "weak" },
    ],
    description: "Compound duple meter: ONE-two-three-FOUR-five-six",
  },
  {
    name: "Swing Feel",
    category: "Swing",
    timeSignature: "4/4",
    bpm: 120,
    beats: [
      {
        position: 1,
        accent: "strong",
        subdivisions: [
          { position: 0, type: "&", accent: "none" },
          { position: 1, type: "e", accent: "medium" },
        ],
      },
      {
        position: 2,
        accent: "medium",
        subdivisions: [
          { position: 0, type: "&", accent: "none" },
          { position: 1, type: "e", accent: "weak" },
        ],
      },
      {
        position: 3,
        accent: "medium",
        subdivisions: [
          { position: 0, type: "&", accent: "none" },
          { position: 1, type: "e", accent: "weak" },
        ],
      },
      {
        position: 4,
        accent: "weak",
        subdivisions: [
          { position: 0, type: "&", accent: "none" },
          { position: 1, type: "e", accent: "weak" },
        ],
      },
    ],
    description: "Swing feel with triplet-based subdivisions",
  },
  {
    name: "Shuffle",
    category: "Shuffle",
    timeSignature: "4/4",
    bpm: 100,
    beats: [
      {
        position: 1,
        accent: "strong",
        subdivisions: [{ position: 0, type: "&", accent: "medium" }],
      },
      {
        position: 2,
        accent: "medium",
        subdivisions: [{ position: 0, type: "&", accent: "medium" }],
      },
      {
        position: 3,
        accent: "medium",
        subdivisions: [{ position: 0, type: "&", accent: "medium" }],
      },
      {
        position: 4,
        accent: "weak",
        subdivisions: [{ position: 0, type: "&", accent: "medium" }],
      },
    ],
    description: "Shuffle rhythm with emphasized off-beats",
  },
  {
    name: "Bossa Nova",
    category: "Latin",
    timeSignature: "4/4",
    bpm: 110,
    beats: [
      {
        position: 1,
        accent: "medium",
        subdivisions: [
          { position: 0, type: "&", accent: "weak" },
          { position: 1, type: "a", accent: "none" },
          { position: 2, type: "b", accent: "medium" },
        ],
      },
      {
        position: 2,
        accent: "weak",
        subdivisions: [
          { position: 0, type: "&", accent: "medium" },
          { position: 1, type: "a", accent: "none" },
          { position: 2, type: "b", accent: "weak" },
        ],
      },
      {
        position: 3,
        accent: "medium",
        subdivisions: [
          { position: 0, type: "&", accent: "weak" },
          { position: 1, type: "a", accent: "none" },
          { position: 2, type: "b", accent: "medium" },
        ],
      },
      {
        position: 4,
        accent: "weak",
        subdivisions: [
          { position: 0, type: "&", accent: "medium" },
          { position: 1, type: "a", accent: "none" },
          { position: 2, type: "b", accent: "weak" },
        ],
      },
    ],
    description: "Classic Bossa Nova pattern with syncopated 16th notes",
  },
  {
    name: "Salsa Clave (3-2)",
    category: "Latin",
    timeSignature: "4/4",
    bpm: 120,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "none" },
      { position: 3, accent: "none" },
      { position: 4, accent: "none" },
      { position: 5, accent: "medium" },
      { position: 6, accent: "none" },
      { position: 7, accent: "none" },
      { position: 8, accent: "strong" },
    ],
    description: "3-2 Son Clave pattern (3 hits in first measure, 2 in second)",
  },
  {
    name: "Jazz Ballad",
    category: "Jazz",
    timeSignature: "4/4",
    bpm: 70,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "weak" },
      { position: 3, accent: "medium" },
      { position: 4, accent: "weak" },
    ],
    description: "Slow jazz ballad with gentle accents",
  },
  {
    name: "Rock Backbeat",
    category: "Rock",
    timeSignature: "4/4",
    bpm: 120,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "medium" },
      { position: 3, accent: "strong" },
      { position: 4, accent: "medium" },
    ],
    description: "Classic rock backbeat with snare on 2 and 4",
  },
  {
    name: "Electronic 4-on-the-floor",
    category: "Electronic",
    timeSignature: "4/4",
    bpm: 128,
    beats: [
      { position: 1, accent: "strong" },
      { position: 2, accent: "strong" },
      { position: 3, accent: "strong" },
      { position: 4, accent: "strong" },
    ],
    description: "House/EDM 4-on-the-floor kick pattern",
  },
  {
    name: "Folk strum",
    category: "Folk",
    timeSignature: "4/4",
    bpm: 100,
    beats: [
      {
        position: 1,
        accent: "strong",
        subdivisions: [{ position: 0, type: "&", accent: "weak" }],
      },
      {
        position: 2,
        accent: "medium",
        subdivisions: [{ position: 0, type: "&", accent: "weak" }],
      },
      {
        position: 3,
        accent: "strong",
        subdivisions: [{ position: 0, type: "&", accent: "weak" }],
      },
      {
        position: 4,
        accent: "medium",
        subdivisions: [{ position: 0, type: "&", accent: "weak" }],
      },
    ],
    description: "Simple folk strumming pattern: Down-down/up-up/down-up",
  },
  {
    name: "Reggae Skank",
    category: "Latin",
    timeSignature: "4/4",
    bpm: 80,
    beats: [
      { position: 1, accent: "none" },
      {
        position: 2,
        accent: "none",
        subdivisions: [{ position: 0, type: "&", accent: "strong" }],
      },
      { position: 3, accent: "none" },
      {
        position: 4,
        accent: "none",
        subdivisions: [{ position: 0, type: "&", accent: "strong" }],
      },
    ],
    description: "Reggae off-beat skank on the upstrokes",
  },
];

/**
 * Get rhythm patterns by category.
 */
export function getPatternsByCategory(category: RhythmCategory): RhythmPattern[] {
  return RHYTHM_PATTERNS.filter((p) => p.category === category);
}

/**
 * Get all rhythm categories.
 */
export function getRhythmCategories(): RhythmCategory[] {
  return [
    "Straight",
    "Swing",
    "Shuffle",
    "Latin",
    "Jazz",
    "Rock",
    "Electronic",
    "Folk",
  ];
}

/**
 * Get a rhythm pattern by name.
 */
export function getPatternByName(name: string): RhythmPattern | null {
  return RHYTHM_PATTERNS.find((p) => p.name === name) || null;
}

/**
 * Convert a rhythm pattern to a simple accent array for metronome.
 * Returns an array of accent levels (0-3) for each beat.
 */
export function patternToAccents(pattern: RhythmPattern): number[] {
  const accentMap: Record<string, number> = {
    strong: 3,
    medium: 2,
    weak: 1,
    none: 0,
  };

  return pattern.beats.map((beat) => accentMap[beat.accent] || 0);
}

/**
 * Get the subdivision ratio for a pattern (e.g., 1.0 for straight, 0.667 for swing).
 */
export function getSubdivisionRatio(pattern: RhythmPattern): number {
  if (pattern.category === "Swing" || pattern.category === "Shuffle") {
    return 0.667; // Triplet-based swing
  }
  return 1.0; // Straight
}
