import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Database, Code2, UploadCloud, Cpu, ArrowRight } from "lucide-react";
import Leaderboard from "../components/Leaderboard";
import { api } from "../lib/api";
import { LeaderboardEntry } from "../types";
import { useAuth } from "../context/AuthContext";

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

const STEPS = [
  { icon: Database, titleKey: "step_1_title", descKey: "step_1_desc" },
  { icon: Code2, titleKey: "step_2_title", descKey: "step_2_desc" },
  { icon: UploadCloud, titleKey: "step_3_title", descKey: "step_3_desc" },
  { icon: Cpu, titleKey: "step_4_title", descKey: "step_4_desc" },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api
      .get<LeaderboardResponse>("/submissions/leaderboard")
      .then((res) => setLeaderboard(res.leaderboard))
      .catch(() => setLeaderboard([]));
  }, []);

  return (
    <main>
      {/* Hero: asymmetric split layout, not centered */}
      <section className="section-padding-lg border-b border-border-light dark:border-border-dark">
        <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            {/* <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">
              RAGATHON &middot; ragathon.ilaikoto.com
            </p> */}
            <h1 className="max-w-3xl">{t("landing.hero_title")}</h1>
            <p className="mt-6 max-w-xl text-black/70 dark:text-white/70">
              {t("landing.hero_subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={user ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 rounded-md bg-black text-white dark:bg-white dark:text-black px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("landing.cta_primary")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-semibold text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
              >
                {t("landing.cta_secondary")}
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 lg:justify-self-end w-full">
            <div className="rounded-xl border border-border-light dark:border-border-dark p-6 bg-surface-light dark:bg-surface-dark">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-4">
                {t("landing.leaderboard_title")}
              </p>
              <Leaderboard entries={leaderboard} limit={3} />
            </div>
          </div>
        </div>
      </section>

      {/* Steps: asymmetric 4-col grid */}
      <section id="how-it-works" className="section-padding border-b border-border-light dark:border-border-dark">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12">{t("landing.steps_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-light dark:bg-border-dark border border-border-light dark:border-border-dark">
            {STEPS.map((step, i) => (
              <div key={step.titleKey} className="bg-white dark:bg-black p-8">
                <span className="text-xs font-mono text-black/40 dark:text-white/40">0{i + 1}</span>
                <step.icon size={24} className="text-accent mt-4 mb-4" aria-hidden="true" />
                <h3 className="text-lg font-bold mb-2">{t(`landing.${step.titleKey}`)}</h3>
                <p className="text-sm text-black/60 dark:text-white/60">{t(`landing.${step.descKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full leaderboard preview section */}
      <section className="section-padding">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2>{t("landing.leaderboard_title")}</h2>
              <p className="text-black/60 dark:text-white/60 mt-2">{t("landing.leaderboard_subtitle")}</p>
            </div>
          </div>
          <Leaderboard entries={leaderboard} limit={3} />
        </div>
      </section>
    </main>
  );
}
