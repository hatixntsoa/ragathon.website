import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { getSocket } from "../lib/socket";
import { TimerState } from "../types";

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function Timer() {
  const { t } = useTranslation();
  const [state, setState] = useState<TimerState | null>(null);
  const [displayMs, setDisplayMs] = useState<number>(0);
  const driftAnchor = useRef<{ serverRemaining: number; receivedAt: number } | null>(null);

  useEffect(() => {
    const socket = getSocket();

    function onUpdate(payload: TimerState) {
      setState(payload);
      driftAnchor.current = { serverRemaining: payload.remaining_ms, receivedAt: Date.now() };
      setDisplayMs(payload.remaining_ms);
    }

    socket.on("timer:update", onUpdate);
    socket.emit("timer:request_sync");

    return () => {
      socket.off("timer:update", onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!state || state.status !== "running") return;
    const interval = setInterval(() => {
      if (!driftAnchor.current) return;
      const elapsed = Date.now() - driftAnchor.current.receivedAt;
      setDisplayMs(Math.max(0, driftAnchor.current.serverRemaining - elapsed));
    }, 250);
    return () => clearInterval(interval);
  }, [state]);

  if (!state || state.status === "stopped") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border-light dark:border-border-dark px-4 py-3">
        <Clock size={18} className="text-black/40 dark:text-white/40" aria-hidden="true" />
        <span className="text-sm text-black/50 dark:text-white/50">{t("dashboard.timer_stopped")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-light dark:border-border-dark px-4 py-3">
      <Clock size={18} className={state.status === "running" ? "text-accent" : "text-black/40 dark:text-white/40"} aria-hidden="true" />
      <div>
        <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
          {t("dashboard.timer_title")}
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          role="timer"
          aria-live="polite"
        >
          {formatMs(displayMs)}
        </p>
      </div>
      {state.status === "paused" && (
        <span className="ml-2 text-xs font-semibold rounded-full bg-surface-light dark:bg-surface-dark px-2 py-1">
          {t("admin.timer_pause")}
        </span>
      )}
    </div>
  );
}
