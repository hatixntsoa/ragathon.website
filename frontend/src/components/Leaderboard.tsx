import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { LeaderboardEntry } from "../types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  limit?: number;
  showEmail?: boolean;
}

export default function Leaderboard({ entries, limit, showEmail }: LeaderboardProps) {
  const { t } = useTranslation();
  const rows = limit ? entries.slice(0, limit) : entries;

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-light py-6 text-center text-sm text-muted">
        {t("landing.leaderboard_empty")}
      </p>
    );
  }

  return (
    <table className="w-full text-left border-collapse" role="table">
      <thead>
        <tr className="border-b border-border-light dark:border-border-dark">
          <th scope="col" className="w-16 py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("landing.rank")}
          </th>
          <th scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("landing.participant")}
          </th>
          <th scope="col" className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
            {t("landing.score")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry, i) => (
          <tr key={`${entry.name}-${i}`} className="border-b border-border-light dark:border-border-dark last:border-0">
            <td className="py-3 pr-4 font-mono text-sm">
              {i === 0 ? <Trophy size={16} className="text-accent" aria-label="1st place" /> : i + 1}
            </td>
            <td className="py-3 pr-4 text-sm font-medium">
              {entry.name}
              {showEmail && entry.email && (
                <span className="block text-xs text-subtle">{entry.email}</span>
              )}
            </td>
            <td className="py-3 text-sm text-right tabular-nums font-semibold">
              {entry.best_score !== null ? entry.best_score.toFixed(4) : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
