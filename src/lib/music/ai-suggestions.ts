// ── AI Chord Progression Suggestions ─────────────────────────────────────────

/**
 * Use Ollama to suggest chord progressions based on genre, mood, or existing
 * progression. Integrates with the progression builder.
 */

import { ProgressionChord } from "./progression-presets";

export interface AISuggestion {
  progressions: {
    name: string;
    chords: ProgressionChord[];
    description: string;
  }[];
  explanation: string;
}

/**
 * Generate chord progression suggestions using Ollama.
 */
export async function suggestProgressions(
  params: {
    genre?: string;
    mood?: string;
    key?: string;
    existingChords?: ProgressionChord[];
    style?: string;
  },
  ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
): Promise<AISuggestion> {
  const { genre, mood, key, existingChords, style } = params;

  const prompt = `Suggest 3 chord progressions based on these parameters:
${genre ? `Genre: ${genre}` : ""}
${mood ? `Mood: ${mood}` : ""}
${key ? `Key: ${key}` : ""}
${style ? `Style: ${style}` : ""}
${existingChords ? `Starting from: ${existingChords.map(c => `${c.root}${c.quality}`).join(", ")}` : ""}

Return a JSON object with this structure:
{
  "progressions": [
    {
      "name": "Progression name",
      "chords": [{"root": "C", "quality": "Major"}, ...],
      "description": "Brief description"
    }
  ],
  "explanation": "Why these progressions work"
}

Keep progressions to 4-8 chords. Use common chord qualities: Major, Minor, 7, Maj7, min7, dim, aug, sus4, Power.`;

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.response);
    return content;
  } catch {
    // Return fallback suggestions
    return getFallbackSuggestions(params);
  }
}

/**
 * Get fallback suggestions when Ollama is unavailable.
 */
function getFallbackSuggestions(params: {
  genre?: string;
  mood?: string;
  key?: string;
}): AISuggestion {
  const key = params.key || "C";
  const relativeMinor = getRelativeMinor(key);

  const suggestions = [
    {
      name: "Pop progression",
      chords: [
        { root: key, quality: "Major" },
        { root: getNoteByKey(key, 7), quality: "Major" },
        { root: relativeMinor, quality: "Minor" },
        { root: getNoteByKey(key, 5), quality: "Major" },
      ],
      description: "Classic I-V-vi-IV pop progression",
    },
    {
      name: "Jazz turnaround",
      chords: [
        { root: getNoteByKey(key, 2), quality: "Minor 7" },
        { root: getNoteByKey(key, 7), quality: "Dominant 7" },
        { root: key, quality: "Major 7" },
        { root: relativeMinor, quality: "Minor 7" },
      ],
      description: "ii-V-I jazz turnaround",
    },
    {
      name: "Emotional ballad",
      chords: [
        { root: relativeMinor, quality: "Minor" },
        { root: getNoteByKey(key, 5), quality: "Major" },
        { root: key, quality: "Major" },
        { root: getNoteByKey(key, 7), quality: "Major" },
      ],
      description: "vi-IV-I-V emotional progression",
    },
  ];

  return {
    progressions: suggestions,
    explanation: "These are common progressions that work well in most genres. Connect Ollama for AI-powered suggestions.",
  };
}

/**
 * Get the relative minor of a major key.
 */
function getRelativeMinor(key: string): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const index = notes.indexOf(key as (typeof notes)[number]);
  if (index === -1) return "A";
  return notes[(index + 9) % 12];
}

/**
 * Get a note by interval from a key.
 */
function getNoteByKey(key: string, interval: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const index = notes.indexOf(key as (typeof notes)[number]);
  if (index === -1) return key;
  return notes[(index + interval) % 12];
}

/**
 * AI Lyrics Rhyme Dictionary
 * Add rhyme suggestions for the lyrics editor using Ollama.
 */
export interface RhymeSuggestion {
  perfect: string[];
  near: string[];
  multiSyllable: string[];
}

export async function suggestRhymes(
  word: string,
  ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
): Promise<RhymeSuggestion> {
  const prompt = `Suggest rhyming words for "${word}". Return JSON:
{
  "perfect": ["exact rhymes"],
  "near": ["near rhymes"],
  "multiSyllable": ["multi-syllable rhymes"]
}

Return 5 words per category. Only return valid English words.`;

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama error");
    const data = await response.json();
    return JSON.parse(data.response);
  } catch {
    return {
      perfect: [],
      near: [],
      multiSyllable: [],
    };
  }
}

/**
 * AI Style Transfer
 * Use Ollama to suggest how a progression would sound in a different genre.
 */
export async function transferStyle(
  chords: ProgressionChord[],
  targetStyle: string,
  ollamaBaseUrl: string = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
): Promise<{ chords: ProgressionChord[]; explanation: string }> {
  const prompt = `Convert this chord progression to ${targetStyle} style:
${chords.map(c => `${c.root}${c.quality}`).join(" - ")}

Return JSON: {"chords": [...], "explanation": "..."}`;

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama error");
    const data = await response.json();
    return JSON.parse(data.response);
  } catch {
    return { chords, explanation: "Could not connect to Ollama for style transfer." };
  }
}
