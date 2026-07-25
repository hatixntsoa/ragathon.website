import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border-light dark:border-border-dark px-2 py-1">
      <Globe size={14} className="text-black/50 dark:text-white/50" aria-hidden="true" />
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={i18n.language === lang.code}
          aria-label={`Switch to ${lang.label}`}
          className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === lang.code
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
