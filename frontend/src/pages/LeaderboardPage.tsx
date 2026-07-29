import { useEffect, useState } from "react";
import { apiClient as api } from "../lib/api_client";
import Leaderboard from "../components/Leaderboard";
import { LeaderboardEntry } from "../types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api
      .get<{ leaderboard: LeaderboardEntry[] }>("/submissions/leaderboard")
      .then((res) => setEntries(res.leaderboard))
      .catch(() => setEntries([]));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <Leaderboard entries={entries} limit={50} />
    </main>
  );
}
