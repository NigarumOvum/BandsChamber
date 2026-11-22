import { CHROMATIC } from "./notes";

// ── Voice Leading Analysis ─────────────────────────────────────────────────

/**
 * Analyzes voice leading between consecutive chords in a progression.
 * Detects parallel fifths/octaves, common tones, smooth vs. leap motion,
 * and suggests improvements.
 */

export interface VoiceLeadingAnalysis {
  fromChord: string;
  toChord: string;
  voices: VoiceMovement[];
  hasParallelFifths: boolean;
  hasParallelOctaves: boolean;
  commonTones: number;
  smoothnessScore: number; // 0-1, higher is smoother
  suggestions: string[];
}

export interface VoiceMovement {
  fromNote: string;
  toNote: string;
  interval: number; // semitones
  type: "common" | "step" | "leap" | "unison";
}

/**
 * Get pitch classes for a chord type.
 */
function getChordPitchClasses(root: string, quality: string): number[] {
  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  if (rootIndex === -1) return [];

  const chordIntervals: Record<string, number[]> = {
    "Major": [0, 4, 7],
    "Minor": [0, 3, 7],
    "Diminished": [0, 3, 6],
    "Augmented": [0, 4, 8],
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
    "add9": [0, 4, 7, 14],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
    "Major 6/9": [0, 4, 7, 9, 14],
    "Dominant 7 #9": [0, 4, 7, 10, 15],
    "Dominant 7 b9": [0, 4, 7, 10, 13],
    "Minor Maj7": [0, 3, 7, 11],
    "Augmented 7": [0, 4, 8, 10],
    "Major 11": [0, 4, 7, 11, 17],
    "Lydian Dominant": [0, 4, 8, 10],
    "French Aug": [0, 4, 6, 10],
    "Italian Aug": [0, 4, 10],
    "German Aug": [0, 4, 6, 10],
    "Power": [0, 7],
    "sus4 add9": [0, 5, 7, 14],
  };

  const intervals = chordIntervals[quality] || [0, 4, 7];
  return intervals.map((interval) => (rootIndex + interval) % 12);
}

/**
 * Analyze voice leading between two consecutive chords.
 *
 * @param fromRoot Root of the first chord
 * @param fromQuality Quality of the first chord
 * @param toRoot Root of the second chord
 * @param toQuality Quality of the second chord
 * @returns Analysis of voice leading between the two chords
 */
export function analyzeVoiceLeading(
  fromRoot: string,
  fromQuality: string,
  toRoot: string,
  toQuality: string
): VoiceLeadingAnalysis {
  const fromNotes = getChordPitchClasses(fromRoot, fromQuality);
  const toNotes = getChordPitchClasses(toRoot, toQuality);

  const voices: VoiceMovement[] = [];
  let commonTones = 0;
  let totalMovement = 0;

  // Match voices: try to find common tones first, then closest notes
  const usedToNotes = new Set<number>();

  for (const fromNote of fromNotes) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < toNotes.length; i++) {
      if (usedToNotes.has(i)) continue;

      const toNote = toNotes[i];
      const distance = Math.min(
        Math.abs(toNote - fromNote),
        12 - Math.abs(toNote - fromNote)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      usedToNotes.add(bestIndex);
      const toNote = toNotes[bestIndex];
      const interval = ((toNote - fromNote) + 18) % 12 - 6; // -6 to +6 range

      let type: VoiceMovement["type"];
      if (interval === 0) {
        type = "common";
        commonTones++;
      } else if (Math.abs(interval) <= 2) {
        type = "step";
      } else {
        type = "leap";
      }

      voices.push({
        fromNote: CHROMATIC[fromNote],
        toNote: CHROMATIC[toNote],
        interval,
        type,
      });

      totalMovement += Math.abs(interval);
    }
  }

  // Check for parallel fifths and octaves
  const hasParallelFifths = voices.some(
    (v) => Math.abs(v.interval) === 7 && v.type !== "common"
  );
  const hasParallelOctaves = voices.some(
    (v) => v.interval === 0 && v.type === "unison"
  );

  // Calculate smoothness score (0-1)
  const maxMovement = fromNotes.length * 6; // max movement per voice is 6 semitones
  const smoothnessScore = maxMovement > 0
    ? Math.max(0, 1 - totalMovement / maxMovement)
    : 1;

  // Generate suggestions
  const suggestions: string[] = [];

  if (hasParallelFifths) {
    suggestions.push("Avoid parallel fifths — consider changing one voice by a step.");
  }
  if (hasParallelOctaves) {
    suggestions.push("Avoid parallel octaves — consider moving one voice to a different chord tone.");
  }
  if (commonTones === 0 && fromNotes.length > 0) {
    suggestions.push("No common tones — consider using chord inversions to maintain smoother voice leading.");
  }
  if (voices.some((v) => v.type === "leap")) {
    suggestions.push("Large leaps detected — try closer voicings for smoother transitions.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Voice leading looks smooth — no major issues detected.");
  }

  return {
    fromChord: `${fromRoot}${fromQuality === "Minor" ? "m" : fromQuality === "Major" ? "" : fromQuality}`,
    toChord: `${toRoot}${toQuality === "Minor" ? "m" : toQuality === "Major" ? "" : toQuality}`,
    voices,
    hasParallelFifths,
    hasParallelOctaves,
    commonTones,
    smoothnessScore,
    suggestions,
  };
}

/**
 * Analyze voice leading for an entire progression.
 *
 * @param chords Array of chords in the progression
 * @returns Array of voice leading analyses for each consecutive pair
 */
export function analyzeProgressionVoiceLeading(
  chords: { root: string; quality: string }[]
): VoiceLeadingAnalysis[] {
  const analyses: VoiceLeadingAnalysis[] = [];

  for (let i = 0; i < chords.length - 1; i++) {
    const from = chords[i];
    const to = chords[i + 1];
    analyses.push(analyzeVoiceLeading(from.root, from.quality, to.root, to.quality));
  }

  return analyses;
}

/**
 * Get a summary of voice leading quality for a progression.
 */
export function getVoiceLeadingSummary(
  analyses: VoiceLeadingAnalysis[]
): {
  averageSmoothness: number;
  totalParallelFifths: number;
  totalParallelOctaves: number;
  totalCommonTones: number;
  overallSuggestion: string;
} {
  if (analyses.length === 0) {
    return {
      averageSmoothness: 1,
      totalParallelFifths: 0,
      totalParallelOctaves: 0,
      totalCommonTones: 0,
      overallSuggestion: "Add more chords to analyze voice leading.",
    };
  }

  const averageSmoothness =
    analyses.reduce((sum, a) => sum + a.smoothnessScore, 0) / analyses.length;
  const totalParallelFifths = analyses.filter((a) => a.hasParallelFifths).length;
  const totalParallelOctaves = analyses.filter((a) => a.hasParallelOctaves).length;
  const totalCommonTones = analyses.reduce((sum, a) => sum + a.commonTones, 0);

  let overallSuggestion = "Voice leading is good overall.";
  if (totalParallelFifths > 0 || totalParallelOctaves > 0) {
    overallSuggestion = "Consider adjusting voicings to avoid parallel motion.";
  } else if (averageSmoothness < 0.5) {
    overallSuggestion = "Try using chord inversions for smoother transitions.";
  } else if (totalCommonTones === 0) {
    overallSuggestion = "No common tones found — inversions may help smooth the progression.";
  }

  return {
    averageSmoothness,
    totalParallelFifths,
    totalParallelOctaves,
    totalCommonTones,
    overallSuggestion,
  };
}
