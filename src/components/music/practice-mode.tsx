"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CHROMATIC, noteFrequency } from "@/lib/music/notes";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Dumbbell, Play, Check, X } from "lucide-react";
import { usePersistentState } from "@/lib/persist";

// ── Practice Mode for Scales and Chords ─────────────────────────────────────

/**
 * Practice mode for scales and chords.
 * Generates random challenges and checks user responses.
 */

type PracticeMode = "scale-recognition" | "chord-recognition" | "scale-play";

interface PracticeStats {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
}

const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  "Pentatonic Major": [0, 2, 4, 7, 9],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
};

const CHORDS: Record<string, number[]> = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  "Major 7": [0, 4, 7, 11],
  "Minor 7": [0, 3, 7, 10],
  "Dominant 7": [0, 4, 7, 10],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
};

export function PracticeMode() {
  const [mode, setMode] = usePersistentState<PracticeMode>("practice_mode", "scale-recognition");
  const [stats, setStats] = useState<PracticeStats>({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [currentChallenge, setCurrentChallenge] = useState<{
    root: string;
    type: string;
    notes: string[];
  } | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playNote = useCallback((note: string, octave: number = 4) => {
    const ctx = getAudioContext();
    const frequency = noteFrequency(note, octave);
    if (!frequency) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }, [getAudioContext]);

  const generateChallenge = useCallback(() => {
    const roots = CHROMATIC;
    const root = roots[Math.floor(Math.random() * roots.length)];

    if (mode === "scale-recognition" || mode === "scale-play") {
      const scaleTypes = Object.keys(SCALES);
      const type = scaleTypes[Math.floor(Math.random() * scaleTypes.length)];
      const intervals = SCALES[type];
      const notes = intervals.map((interval) => CHROMATIC[(CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]) + interval) % 12]);
      setCurrentChallenge({ root, type, notes });
    } else {
      const chordTypes = Object.keys(CHORDS);
      const type = chordTypes[Math.floor(Math.random() * chordTypes.length)];
      const intervals = CHORDS[type];
      const notes = intervals.map((interval) => CHROMATIC[(CHROMATIC.indexOf(root as (typeof CHROMATIC)[number]) + interval) % 12]);
      setCurrentChallenge({ root, type, notes });
    }

    setUserAnswer("");
    setFeedback(null);
    setShowNotes(false);
  }, [mode]);

  const playChallenge = useCallback(() => {
    if (!currentChallenge) return;
    currentChallenge.notes.forEach((note, i) => {
      setTimeout(() => playNote(note), i * 300);
    });
  }, [currentChallenge, playNote]);

  const checkAnswer = useCallback(() => {
    if (!currentChallenge) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentChallenge.type.toLowerCase();
    setFeedback(isCorrect ? "correct" : "incorrect");

    setStats((prev) => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
    });
  }, [currentChallenge, userAnswer]);

  useEffect(() => {
    generateChallenge();
  }, [mode, generateChallenge]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (userAnswer) {
          checkAnswer();
        } else {
          playChallenge();
        }
      }
    },
    [userAnswer, checkAnswer, playChallenge]
  );

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Practice Mode"
      subtitle="Train your ear and theory knowledge"
      eyebrow="Practice"
      icon={<Dumbbell className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Mode selector */}
        <div className="flex gap-2">
          {([
            { id: "scale-recognition" as PracticeMode, label: "Scale Recognition" },
            { id: "chord-recognition" as PracticeMode, label: "Chord Recognition" },
            { id: "scale-play" as PracticeMode, label: "Scale Play" },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
              }}
              className={`btn-gradient-border rounded-lg px-3 py-1.5 text-xs ${
                mode === m.id ? "bg-[var(--color-copper)] text-white" : ""
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <GlassSurface className="p-3 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{accuracy}%</div>
            <div className="text-[10px] text-[var(--color-sand-2)]">Accuracy</div>
          </div>
          <div>
            <div className="text-lg font-bold">{stats.correct}/{stats.total}</div>
            <div className="text-[10px] text-[var(--color-sand-2)]">Correct</div>
          </div>
          <div>
            <div className="text-lg font-bold">{stats.streak}</div>
            <div className="text-[10px] text-[var(--color-sand-2)]">Streak</div>
          </div>
          <div>
            <div className="text-lg font-bold">{stats.bestStreak}</div>
            <div className="text-[10px] text-[var(--color-sand-2)]">Best</div>
          </div>
        </GlassSurface>

        {/* Challenge */}
        {currentChallenge && (
          <GlassSurface className="p-4 space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {currentChallenge.root} {currentChallenge.type}
              </div>
              <p className="text-xs text-[var(--color-sand-2)]">
                {mode === "scale-recognition"
                  ? "Listen and identify the scale type"
                  : mode === "chord-recognition"
                    ? "Listen and identify the chord type"
                    : "Play this scale on the piano"}
              </p>
            </div>

            {/* Play button */}
            <div className="flex justify-center">
              <button
                onClick={playChallenge}
                className="btn-gradient-border rounded-full p-3 hover:-translate-y-0.5 transition"
              >
                <Play className="h-5 w-5" />
              </button>
            </div>

            {/* Show notes toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-xs text-[var(--color-sand-2)] hover:text-[var(--color-foreground)]"
              >
                {showNotes ? "Hide notes" : "Show notes"}
              </button>
            </div>

            {showNotes && (
              <div className="flex justify-center gap-1">
                {currentChallenge.notes.map((note) => (
                  <span
                    key={note}
                    className="inline-block bg-[var(--color-sand-4)] rounded px-2 py-1 text-xs font-mono"
                  >
                    {note}
                  </span>
                ))}
              </div>
            )}

            {/* Answer input */}
            <div className="space-y-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type the scale/chord type..."
                className="w-full bg-[var(--color-sand-4)] border border-[var(--color-sand-3)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-copper)]"
              />

              <div className="flex gap-2">
                <button
                  onClick={checkAnswer}
                  disabled={!userAnswer}
                  className="flex-1 btn-gradient-border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  Check Answer
                </button>
                <button
                  onClick={generateChallenge}
                  className="btn-gradient-border rounded-lg px-3 py-2 text-sm"
                >
                  Skip
                </button>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
                  feedback === "correct"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {feedback === "correct" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
                <span className="text-sm font-semibold">
                  {feedback === "correct" ? "Correct!" : `Incorrect — it was ${currentChallenge.type}`}
                </span>
              </div>
            )}
          </GlassSurface>
        )}

        {/* Help text */}
        <div className="text-[10px] text-[var(--color-sand-2)] space-y-1">
          <p>• Press Enter to play the sound or check your answer</p>
          <p>• Type the scale or chord name (e.g., "Major", "Minor", "Dorian")</p>
          <p>• Build your streak for a better score!</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
