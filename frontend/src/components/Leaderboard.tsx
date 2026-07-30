import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2 } from "lucide-react";
import { LeaderboardEntry } from "../types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  limit?: number;
  showEmail?: boolean;
}

function formatScore(entry: LeaderboardEntry): string {
  return entry.best_score !== null ? String(entry.best_score) : "-";
}

export default function Leaderboard({ entries, limit, showEmail }: LeaderboardProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rows = limit ? entries.slice(0, limit) : entries;

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // fullscreen not available/allowed - ignore
    }
  }

  const hasScores = rows.some((entry) => entry.best_score !== null);
  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const others = hasScores ? rows.slice(3) : rows;
  const othersStartIndex = hasScores ? 4 : 1;

  function podiumCard(entry: LeaderboardEntry | undefined, rank: 1 | 2 | 3) {
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
    const height = rank === 1 ? "h-40 sm:h-44" : "h-32 sm:h-36";
    const emphasis =
      rank === 1
        ? "border-accent bg-accent/10"
        : "border-border-light dark:border-border-dark";

    if (!entry) {
      return (
        <div
          className={`rounded-lg border border-dashed border-border-light dark:border-border-dark ${height}`}
          aria-hidden="true"
        />
      );
    }

    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-3 text-center ${emphasis} ${height}`}
      >
        <span className="text-2xl leading-none" aria-label={`${t("landing.rank")} ${rank}`}>
          {medal}
        </span>
        <span className="max-w-full truncate text-sm font-semibold">{entry.name}</span>
        {showEmail && entry.email && (
          <span className="max-w-full truncate text-xs text-subtle">{entry.email}</span>
        )}
        <span className="text-sm font-bold tabular-nums text-accent">{formatScore(entry)}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-border-light bg-bg p-6 dark:border-border-dark dark:bg-surface-dark [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:rounded-none"
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
        className="absolute right-4 top-4 inline-flex items-center justify-center rounded-lg border border-border-light bg-bg p-2 dark:border-border-dark dark:bg-surface"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {hasScores && (
        <div className="grid grid-cols-3 items-end gap-3">
          {podiumCard(second, 2)}
          {podiumCard(first, 1)}
          {podiumCard(third, 3)}
        </div>
      )}

      {rows.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted">{t("landing.leaderboard_empty")}</p>
      )}

      {others.length > 0 && (
        <div className={`${hasScores ? "mt-6" : ""} overflow-hidden rounded-lg border border-border-light dark:border-border-dark`}>
          {others.map((entry, i) => (
            <div
              key={`${entry.name}-${i}`}
              className="flex items-center gap-4 border-b border-border-light px-4 py-3 last:border-0 dark:border-border-dark"
            >
              {hasScores && (
                <span className="w-10 shrink-0 font-mono text-sm text-muted">#{i + othersStartIndex}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {entry.name}
                {showEmail && entry.email && (
                  <span className="block truncate text-xs text-subtle">{entry.email}</span>
                )}
              </span>
              <span className="shrink-0 rounded-full bg-surface-light px-3 py-1 text-sm font-semibold tabular-nums dark:bg-surface-dark">
                {formatScore(entry)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}