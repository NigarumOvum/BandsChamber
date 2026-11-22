// ── MusicXML Export ──────────────────────────────────────────────────────────

/**
 * Export progressions, tabs, and MIDI arrangements as MusicXML
 * for import into notation software (MuseScore, Sibelius, Finale).
 */

export interface MusicXMLNote {
  pitch: number; // MIDI note number
  start: number; // start time in beats
  duration: number; // duration in beats
  voice?: number;
  type?: "whole" | "half" | "quarter" | "eighth" | "sixteenth";
}

export interface MusicXMLChord {
  root: number; // MIDI note number
  quality: string;
  start: number; // start time in beats
  duration: number; // duration in beats
}

/**
 * Map duration in beats to MusicXML note type.
 */
function getNoteType(duration: number): string {
  if (duration >= 4) return "whole";
  if (duration >= 2) return "half";
  if (duration >= 1) return "quarter";
  if (duration >= 0.5) return "eighth";
  return "sixteenth";
}

/**
 * Calculate dots for note duration.
 */
function getDots(duration: number): number {
  if (duration === 1.5) return 1; // quarter + dot
  if (duration === 3) return 1; // half + dot
  if (duration === 0.75) return 1; // eighth + dot
  return 0;
}

/**
 * Convert MIDI note to MusicXML pitch.
 */
function midiToMusicXMLPitch(midi: number): { step: string; octave: number; alter?: number } {
  const noteNames = ["C", "D", "E", "F", "G", "A", "B"];
  const accidentals = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;

  return {
    step: noteNames[noteIndex],
    octave,
    alter: accidentals[noteIndex] === 1 ? 1 : undefined,
  };
}

/**
 * Export notes to MusicXML format.
 */
export function exportToMusicXML(
  notes: MusicXMLNote[],
  options: {
    title?: string;
    composer?: string;
    timeSignature?: { numerator: number; denominator: number };
    keySignature?: number; // sharps (positive) or flats (negative)
    bpm?: number;
  } = {}
): string {
  const {
    title = "Untitled",
    composer = "BandsChamber Studio",
    timeSignature = { numerator: 4, denominator: 4 },
    keySignature = 0,
    bpm = 120,
  } = options;

  const divisions = 4; // quarters per whole

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
 "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${title}</work-title>
  </work>
  <identification>
    <creator type="composer">${composer}</creator>
    <encoding>
      <software>BandsChamber Studio</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${keySignature}</fifths>
        </key>
        <time>
          <beats>${timeSignature.numerator}</beats>
          <beat-type>${timeSignature.denominator}</beat-type>
        </time>
        <clef>
          <sign>treble</sign>
          <line>5</line>
        </clef>
      </attributes>
      <sound tempo="${bpm}" />
`;

  // Add notes
  for (const note of notes) {
    const pitch = midiToMusicXMLPitch(note.pitch);
    const noteType = getNoteType(note.duration);
    const dots = getDots(note.duration);
    const durationValue = Math.round(note.duration * divisions * 4);

    xml += `      <note>
        <pitch>
          <step>${pitch.step}</step>
          ${pitch.alter ? `<alter>${pitch.alter}</alter>` : ""}
          <octave>${pitch.octave}</octave>
        </pitch>
        <duration>${durationValue}</duration>
        ${dots ? `<dot>${"".padEnd(dots, ".")}</dot>` : ""}
        <type>${noteType}</type>
        <voice>1</voice>
      </note>
`;
  }

  xml += `    </measure>
  </part>
</score-partwise>`;

  return xml;
}

/**
 * Export chord progression to MusicXML.
 */
export function exportChordsToMusicXML(
  chords: MusicXMLChord[],
  options: {
    title?: string;
    timeSignature?: { numerator: number; denominator: number };
    keySignature?: number;
    bpm?: number;
  } = {}
): string {
  const notes: MusicXMLNote[] = [];

  for (const chord of chords) {
    // Add root note as a chord symbol
    notes.push({
      pitch: chord.root,
      start: chord.start,
      duration: chord.duration,
    });
  }

  return exportToMusicXML(notes, options);
}

/**
 * Download MusicXML as a file.
 */
export function downloadMusicXML(xml: string, filename: string = "export.musicxml") {
  const blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
