import { DragEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Database,
  Code2,
  UploadCloud,
  FileBox,
  ExternalLink,
  CheckCircle2,
  Clock3,
  XCircle,
  Loader2,
} from "lucide-react";
import Timer from "../components/Timer";
import ActionCard from "../components/ActionCard";
import { useAuth } from "../context/AuthContext";
import { apiClient as api } from "../lib/api_client";
import { getSocket } from "../lib/socket";
import { Submission } from "../types";

const DATASET_URL = "https://drive.google.com/drive/folders/ragathon-private-dataset";
const KAGGLE_URL = "https://www.kaggle.com/code/ragathon/ragathon-rag-template";

interface MyResponse {
  submissions: Submission[];
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
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const latestSubmission = submissions[0];

  const loadSubmissions = useCallback(() => {
    api
      .get<MyResponse>("/submissions/mine")
      .then((res) => setSubmissions(res.submissions))
      .catch(() => setSubmissions([]));
  }, []);

  useEffect(() => {
    loadSubmissions();
    const socket = getSocket();
    const interval = setInterval(loadSubmissions, 6000);
    return () => {
      clearInterval(interval);
      socket.off("leaderboard:refresh", loadSubmissions);
    };
  }, [loadSubmissions]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      if (file.name.endsWith(".json")) setModelFile(file);
    }
  }

  async function handleSubmit() {
    if (!modelFile) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("model", modelFile);
      // use submission helper (frontend/src/lib/submissionClient.ts) to make the submission
      const { submitResponseFile } = await import("../lib/submissionClient");
      await submitResponseFile(modelFile);
      setMessage(t("dashboard.submission_success"));
      setModelFile(null);
      loadSubmissions();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("auth.error_generic"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-extrabold">{t("dashboard.welcome_back", { name: user?.name ?? "Participant" })}</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        <ActionCard
          icon={Database}
          label={t("dashboard.data_label")}
          title={t("dashboard.data_access_title")}
          description={t("dashboard.data_access_desc")}
          href={DATASET_URL}
        />

        <ActionCard
          icon={Code2}
          label={t("dashboard.build_label")}
          title={t("dashboard.kaggle_title")}
          description={t("dashboard.kaggle_desc")}
          href={KAGGLE_URL}
        />

        <ActionCard
          icon={UploadCloud}
          label={t("dashboard.status_label")}
          title={t("dashboard.submission_status_title")}
          description={
            latestSubmission ? (
              <>
                <StatusBadge status={latestSubmission.status} />
                {latestSubmission.score !== null && (
                  <p className="mt-4 text-sm text-muted">{t("landing.score")} : {latestSubmission.score.toFixed(4)}</p>
                )}
              </>
            ) : (
              <>
                <StatusBadge status="pending" />
                <p className="mt-4 text-sm text-muted">{t("dashboard.no_submission_yet")}</p>
              </>
            ) as any
          }
        />
      </div>

      <section className="rounded-xl border border-border-light dark:border-border-dark p-8 mb-10">
        <h2 className="text-lg font-bold mb-1">{t("dashboard.submission_title")}</h2>
        <p className="mb-6 text-sm text-muted">{t("dashboard.submission_desc")}</p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-14 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-border-light dark:border-border-dark"
          }`}
        >
          <label className="flex cursor-pointer flex-col items-center gap-2">
            <FileBox size={28} className={modelFile ? "text-accent" : "text-subtle"} aria-hidden="true" />
            <span className="text-lg font-semibold">{modelFile ? modelFile.name : t("dashboard.submission_model")}</span>
            <span className="text-sm text-muted">{t("dashboard.drag_or_browse")}</span>
            <input
              type="file"
              accept=".json"
              className="sr-only"
              onChange={(e) => setModelFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!modelFile || uploading}
          onClick={handleSubmit}
          className="btn-primary mt-8 px-6 py-3"
        >
          {uploading ? t("dashboard.submission_uploading") : t("dashboard.submission_button")}
        </button>

        {message && <p className="mt-4 text-sm text-fg/70">{message}</p>}
      </section>
    </main>
  );
}
