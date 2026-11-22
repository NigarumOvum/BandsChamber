"use client";

import { useState, useEffect } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { BarChart3 } from "lucide-react";
import { usePersistentState } from "@/lib/persist";

// ── Song Statistics Dashboard ────────────────────────────────────────────────

/**
 * Show statistics across the user's song library:
 * - Most used keys, scales, chord types
 * - Genre distribution
 * - Song count over time
 * - Most active bands/projects
 */

export interface SongStats {
  totalSongs: number;
  keys: Record<string, number>;
  genres: Record<string, number>;
  scales: Record<string, number>;
  chords: Record<string, number>;
  bands: Record<string, number>;
  songsByMonth: Record<string, number>;
  avgBpm: number;
  totalSections: number;
  totalLayers: number;
}

export function SongStatisticsDashboard({
  songs,
}: {
  songs: Array<{
    id: string;
    title: string;
    genre?: string | null;
    musical_key?: string | null;
    bpm?: number | null;
    project_slug?: string | null;
    synced_at: string;
    section_count?: number;
    layer_count?: number;
  }>;
}) {
  const [stats, setStats] = useState<SongStats | null>(null);

  useEffect(() => {
    const keys: Record<string, number> = {};
    const genres: Record<string, number> = {};
    const bands: Record<string, number> = {};
    const songsByMonth: Record<string, number> = {};
    let totalBpm = 0;
    let bpmCount = 0;
    let totalSections = 0;
    let totalLayers = 0;

    for (const song of songs) {
      if (song.musical_key) {
        keys[song.musical_key] = (keys[song.musical_key] || 0) + 1;
      }
      if (song.genre) {
        genres[song.genre] = (genres[song.genre] || 0) + 1;
      }
      if (song.project_slug) {
        bands[song.project_slug] = (bands[song.project_slug] || 0) + 1;
      }
      if (song.bpm) {
        totalBpm += song.bpm;
        bpmCount++;
      }
      if (song.section_count) totalSections += song.section_count;
      if (song.layer_count) totalLayers += song.layer_count;

      const month = song.synced_at.slice(0, 7);
      songsByMonth[month] = (songsByMonth[month] || 0) + 1;
    }

    setStats({
      totalSongs: songs.length,
      keys,
      genres,
      scales: {},
      chords: {},
      bands,
      songsByMonth,
      avgBpm: bpmCount > 0 ? Math.round(totalBpm / bpmCount) : 0,
      totalSections,
      totalLayers,
    });
  }, [songs]);

  if (!stats) return null;

  const topKeys = Object.entries(stats.keys).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topGenres = Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topBands = Object.entries(stats.bands).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Song Statistics"
      subtitle="Library overview and insights"
      eyebrow="Analytics"
      icon={<BarChart3 className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Songs" value={stats.totalSongs} />
          <StatCard label="Avg BPM" value={stats.avgBpm} />
          <StatCard label="Sections" value={stats.totalSections} />
          <StatCard label="Layers" value={stats.totalLayers} />
        </div>

        {/* Top Keys */}
        {topKeys.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Most Used Keys</h4>
            <div className="space-y-1">
              {topKeys.map(([key, count]) => (
                <StatBar key={key} label={key} value={count} max={topKeys[0][1]} />
              ))}
            </div>
          </div>
        )}

        {/* Top Genres */}
        {topGenres.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Genre Distribution</h4>
            <div className="space-y-1">
              {topGenres.map(([genre, count]) => (
                <StatBar key={genre} label={genre} value={count} max={topGenres[0][1]} />
              ))}
            </div>
          </div>
        )}

        {/* Top Bands */}
        {topBands.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Most Active Bands</h4>
            <div className="space-y-1">
              {topBands.map(([band, count]) => (
                <StatBar key={band} label={band} value={count} max={topBands[0][1]} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <GlassSurface className="rounded-lg p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
    </GlassSurface>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-[var(--color-sand-4)] rounded overflow-hidden">
        <div
          className="h-full bg-[var(--color-copper)] rounded transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-[var(--color-foreground-muted)] w-6 text-right">{value}</span>
    </div>
  );
}
