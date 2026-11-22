// ── ARIA Roles for Music Components ──────────────────────────────────────────

/**
 * ARIA roles and labels for music components:
 * - Piano keyboard: role="group" with labeled keys
 * - Fretboard: role="grid" with cell labels
 * - DAW timeline: role="log" with playhead position
 * - Drum sequencer: role="grid" with step labels
 */

export function getPianoKeyProps(
  note: string,
  octave: number,
  isBlack: boolean,
  isActive: boolean
): React.HTMLAttributes<HTMLButtonElement> {
  return {
    role: "button",
    "aria-label": `${note}${octave}${isBlack ? " (black key)" : " (white key)"}`,
    "aria-pressed": isActive,
    tabIndex: 0,
  };
}

export function getPianoKeyboardProps(): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "group",
    "aria-label": "Piano keyboard",
  };
}

export function getFretboardProps(
  instrument: string,
  tuning: string
): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "grid",
    "aria-label": `${instrument} fretboard (${tuning} tuning)`,
  };
}

export function getFretCellProps(
  string: number,
  fret: number,
  note: string,
  isActive: boolean
): React.HTMLAttributes<HTMLButtonElement> {
  return {
    role: "gridcell",
    "aria-label": `String ${string + 1}, fret ${fret}: ${note}`,
    "aria-pressed": isActive,
    tabIndex: isActive ? 0 : -1,
  };
}

export function getTimelineProps(
  currentBeat: number,
  totalBeats: number,
  bpm: number
): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "log",
    "aria-label": `DAW timeline: beat ${Math.floor(currentBeat)} of ${totalBeats} at ${bpm} BPM`,
    "aria-live": "polite",
    "aria-atomic": "false",
  };
}

export function getDrumGridProps(): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "grid",
    "aria-label": "Drum pattern sequencer",
  };
}

export function getDrumStepProps(
  step: number,
  drum: string,
  isActive: boolean
): React.HTMLAttributes<HTMLButtonElement> {
  return {
    role: "gridcell",
    "aria-label": `${drum} step ${step + 1}${isActive ? " (active)" : ""}`,
    "aria-pressed": isActive,
    tabIndex: 0,
  };
}

export function getProgressionListProps(
  chordCount: number
): React.HTMLAttributes<HTMLUListElement> {
  return {
    role: "list",
    "aria-label": `Chord progression (${chordCount} chords)`,
  };
}

export function getChordButtonProps(
  chord: string,
  index: number,
  isActive: boolean
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    role: "button",
    "aria-label": `Chord ${index + 1}: ${chord}`,
    "aria-pressed": isActive,
    tabIndex: 0,
  };
}
