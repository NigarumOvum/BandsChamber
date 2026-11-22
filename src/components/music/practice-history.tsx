"use client";

import { useState, useEffect } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { History } from "lucide-react";
import { usePersistentState } from "@/lib/persist";

// ── Practice Session Tracking ────────────────────────────────────────────────

/**
 * Track practice sessions: date, duration, scales/chords practiced,
 * accuracy stats. Show progress over time with charts.
 */

export interface PracticeSession {
  id: string;
  date: string; // ISO date
  duration: number; // minutes
  type: "scale" | "chord" | "progression" | "ear_training";
  details: string; // e.g., "C Major", "Am7"
  accuracy?: number; // 0-100
  score?: number;
}

export function PracticeHistory() {
  const [sessions, setSessions] = usePersistentState<PracticeSession[]>("practice_sessions", []);
  const [todaySessions, setTodaySessions] = useState<PracticeSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{ totalMinutes: number; sessionCount: number }>({
    totalMinutes: 0,
    sessionCount: 0,
  });

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const todaySess = sessions.filter((s) => s.date.startsWith(today));
    setTodaySessions(todaySess);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const weeklySessions = sessions.filter((s) => s.date >= oneWeekAgo);
    setWeeklyStats({
      totalMinutes: weeklySessions.reduce((sum, s) => sum + s.duration, 0),
      sessionCount: weeklySessions.length,
    });
  }, [sessions, today]);

  const addSession = (session: Omit<PracticeSession, "id">) => {
    const newSession: PracticeSession = {
      ...session,
      id: Date.now().toString(),
    };
    setSessions([...sessions, newSession]);
  };

  return (
    <CollapsibleCard
      defaultOpen={true}
      title="Practice History"
      subtitle="Track your practice sessions"
      eyebrow="Progress"
      icon={<History className="h-5 w-5 text-[var(--color-copper)]" />}
    >
      <div className="space-y-4">
        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-4">
          <GlassSurface className="rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{weeklyStats.totalMinutes}</div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Minutes this week</div>
          </GlassSurface>
          <GlassSurface className="rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{weeklyStats.sessionCount}</div>
            <div className="text-xs text-[var(--color-foreground-muted)]">Sessions this week</div>
          </GlassSurface>
        </div>

        {/* Today&apos;s Sessions */}
        {todaySessions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Today&apos;s Sessions</h4>
            <div className="space-y-1">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-[var(--color-sand-4)]"
                >
                  <span>
                    <strong>{session.details}</strong> ({session.type})
                  </span>
                  <span className="text-[var(--color-foreground-muted)]">
                    {session.duration}min
                    {session.accuracy !== undefined && ` • ${session.accuracy}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Sessions</h4>
            <div className="max-h-40 overflow-auto space-y-1">
              {[...sessions].reverse().slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-[var(--color-sand-4)]"
                >
                  <span>
                    {session.date.slice(5)} • <strong>{session.details}</strong>
                  </span>
                  <span className="text-[var(--color-foreground-muted)]">
                    {session.duration}min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Add */}
        <div className="text-xs text-[var(--color-foreground-muted)]">
          <p>Sessions are automatically tracked when you use Practice Mode or other tools.</p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

/**
 * Hook to track practice sessions.
 */
export function usePracticeTracking() {
  const [sessions, setSessions] = usePersistentState<PracticeSession[]>("practice_sessions", []);

  const logSession = (session: Omit<PracticeSession, "id">) => {
    const newSession: PracticeSession = {
      ...session,
      id: Date.now().toString(),
    };
    setSessions([...sessions, newSession]);
  };

  const getWeeklyStats = () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const weeklySessions = sessions.filter((s) => s.date >= oneWeekAgo);
    return {
      totalMinutes: weeklySessions.reduce((sum, s) => sum + s.duration, 0),
      sessionCount: weeklySessions.length,
      avgAccuracy:
        weeklySessions.filter((s) => s.accuracy !== undefined).length > 0
          ? Math.round(
              weeklySessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
                weeklySessions.filter((s) => s.accuracy !== undefined).length
            )
          : 0,
    };
  };

  return { logSession, getWeeklyStats, sessions };
}
