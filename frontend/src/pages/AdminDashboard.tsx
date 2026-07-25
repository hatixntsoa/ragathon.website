import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, Download, FileSpreadsheet, FileText, Database } from "lucide-react";
import Timer from "../components/Timer";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { AdminUserRow, TimerState } from "../types";

interface UsersResponse {
  users: AdminUserRow[];
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [hours, setHours] = useState("4");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    function onUpdate(payload: TimerState) {
      setTimer(payload);
    }
    socket.on("timer:update", onUpdate);
    socket.emit("timer:request_sync");
    loadUsers();
    return () => {
      socket.off("timer:update", onUpdate);
    };
  }, []);

  function loadUsers() {
    api
      .get<UsersResponse>("/admin/users")
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]));
  }

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const start = () => withBusy(() => api.post("/admin/timer/start"));
  const pause = () => withBusy(() => api.post("/admin/timer/pause"));
  const reset = () => withBusy(() => api.post("/admin/timer/reset"));
  const applyDuration = () =>
    withBusy(() => api.post("/admin/timer/duration", { durationMs: Number(hours) * 3600 * 1000 }));

  const exportCsv = () => api.download("/export/leaderboard.csv", "ragathon-leaderboard.csv");
  const exportPdf = () => api.download("/export/report.pdf", "ragathon-report.pdf");
  const exportDb = () => api.download("/export/database", "ragathon.db");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
        <h1 className="text-3xl font-extrabold">{t("admin.title")}</h1>
        <Timer />
      </div>

      <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
        <h2 className="text-lg font-bold mb-6">{t("admin.timer_control_title")}</h2>

        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div>
            <label htmlFor="duration" className="block text-sm font-medium mb-1.5">
              {t("admin.timer_duration_label")}
            </label>
            <input
              id="duration"
              type="number"
              min={0.5}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-32 rounded-md border border-border-light dark:border-border-dark bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={applyDuration}
            disabled={busy}
            className="rounded-md border border-border-light px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
          >
            {t("admin.timer_apply")}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="btn-primary"
          >
            <Play size={16} aria-hidden="true" />
            {t("admin.timer_start")}
          </button>
          <button
            type="button"
            onClick={pause}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
          >
            <Pause size={16} aria-hidden="true" />
            {t("admin.timer_pause")}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t("admin.timer_reset")}
          </button>
        </div>

        {timer && (
          <p className="text-sm text-muted">
            Status: <span className="font-semibold">{timer.status}</span> &middot; Remaining:{" "}
            <span className="font-mono">{Math.round(timer.remaining_ms / 1000)}s</span>
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
        <h2 className="text-lg font-bold mb-6">{t("admin.data_management_title")}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            {t("admin.export_leaderboard")}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
          >
            <FileText size={16} aria-hidden="true" />
            {t("admin.export_report")}
          </button>
          <button
            type="button"
            onClick={exportDb}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
          >
            <Database size={16} aria-hidden="true" />
            {t("admin.export_database")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border-light dark:border-border-dark p-6">
        <h2 className="text-lg font-bold mb-6">{t("admin.users_title")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark">
                <th scope="col" className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("admin.user_name")}
                </th>
                <th scope="col" className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("admin.user_email")}
                </th>
                <th scope="col" className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("admin.user_role")}
                </th>
                <th scope="col" className="py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("admin.user_submissions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-light dark:border-border-dark last:border-0">
                  <td className="py-3 pr-4 text-sm font-medium">{u.name}</td>
                  <td className="py-3 pr-4 text-sm text-muted">{u.email}</td>
                  <td className="py-3 pr-4 text-sm">
                    <span className="pill pill-accent px-2 py-0.5">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-sm tabular-nums">{u.submissions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={loadUsers}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              <Download size={14} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
