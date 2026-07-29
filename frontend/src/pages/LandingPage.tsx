import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export default function LandingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.landing-section')) as HTMLElement[];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <section className="section-padding-lg landing-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h1 className="max-w-3xl mx-auto">{t("landing.hero_title")}</h1>
            <p className="mt-6 max-w-xl mx-auto text-fg/70">{t("landing.hero_subtitle")}</p>
            <div className="mt-8 flex items-center justify-center">
              <Link to={user ? "/dashboard" : "/login"} className="btn-primary px-8 py-4">
                {t("landing.cta_primary")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
