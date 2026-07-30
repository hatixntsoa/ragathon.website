import { useEffect, useState } from "react";
import { apiClient as api } from "../lib/api_client";
import { getSocket } from "../lib/socket";
import Leaderboard from "../components/Leaderboard";
import { LeaderboardEntry } from "../types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    function load() {
      api
        .get<{ leaderboard: LeaderboardEntry[] }>("/submissions/leaderboard")
        .then((res) => setEntries(res.leaderboard))
        .catch(() => setEntries([]));
    }
    load();
    const socket = getSocket();
    socket.on("leaderboard:refresh", load);
    return () => {
      socket.off("leaderboard:refresh", load);
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Leaderboard entries={entries} limit={50} />
    </main>
  );
}