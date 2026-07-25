import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, LayoutDashboard } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-light bg-bg/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Link to="/" className="flex items-center gap-2" aria-label="RAGATHON home">
          <span className="text-lg font-extrabold tracking-tight">RAGATHON</span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />

          {user ? (
            <>
              <Link
                to={user.role === "admin" ? "/admin" : "/dashboard"}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
              >
                <LayoutDashboard size={16} aria-hidden="true" />
                {t("nav.dashboard")}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md border border-border-light px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
              >
                <LogOut size={16} aria-hidden="true" />
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
              >
                {t("nav.login")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
