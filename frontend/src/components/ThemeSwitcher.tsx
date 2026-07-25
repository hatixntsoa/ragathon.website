import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light hover:bg-surface-light transition-colors"
    >
      {theme === "light" ? (
        <Moon size={14} className="text-muted" aria-hidden="true" />
      ) : (
        <Sun size={14} className="text-muted" aria-hidden="true" />
      )}
    </button>
  );
}
