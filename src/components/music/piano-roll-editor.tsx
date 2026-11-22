"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CHROMATIC } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Music, Play, Square, Plus, Trash2 } from "lucide-react";

// ── Piano Roll Editor ────────────────────────────────────────────────────────

/**
 * A visual piano roll for creating and editing MIDI note sequences.
 * Drag-and-drop note placement, grid snapping, quantization, and playback.
 */

export interface PianoRollNote {
  id: string;
  note: number; // MIDI note number
  start: number; // start time in beats
  duration: number; // duration in beats
  velocity: number; // 0-127
}

const NOTE_HEIGHT = 20;
const BEAT_WIDTH = 60;
const START_OCTAVE = 2;
const END_OCTAVE = 7;
const TOTAL_BEATS = 16;

export function PianoRollEditor({
  onNotesChange,
  bpm = 120,
}: {
  onNotesChange?: (notes: PianoRollNote[]) => void;
  bpm?: number;
}) {
  const [notes, setNotes] = useState<PianoRollNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNote, setDragNote] = useState<PianoRollNote | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef<number | null>(null);

  const totalNotes = (END_OCTAVE - START_OCTAVE + 1) * 12;
  const canvasHeight = totalNotes * NOTE_HEIGHT;
  const canvasWidth = TOTAL_BEATS * BEAT_WIDTH;

  // Draw the piano roll
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = "var(--color-sand-5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw beat grid
    for (let beat = 0; beat <= TOTAL_BEATS; beat++) {
      const x = beat * BEAT_WIDTH;
      ctx.strokeStyle = beat % 4 === 0 ? "var(--color-sand-2)" : "var(--color-sand-3)";
      ctx.lineWidth = beat % 4 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Draw note rows (piano keys)
    for (let i = 0; i < totalNotes; i++) {
      const y = i * NOTE_HEIGHT;
      const midiNote = (END_OCTAVE - START_OCTAVE + 1) * 12 - i;
      const noteIndex = midiNote % 12;

      // Black keys
      const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
      ctx.fillStyle = isBlack ? "var(--color-sand-4)" : "var(--color-sand-5)";
      ctx.fillRect(0, y, canvasWidth, NOTE_HEIGHT);

      // Note name
      if (midiNote % 12 === 0) {
        ctx.fillStyle = "var(--color-foreground)";
        ctx.font = "10px sans-serif";
        ctx.fillText(`${CHROMATIC[noteIndex]}${Math.floor(midiNote / 12)}`, 5, y + 14);
      }
    }

    // Draw notes
    for (const note of notes) {
      const y = ((END_OCTAVE - START_OCTAVE + 1) * 12 - note.note) * NOTE_HEIGHT;
      const x = note.start * BEAT_WIDTH;
      const width = note.duration * BEAT_WIDTH;

      // Note background
      ctx.fillStyle = `rgba(var(--color-copper-rgb, 200, 140, 80), ${0.5 + note.velocity / 254})`;
      ctx.fillRect(x + 1, y + 1, width - 2, NOTE_HEIGHT - 2);

      // Note border
      ctx.strokeStyle = "var(--color-copper)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, width - 2, NOTE_HEIGHT - 2);
    }

    // Draw playhead
    if (isPlaying) {
      const x = currentBeat * BEAT_WIDTH;
      ctx.strokeStyle = "var(--color-copper)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
  }, [notes, isPlaying, currentBeat]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Handle canvas click to add note
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beat = Math.floor(x / BEAT_WIDTH);
    const noteIndex = Math.floor(y / NOTE_HEIGHT);
    const midiNote = (END_OCTAVE - START_OCTAVE + 1) * 12 - noteIndex;

    const newNote: PianoRollNote = {
      id: Date.now().toString(),
      note: midiNote,
      start: beat,
      duration: 1,
      velocity: 100,
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    onNotesChange?.(updatedNotes);
  };

  // Handle note selection and dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked note
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      const noteY = ((END_OCTAVE - START_OCTAVE + 1) * 12 - note.note) * NOTE_HEIGHT;
      const noteX = note.start * BEAT_WIDTH;
      const noteWidth = note.duration * BEAT_WIDTH;

      if (
        x >= noteX &&
        x <= noteX + noteWidth &&
        y >= noteY &&
        y <= noteY + NOTE_HEIGHT
      ) {
        setIsDragging(true);
        setDragNote(note);
        setDragStart({ x, y });
        return;
      }
    }

    // No note clicked, add new note
    handleCanvasClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragNote || !dragStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    const newStart = Math.max(0, Math.floor((dragNote.start * BEAT_WIDTH + dx) / BEAT_WIDTH));
    const newNoteIndex = Math.max(
      0,
      Math.min(
        totalNotes - 1,
        Math.floor((dragStart.y - dy) / NOTE_HEIGHT)
      )
    );
    const newMidiNote = (END_OCTAVE - START_OCTAVE + 1) * 12 - newNoteIndex;

    const updatedNote = { ...dragNote, start: newStart, note: newMidiNote };
    setDragNote(updatedNote);

    const updatedNotes = notes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
    setNotes(updatedNotes);
  };

  const handleMouseUp = () => {
    if (dragNote) {
      onNotesChange?.(notes);
    }
    setIsDragging(false);
    setDragNote(null);
    setDragStart(null);
  };

  // Playback
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    } else {
      setIsPlaying(true);
      setCurrentBeat(0);
      const beatDuration = 60 / bpm / 4; // 16th note
      playbackRef.current = window.setInterval(() => {
        setCurrentBeat((prev) => {
          if (prev >= TOTAL_BEATS) {
            setIsPlaying(false);
            if (playbackRef.current) clearInterval(playbackRef.current);
            return 0;
          }
          return prev + 0.25;
        });
      }, beatDuration * 1000);
    }
  };

  // Delete selected note
  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    onNotesChange?.(updatedNotes);
  };

  // Clear all notes
  const clearAll = () => {
    setNotes([]);
    onNotesChange?.([]);
  };

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Piano Roll Editor"
      subtitle="Create and edit MIDI note sequences"
      eyebrow="DAW"
      icon={<Music className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-copper)] text-white hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? "Stop" : "Play"}
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-sand-3)] hover:bg-[var(--color-sand-2)] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          <span className="text-sm text-[var(--color-foreground-muted)]">
            {notes.length} notes • {bpm} BPM
          </span>
        </div>

        {/* Piano Roll Canvas */}
        <GlassSurface className="rounded-lg overflow-hidden">
          <div className="overflow-auto max-h-96">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </GlassSurface>

        {/* Instructions */}
        <div className="text-sm text-[var(--color-foreground-muted)] space-y-1">
          <p>• Click to add notes • Drag to move notes • Click Play to preview</p>
          <p>• Grid snaps to 16th notes • Scroll to see all octaves</p>
        </div>

        {/* Note List */}
        {notes.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Notes</h4>
            <div className="max-h-32 overflow-auto space-y-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between text-xs p-1 rounded bg-[var(--color-sand-4)]"
                >
                  <span>
                    {CHROMATIC[note.note % 12]}{Math.floor(note.note / 12) - 1}{" "}
                    @ beat {note.start} ({note.duration} beats)
                  </span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
