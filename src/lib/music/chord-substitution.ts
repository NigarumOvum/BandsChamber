import { CHROMATIC } from "./notes";

// ── Chord Substitution Suggestions ─────────────────────────────────────────

/**
 * Suggests chord substitutions for a given chord.
 * Common substitution techniques include tritone substitution, major/minor swap,
 * adding extensions, and diatonic substitution.
 */

export interface ChordSubstitution {
  original: string;
  substitution: string;
  technique: SubstitutionType;
  description: string;
}

export type SubstitutionType =
  | "Tritone Substitution"
  | "Major/Minor Swap"
  | "Add Extensions"
  | "Diatonic Substitution"
  | "Rootless Voicing"
  | "Related Key";

/**
 * Get the tritone substitute for a dominant chord.
 * The tritone sub is the dominant chord a tritone (6 semitones) away.
 */
function tritoneSubstitution(root: string): string {
  const rootIndex = CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]);
  if (rootIndex === -1) return root;
  return CHROMATIC[(rootIndex + 6) % 12];
}

/**
 * Get chord quality swap (Major ↔ Minor).
 */
function qualitySwap(quality: string): string {
  if (quality.startsWith("Major") || quality === "Power") return "Minor";
  if (quality.startsWith("Minor")) return "Major";
  if (quality.startsWith("Dominant")) return "Minor 7";
  if (quality.startsWith("Diminished")) return "Minor";
  if (quality.startsWith("Augmented")) return "Major";
  return quality;
}

/**
 * Suggest extensions for a chord.
 */
function suggestExtensions(root: string, quality: string): string[] {
  const extensions: string[] = [];

  if (quality === "Major") {
    extensions.push(`${root}6`, `${root}add9`, `${root}Major 9`, `${root}Major 6/9`);
  } else if (quality === "Minor") {
    extensions.push(`${root}Minor 7`, `${root}Minor 9`, `${root}Minor 11`);
  } else if (quality.startsWith("Dominant")) {
    extensions.push(
      `${root}Dominant 9`,
      `${root}Dominant 7 #9`,
      `${root}Dominant 7 b9`,
      `${root}Lydian Dominant`
    );
  } else if (quality.startsWith("Major 7")) {
    extensions.push(`${root}Major 9`, `${root}Major 11`);
  } else if (quality.startsWith("Minor 7")) {
    extensions.push(`${root}Minor 9`, `${root}Minor 11`);
  } else if (quality === "Power") {
    extensions.push(`${root}`, `${root}add9`);
  }

  return extensions;
}

/**
 * Get diatonic substitutions (chords that share notes with the original).
 */
function diatonicSubstitutions(root: string, quality: string, key: string): string[] {
  const substitutions: string[] = [];
  const keyIndex = CHROMATIC.indexOf(key as (typeof CHROMATIC)[number]);
  if (keyIndex === -1) return substitutions;

  // In C Major, diatonic chords are: C, Dm, Em, F, G, Am, Bdim
  const diatonicChords: Record<string, { root: string; quality: string }[]> = {
    Major: [
      { root: CHROMATIC[keyIndex], quality: "Major" },
      { root: CHROMATIC[(keyIndex + 2) % 12], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 4) % 12], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 5) % 12], quality: "Major" },
      { root: CHROMATIC[(keyIndex + 7) % 12], quality: "Major" },
      { root: CHROMATIC[(keyIndex + 9) % 12], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 11) % 12], quality: "Diminished" },
    ],
    Minor: [
      { root: CHROMATIC[keyIndex], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 2) % 12], quality: "Diminished" },
      { root: CHROMATIC[(keyIndex + 4) % 12], quality: "Major" },
      { root: CHROMATIC[(keyIndex + 5) % 12], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 7) % 12], quality: "Minor" },
      { root: CHROMATIC[(keyIndex + 8) % 12], quality: "Major" },
      { root: CHROMATIC[(keyIndex + 10) % 12], quality: "Major" },
    ],
  };

  const scaleChords = diatonicChords[quality] || diatonicChords.Major;
  for (const chord of scaleChords) {
    if (chord.root !== root) {
      substitutions.push(`${chord.root}${chord.quality === "Minor" ? "m" : ""}`);
    }
  }

  return substitutions;
}

/**
 * Generate chord substitution suggestions for a given chord.
 *
 * @param root Chord root note
 * @param quality Chord quality (e.g., "Major", "Minor", "Dominant 7")
 * @param key Key of the progression (for diatonic substitutions)
 * @returns Array of substitution suggestions
 */
export function getChordSubstitutions(
  root: string,
  quality: string,
  key: string = ""
): ChordSubstitution[] {
  const substitutions: ChordSubstitution[] = [];
  const original = `${root}${quality === "Minor" ? "m" : quality === "Major" ? "" : quality}`;

  // 1. Tritone substitution (for dominant chords)
  if (quality.includes("Dominant") || quality.includes("7")) {
    const subRoot = tritoneSubstitution(root);
    substitutions.push({
      original,
      substitution: `${subRoot}Dominant 7`,
      technique: "Tritone Substitution",
      description: `Replace ${original} with ${subRoot}7 — shares the same guide tones (3rd and 7th)`,
    });
  }

  // 2. Major/Minor swap
  const swappedQuality = qualitySwap(quality);
  if (swappedQuality !== quality) {
    const swappedLabel = swappedQuality === "Minor" ? "m" : swappedQuality === "Major" ? "" : swappedQuality;
    substitutions.push({
      original,
      substitution: `${root}${swappedLabel}`,
      technique: "Major/Minor Swap",
      description: `Swap ${quality} for ${swappedQuality} — changes mood while keeping the same root`,
    });
  }

  // 3. Add extensions
  const extensions = suggestExtensions(root, quality);
  for (const ext of extensions) {
    substitutions.push({
      original,
      substitution: ext,
      technique: "Add Extensions",
      description: `Add color tones to ${original} for richer harmony`,
    });
  }

  // 4. Diatonic substitutions (if key is provided)
  if (key) {
    const diatonic = diatonicSubstitutions(root, quality, key);
    for (const sub of diatonic) {
      substitutions.push({
        original,
        substitution: sub,
        technique: "Diatonic Substitution",
        description: `Replace with a diatonic chord from the key of ${key}`,
      });
    }
  }

  // 5. Rootless voicing suggestion (for jazz)
  if (quality.includes("7") || quality.includes("Major 7") || quality.includes("Dominant")) {
    substitutions.push({
      original,
      substitution: `${original} (no root)`,
      technique: "Rootless Voicing",
      description: "Omit the root and play 3rd-7th-9th-13th — common in jazz comping",
    });
  }

  return substitutions;
}

/**
 * Get a summary of substitution techniques.
 */
export function getSubstitutionTechniques(): { type: SubstitutionType; description: string }[] {
  return [
    {
      type: "Tritone Substitution",
      description: "Replace a dominant chord with another dominant a tritone away. Creates smooth chromatic bass movement.",
    },
    {
      type: "Major/Minor Swap",
      description: "Swap between major and minor qualities on the same root. Changes the emotional color.",
    },
    {
      type: "Add Extensions",
      description: "Add 9ths, 11ths, or 13ths to enrich the harmony without changing the basic function.",
    },
    {
      type: "Diatonic Substitution",
      description: "Replace with another chord from the same key. Maintains tonal coherence.",
    },
    {
      type: "Rootless Voicing",
      description: "Omit the root note and play upper extensions. Common in jazz piano and guitar comping.",
    },
    {
      type: "Related Key",
      description: "Borrow chords from the relative major/minor or other closely related keys.",
    },
  ];
}
