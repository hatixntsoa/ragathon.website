import { DragEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileBox, CheckCircle2, Clock3, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient as api } from "../lib/api_client";
import { getSocket } from "../lib/socket";
import { TimerState } from "../types";
import { Submission } from "../types";
import { useParticipantTab } from "../context/ParticipantTabContext";

interface MyResponse {
  submissions: Submission[];
  remaining: number;
}

function StatusBadge({ status }: { status: Submission["status"] }) {
  const { t } = useTranslation();
  const map = {
    pending: { icon: Clock3, cls: "text-subtle", label: t("dashboard.status_pending") },
    evaluating: { icon: Loader2, cls: "text-accent animate-spin", label: t("dashboard.status_evaluating") },
    scored: { icon: CheckCircle2, cls: "text-success", label: t("dashboard.status_scored") },
    failed: { icon: XCircle, cls: "text-danger", label: t("dashboard.status_failed") },
  } as const;
  const entry = map[status];
  const Icon = entry.icon;
  return (
    <span className="pill text-sm">
      <Icon size={14} className={entry.cls} aria-hidden="true" />
      {entry.label}
    </span>
  );
}

export default function ParticipantDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // const [tab, setTab] = useState<"submission" | "score" | "status">("submission");
  const { activeTab: tab } = useParticipantTab();
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [remaining, setRemaining] = useState<number>(2);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const submissionsOpen = !!timer && timer.status === "running";
  const latestSubmission = submissions[0];
  const orderedAsc = [...submissions].reverse();

  const loadSubmissions = useCallback(() => {
    api
      .get<MyResponse>("/submissions/mine")
      .then((res) => {
        setSubmissions(res.submissions);
        setRemaining(res.remaining);
      })
      .catch(() => setSubmissions([]));
  }, []);

  useEffect(() => {
    loadSubmissions();
    const socket = getSocket();
    socket.on("leaderboard:refresh", loadSubmissions);
    socket.on("timer:update", setTimer);
    socket.emit("timer:request_sync");
    const interval = setInterval(loadSubmissions, 6000);
    return () => {
      clearInterval(interval);
      socket.off("leaderboard:refresh", loadSubmissions);
      socket.off("timer:update", setTimer);
    };
  }, [loadSubmissions]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      if (file.name.endsWith(".json")) setModelFile(file);
    }
  }

  async function waitForResult(submissionId: string, minMs = 3000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve) => {
      const check = async () => {
        try {
          const res = await api.get<MyResponse>("/submissions/mine");
          const found = res.submissions.find((s) => s.id === submissionId);
          const elapsed = Date.now() - start;
          if (found && (found.status === "scored" || found.status === "failed") && elapsed >= minMs) {
            setSubmissions(res.submissions);
            setRemaining(res.remaining);
            resolve();
            return;
          }
        } catch {
          // keep polling
        }
        setTimeout(check, 1000);
      };
      check();
    });
  }

  async function handleSubmit() {
    if (!modelFile) return;
    setUploading(true);
    setMessage(null);
    try {
      const { submitResponseFile } = await import("../lib/submissionClient");
      const res = (await submitResponseFile(modelFile)) as { submissionId: string };
      setUploading(false);
      setEvaluating(true);
      await waitForResult(res.submissionId);
      setMessage(t("dashboard.submission_success"));
      setModelFile(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("auth.error_generic"));
    } finally {
      setUploading(false);
      setEvaluating(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{t("dashboard.welcome_back", { name: user?.name ?? "Participant" })}</h1>
      </div>

      <section className="rounded-xl border border-border-light p-8 dark:border-border-dark">
        {tab === "submission" && (
          <div>
            <h2 className="mb-1 text-lg font-bold">{t("dashboard.submission_title")}</h2>
            <p className="mb-6 text-sm text-muted">{t("dashboard.submission_desc")}</p>
            <p className="mb-6 text-sm text-muted">{t("dashboard.submissions_remaining", { count: remaining })}</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (submissionsOpen) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                if (!submissionsOpen) {
                  e.preventDefault();
                  return;
                }
                handleDrop(e);
              }}
              className={`rounded-lg border-2 border-dashed p-14 text-center transition-colors ${
                dragging ? "border-accent bg-accent/5" : "border-border-light dark:border-border-dark"
              } ${!submissionsOpen ? "opacity-50 pointer-events-none" : ""}`}
            >
              <label className="flex cursor-pointer flex-col items-center gap-2">
                <FileBox size={28} className={modelFile ? "text-accent" : "text-subtle"} aria-hidden="true" />
                <span className="text-lg font-semibold">{modelFile ? modelFile.name : t("dashboard.submission_model")}</span>
                <span className="text-sm text-muted">{t("dashboard.drag_or_browse")}</span>
                <input
                  type="file"
                  accept=".json"
                  className="sr-only"
                  disabled={!submissionsOpen}
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!modelFile || uploading || evaluating || remaining <= 0 || !submissionsOpen}
              onClick={handleSubmit}
              className="btn-primary mt-8 px-6 py-3"
            >
              {uploading
                ? t("dashboard.submission_uploading")
                : evaluating
                ? t("dashboard.submission_evaluating_loading")
                : t("dashboard.submission_button")}
            </button>

            {(!timer || timer.status !== "running") && (
              <p className="mt-4 text-sm text-danger">{t("dashboard.submissions_closed")}</p>
            )}

            {message && <p className="mt-4 text-sm text-fg/70">{message}</p>}

            {latestSubmission && (
              <div className="mt-8 rounded-lg border border-border-light p-5 dark:border-border-dark">
                <p className="mb-2 text-xs font-semibold text-muted">{t("dashboard.status_label")}</p>
                <StatusBadge status={latestSubmission.status} />
              </div>
            )}
          </div>
        )}

        {tab === "score" && (
          <div>
            <h2 className="mb-6 text-lg font-bold">{t("dashboard.tab_score")}</h2>
            {submissions.length > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border-light p-4 text-center dark:border-border-dark">
                  <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                    {submissions.reduce((sum, s) => sum + s.pass_count, 0)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Passed</p>
                </div>
                <div className="rounded-lg border border-border-light p-4 text-center dark:border-border-dark">
                  <p className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">
                    {submissions.reduce((sum, s) => sum + s.gray_count, 0)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gray</p>
                </div>
                <div className="rounded-lg border border-border-light p-4 text-center dark:border-border-dark">
                  <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                    {submissions.reduce((sum, s) => sum + s.fail_count, 0)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Failed</p>
                </div>
              </div>
            )}
            {submissions.length === 0 ? (
              <p className="text-sm text-muted">{t("dashboard.no_submission_yet")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {orderedAsc.map((s, i) => (
                  <div key={s.id} className="rounded-lg border border-border-light p-5 dark:border-border-dark">
                    <p className="mb-2 text-sm font-semibold text-muted">{t("dashboard.submission_label", { n: i + 1 })}</p>
                    {s.score !== null ? (
                      <p className="text-2xl font-extrabold">
                        {s.score}
                        {s.total !== null && <span className="text-lg text-muted"> / {s.total}</span>}
                      </p>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "status" && (
          <div>
            <h2 className="mb-6 text-lg font-bold">{t("dashboard.tab_status")}</h2>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted">{t("dashboard.no_submission_yet")}</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
                {orderedAsc.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 border-b border-border-light px-5 py-4 last:border-0 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{t("dashboard.submission_label", { n: i + 1 })}</p>
                      <p className="text-xs text-muted">{new Date(s.submitted_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={s.status} />
                      {s.score !== null && (
                        <span className="text-sm font-semibold tabular-nums">
                          {t("landing.score")} : {s.score}
                          {s.total !== null ? ` / ${s.total}` : ""}
                        </span>
                      )}
                    </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="pill pill-pass">Pass {s.pass_count}</span>
                    <span className="pill pill-gray">Gray {s.gray_count}</span>
                    <span className="pill pill-fail">Fail {s.fail_count}</span>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}