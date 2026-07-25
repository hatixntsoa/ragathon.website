import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="flex items-center justify-center rounded-full border border-border-light dark:border-border-dark w-8 h-8 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
    >
      {theme === "light" ? (
        <Moon size={14} className="text-black/60" aria-hidden="true" />
      ) : (
        <Sun size={14} className="text-white/70" aria-hidden="true" />
      )}
    </button>
  );
}
