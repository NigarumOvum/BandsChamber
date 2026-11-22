// ── ABC Notation Export ──────────────────────────────────────────────────────

/**
 * Export progressions and melodies as ABC notation, a plain-text music notation
 * format widely supported by notation software.
 */

export interface ABCNote {
  note: string; // e.g., "C", "D#", "A"
  octave: number;
  duration: number; // in beats
  accidental?: string; // "^" for sharp, "_" for flat, "=" for natural
}

/**
 * Map chord quality to ABC harmony notation.
 */
function chordToABC(root: string, quality: string): string {
  const qualityMap: Record<string, string> = {
    "Major": "",
    "Maj": "",
    "Minor": "m",
    "min": "m",
    "Diminished": "dim",
    "Augmented": "+",
    "Major 7": "maj7",
    "Minor 7": "m7",
    "Dominant 7": "7",
    "Power": "",
  };

  return `${root}${qualityMap[quality] || quality}`;
}

/**
 * Export a chord progression to ABC notation.
 */
export function exportProgressionToABC(
  chords: { root: string; quality: string }[],
  options: {
    title?: string;
    key?: string;
    timeSignature?: string;
    bpm?: number;
    beatsPerChord?: number;
  } = {}
): string {
  const {
    title = "Chord Progression",
    key = "C",
    timeSignature = "4/4",
    bpm = 120,
    beatsPerChord = 4,
  } = options;

  let abc = `X: 1
T: ${title}
K: ${key}
M: ${timeSignature}
Q: 1/4=${bpm}

`;

  // Add harmony line
  const harmony = chords
    .map((chord) => chordToABC(chord.root, chord.quality))
    .join(" ");
  abc += `H: ${harmony}\n\n`;

  // Add a simple melody line (root notes)
  abc += chords
    .map((chord) => {
      const duration = beatsPerChord === 4 ? "" : beatsPerChord === 2 ? "/" : beatsPerChord === 1 ? "//" : "";
      return `${chord.root}${duration}`;
    })
    .join(" ");

  return abc;
}

/**
 * Export a melody to ABC notation.
 */
export function exportMelodyToABC(
  notes: ABCNote[],
  options: {
    title?: string;
    key?: string;
    timeSignature?: string;
    bpm?: number;
  } = {}
): string {
  const {
    title = "Melody",
    key = "C",
    timeSignature = "4/4",
    bpm = 120,
  } = options;

  let abc = `X: 1
T: ${title}
K: ${key}
M: ${timeSignature}
Q: 1/4=${bpm}

`;

  // Convert notes to ABC notation
  const melody = notes
    .map((note) => {
      let abcNote = note.note;
      if (note.accidental) {
        abcNote = `${note.accidental}${note.note}`;
      }
      // Octave: > for up, < for down
      if (note.octave > 4) {
        abcNote += ">".repeat(note.octave - 4);
      } else if (note.octave < 4) {
        abcNote += "<".repeat(4 - note.octave);
      }
      // Duration
      if (note.duration === 2) {
        abcNote += "-";
      } else if (note.duration === 0.5) {
        abcNote += "/";
      } else if (note.duration === 0.25) {
        abcNote += "//";
      }
      return abcNote;
    })
    .join("");

  abc += melody;

  return abc;
}

/**
 * Download ABC notation as a file.
 */
export function downloadABC(abc: string, filename: string = "export abc") {
  const blob = new Blob([abc], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
