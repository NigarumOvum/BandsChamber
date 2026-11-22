// ── Rhythm & Time Signature Analysis ────────────────────────────────────────

/**
 * Analyze a sequence of note-on/note-off events to detect the underlying
 * time signature, beat subdivision, and swing/shuffle feel.
 * Could power auto-detection for imported MIDI files.
 */

export interface RhythmEvent {
  time: number; // seconds or ticks
  duration: number;
  velocity?: number;
}

export interface RhythmAnalysis {
  timeSignature: { numerator: number; denominator: number };
  bpm: number;
  beatDuration: number;
  subdivision: SubdivisionType;
  swingRatio: number; // 1.0 = straight, 1.5 = heavy swing
  confidence: number;
  beatsPerMeasure: number;
}

export type SubdivisionType = "quarter" | "eighth" | "sixteenth" | "triplet";

/**
 * Common time signatures to test against.
 */
const TIME_SIGNATURES = [
  { numerator: 4, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 2, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
  { numerator: 5, denominator: 4 },
  { numerator: 9, denominator: 8 },
  { numerator: 12, denominator: 8 },
];

/**
 * Calculate intervals between note events.
 */
function getIntervals(events: RhythmEvent[]): number[] {
  if (events.length < 2) return [];

  const sorted = [...events].sort((a, b) => a.time - b.time);
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const interval = sorted[i].time - sorted[i - 1].time;
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  return intervals;
}

/**
 * Find the greatest common divisor using Euclidean algorithm.
 */
function gcd(a: number, b: number, tolerance = 0.05): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b < tolerance) return a;
  return gcd(b, a - Math.round(a / b) * b, tolerance);
}

/**
 * Estimate the beat duration from intervals.
 */
function estimateBeatDuration(intervals: number[]): number {
  if (intervals.length === 0) return 0.5;

  // Find the median interval
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Find the most common interval (mode)
  const intervalCounts: Record<string, number> = {};
  for (const interval of intervals) {
    // Quantize to nearest 0.05
    const quantized = Math.round(interval / 0.05) * 0.05;
    const key = quantized.toFixed(2);
    intervalCounts[key] = (intervalCounts[key] || 0) + 1;
  }

  let maxCount = 0;
  let mostCommonInterval = median;
  for (const [key, count] of Object.entries(intervalCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonInterval = parseFloat(key);
    }
  }

  return mostCommonInterval;
}

/**
 * Detect the time signature by analyzing beat patterns.
 */
function detectTimeSignature(events: RhythmEvent[], beatDuration: number): { numerator: number; denominator: number } {
  if (events.length < 2 || beatDuration === 0) {
    return { numerator: 4, denominator: 4 };
  }

  const sorted = [...events].sort((a, b) => a.time - b.time);
  const totalDuration = sorted[sorted.length - 1].time - sorted[0].time;
  const totalBeats = totalDuration / beatDuration;

  // Try to find the best fitting time signature
  let bestMatch = { numerator: 4, denominator: 4 };
  let bestScore = 0;

  for (const ts of TIME_SIGNATURES) {
    const beatsInMeasure = ts.numerator / (ts.denominator === 8 ? 0.5 : 1);
    const measures = totalBeats / beatsInMeasure;

    // Score based on how well the events align with measure boundaries
    let alignmentScore = 0;
    const measureDuration = beatsInMeasure * beatDuration;

    for (const event of sorted) {
      const eventInMeasure = (event.time - sorted[0].time) % measureDuration;
      const beatInMeasure = eventInMeasure / beatDuration;

      // Check if event is close to a beat boundary
      const distanceToBeat = Math.min(
        beatInMeasure % 1,
        1 - (beatInMeasure % 1)
      );

      if (distanceToBeat < 0.15) {
        alignmentScore++;
      }
    }

    const score = alignmentScore / sorted.length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ts;
    }
  }

  return bestMatch;
}

/**
 * Detect swing/shuffle feel by analyzing odd vs. even subdivision ratios.
 */
function detectSwing(intervals: number[]): { swingRatio: number; subdivision: SubdivisionType } {
  if (intervals.length < 4) {
    return { swingRatio: 1.0, subdivision: "quarter" };
  }

  // Group intervals into pairs (short-long pattern in swing)
  const shortIntervals: number[] = [];
  const longIntervals: number[] = [];

  for (let i = 0; i < intervals.length - 1; i += 2) {
    if (intervals[i] < intervals[i + 1]) {
      shortIntervals.push(intervals[i]);
      longIntervals.push(intervals[i + 1]);
    }
  }

  let swingRatio = 1.0;
  if (shortIntervals.length > 0 && longIntervals.length > 0) {
    const avgShort = shortIntervals.reduce((a, b) => a + b, 0) / shortIntervals.length;
    const avgLong = longIntervals.reduce((a, b) => a + b, 0) / longIntervals.length;
    swingRatio = avgLong / (avgShort || 0.001);
    swingRatio = Math.min(2.0, Math.max(1.0, swingRatio));
  }

  // Determine subdivision type
  let subdivision: SubdivisionType = "quarter";
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  if (avgInterval < 0.1) {
    subdivision = "sixteenth";
  } else if (avgInterval < 0.2) {
    subdivision = "eighth";
  } else if (swingRatio > 1.2 && swingRatio < 1.8) {
    subdivision = "triplet";
  }

  return { swingRatio, subdivision };
}

/**
 * Analyze rhythm events to detect time signature, BPM, and swing feel.
 *
 * @param events Array of note events with timing information
 * @returns Analysis of the rhythm structure
 */
export function analyzeRhythm(events: RhythmEvent[]): RhythmAnalysis {
  const intervals = getIntervals(events);
  const beatDuration = estimateBeatDuration(intervals);
  const bpm = beatDuration > 0 ? Math.round(60 / beatDuration) : 120;
  const timeSignature = detectTimeSignature(events, beatDuration);
  const { swingRatio, subdivision } = detectSwing(intervals);

  // Calculate confidence based on event count and alignment
  const confidence = Math.min(1, events.length / 10);

  return {
    timeSignature,
    bpm,
    beatDuration,
    subdivision,
    swingRatio,
    confidence,
    beatsPerMeasure: timeSignature.numerator / (timeSignature.denominator === 8 ? 0.5 : 1),
  };
}

/**
 * Format a time signature as a string.
 */
export function formatTimeSignature(ts: { numerator: number; denominator: number }): string {
  return `${ts.numerator}/${ts.denominator}`;
}

/**
 * Get a human-readable description of the rhythm analysis.
 */
export function formatRhythmAnalysis(analysis: RhythmAnalysis): string {
  const swingDesc = analysis.swingRatio > 1.2
    ? ` (${analysis.subdivision}, swing ${Math.round(analysis.swingRatio * 100)}%)`
    : " (straight)";

  return `${formatTimeSignature(analysis.timeSignature)} at ${analysis.bpm} BPM${swingDesc}`;
}
