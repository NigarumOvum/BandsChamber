// ── Shareable Progression Links ──────────────────────────────────────────────

/**
 * Generate shareable URLs that encode a progression's key, chords, and BPM.
 * When opened, the progression loads directly without requiring login (read-only).
 */

import { ProgressionChord } from "./progression-presets";

export interface ShareableProgression {
  key: string;
  chords: ProgressionChord[];
  bpm: number;
  beatsPerChord: number;
  presetId?: string;
}

/**
 * Encode a progression to a URL-safe string using base64.
 */
export function encodeProgression(progression: ShareableProgression): string {
  const data = JSON.stringify({
    k: progression.key,
    c: progression.chords.map((c) => `${c.root}:${c.quality}`),
    b: progression.bpm,
    bc: progression.beatsPerChord,
    p: progression.presetId,
  });

  // Use base64url encoding (URL-safe)
  return btoa(unescape(encodeURIComponent(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode a progression from a URL-safe string.
 */
export function decodeProgression(encoded: string): ShareableProgression | null {
  try {
    // Restore base64 padding
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    const data = JSON.parse(decodeURIComponent(escape(atob(base64))));

    return {
      key: data.k,
      chords: (data.c as string[]).map((s: string) => {
        const [root, quality] = s.split(":");
        return { root, quality };
      }),
      bpm: data.b,
      beatsPerChord: data.bc,
      presetId: data.p,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a shareable URL for a progression.
 */
export function generateShareableUrl(
  progression: ShareableProgression,
  baseUrl: string = "/"
): string {
  const encoded = encodeProgression(progression);
  return `${baseUrl}?progression=${encoded}`;
}

/**
 * Extract a progression from a URL search param.
 */
export function getProgressionFromUrl(search: string): ShareableProgression | null {
  const params = new URLSearchParams(search);
  const encoded = params.get("progression");
  if (!encoded) return null;
  return decodeProgression(encoded);
}

/**
 * Copy a shareable link to clipboard.
 */
export async function copyShareableLink(progression: ShareableProgression): Promise<boolean> {
  try {
    const url = generateShareableUrl(progression, window.location.origin);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
