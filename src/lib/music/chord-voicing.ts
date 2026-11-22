import { CHROMATIC, intervalsToPitchClasses } from "./notes";

// ── Chord Voicing Suggestions ──────────────────────────────────────────────

/**
 * Suggests different voicings for chords, including jazz voicings
 * like rootless, drop 2, and drop 3.
 */

export interface ChordVoicing {
  name: string;
  type: VoicingType;
  intervals: number[]; // Semitones from root
  description: string;
  bestFor: string[]; // Instruments this voicing works well for
}

export type VoicingType =
  | "Close Position"
  | "Open Position"
  | "Rootless"
  | "Drop 2"
  | "Drop 3"
  | "Drop 2 and 4"
  | "Shell"
  | "Cluster";

/**
 * Generate voicings for a given chord.
 */
export function getChordVoicings(root: string, chordType: string): ChordVoicing[] {
  const voicings: ChordVoicing[] = [];
  const baseIntervals = getChordIntervals(chordType);

  if (baseIntervals.length === 0) return voicings;

  // 1. Close position (default)
  voicings.push({
    name: "Close Position",
    type: "Close Position",
    intervals: baseIntervals,
    description: "Notes stacked as closely as possible in thirds",
    bestFor: ["Piano", "Guitar", "Keys"],
  });

  // 2. Open position (spread out)
  if (baseIntervals.length >= 4) {
    const open = [...baseIntervals];
    // Move the top note up an octave
    open[open.length - 1] += 12;
    voicings.push({
      name: "Open Position",
      type: "Open Position",
      intervals: open,
      description: "Notes spread out for a wider sound",
      bestFor: ["Piano", "Keys", "Strings"],
    });
  }

  // 3. Rootless voicing (omit root, keep 3rd-7th-extensions)
  if (baseIntervals.length >= 4) {
    // Remove root (first interval = 0)
    const rootless = baseIntervals.slice(1);
    voicings.push({
      name: "Rootless",
      type: "Rootless",
      intervals: rootless,
      description: "Omit the root — common in jazz comping, leaves room for bass",
      bestFor: ["Piano", "Guitar", "Keys"],
    });
  }

  // 4. Drop 2 voicing (drop 2nd highest note down an octave)
  if (baseIntervals.length >= 4) {
    const drop2 = [...baseIntervals];
    // Sort intervals, drop the 2nd from top
    drop2.sort((a, b) => a - b);
    const secondFromTop = drop2.length - 2;
    drop2[secondFromTop] -= 12;
    drop2.sort((a, b) => a - b);
    voicings.push({
      name: "Drop 2",
      type: "Drop 2",
      intervals: drop2,
      description: "Drop the 2nd highest note down an octave — smooth, spread voicing",
      bestFor: ["Piano", "Guitar", "Keys"],
    });
  }

  // 5. Drop 3 voicing (drop 3rd highest note down an octave)
  if (baseIntervals.length >= 5) {
    const drop3 = [...baseIntervals];
    drop3.sort((a, b) => a - b);
    const thirdFromTop = drop3.length - 3;
    drop3[thirdFromTop] -= 12;
    drop3.sort((a, b) => a - b);
    voicings.push({
      name: "Drop 3",
      type: "Drop 3",
      intervals: drop3,
      description: "Drop the 3rd highest note down an octave — wider spread",
      bestFor: ["Piano", "Keys"],
    });
  }

  // 6. Shell voicing (root + 3rd + 7th)
  if (baseIntervals.length >= 4) {
    // Find root (0), 3rd (major or minor), and 7th
    const shell = baseIntervals.filter((interval) =>
      [0, 3, 4, 10, 11].includes(interval % 12)
    );
    if (shell.length >= 3) {
      voicings.push({
        name: "Shell",
        type: "Shell",
        intervals: shell.slice(0, 3),
        description: "Root + 3rd + 7th — minimal jazz voicing, defines chord quality",
        bestFor: ["Piano", "Guitar"],
      });
    }
  }

  // 7. Cluster voicing (notes close together, chromatic)
  if (baseIntervals.length >= 3) {
    const cluster = baseIntervals.slice(0, 3).map((interval, i) => i);
    voicings.push({
      name: "Cluster",
      type: "Cluster",
      intervals: cluster,
      description: "Notes clustered together — tense, modern sound",
      bestFor: ["Piano", "Keys"],
    });
  }

  return voicings;
}

/**
 * Get the base intervals for a chord type.
 */
function getChordIntervals(chordType: string): number[] {
  const chordMap: Record<string, number[]> = {
    Major: [0, 4, 7],
    Minor: [0, 3, 7],
    Diminished: [0, 3, 6],
    Augmented: [0, 4, 8],
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
    add9: [0, 4, 7, 14],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    "Major 6/9": [0, 4, 7, 9, 14],
    "Dominant 7 #9": [0, 4, 7, 10, 15],
    "Dominant 7 b9": [0, 4, 7, 10, 13],
    "Minor Maj7": [0, 3, 7, 11],
    "Augmented 7": [0, 4, 8, 10],
    "Major 11": [0, 4, 7, 11, 14, 17],
    "Lydian Dominant": [0, 4, 8, 10],
    "French Aug": [0, 4, 6, 10],
    "Italian Aug": [0, 4, 10],
    "German Aug": [0, 4, 6, 10],
    Power: [0, 7],
    "sus4 add9": [0, 5, 7, 14],
  };

  return chordMap[chordType] || [0, 4, 7];
}

/**
 * Get the note names for a voicing in a given root.
 */
export function getVoicingNotes(root: string, intervals: number[]): string[] {
  return intervalsToPitchClasses(root, intervals);
}

/**
 * Get voicing type descriptions.
 */
export function getVoicingTypeDescriptions(): { type: VoicingType; description: string }[] {
  return [
    {
      type: "Close Position",
      description: "Notes stacked as closely as possible in thirds. Warm, compact sound.",
    },
    {
      type: "Open Position",
      description: "Notes spread out across a wider range. Airy, spacious sound.",
    },
    {
      type: "Rootless",
      description: "Omit the root note. Common in jazz comping, leaves room for the bass player.",
    },
    {
      type: "Drop 2",
      description: "Drop the 2nd highest note down an octave. Smooth, spread voicing — very common in jazz.",
    },
    {
      type: "Drop 3",
      description: "Drop the 3rd highest note down an octave. Wider spread than Drop 2.",
    },
    {
      type: "Drop 2 and 4",
      description: "Drop both the 2nd and 4th highest notes. Very wide, orchestral sound.",
    },
    {
      type: "Shell",
      description: "Root + 3rd + 7th. Minimal jazz voicing that defines the chord quality with few notes.",
    },
    {
      type: "Cluster",
      description: "Notes clustered together chromatically. Tense, modern, dissonant sound.",
    },
  ];
}

/**
 * Suggest voicings for a specific instrument.
 */
export function getInstrumentVoicings(root: string, chordType: string, instrument: string): ChordVoicing[] {
  const allVoicings = getChordVoicings(root, chordType);

  // Filter by instrument suitability
  return allVoicings.filter((voicing) =>
    voicing.bestFor.some((inst) => inst.toLowerCase().includes(instrument.toLowerCase()))
  );
}
