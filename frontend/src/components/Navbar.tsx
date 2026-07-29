import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, LayoutDashboard } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import logo from "../assets/ragathon.logo.svg";
// import ThemeSwitcher from "./ThemeSwitcher";
import Timer from "./Timer";
import { useAuth } from "../context/AuthContext";
import { useAdminTab, AdminTab } from "../context/AdminTabContext";

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab } = useAdminTab();

  function handleLogout() {
    logout();
    navigate("/");
  }

  const adminTabs: [AdminTab, string][] = [
    ["users", t("admin.nav_users")],
    ["submissions", t("admin.nav_submissions")],
    ["timer", t("admin.nav_timer")],
    ["export", t("admin.nav_export")],
    ["leaderboard", t("admin.nav_leaderboard")],
    ["settings", t("admin.nav_settings")],
  ];

  function goToAdminTab(tab: AdminTab) {
    setActiveTab(tab);
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-light bg-bg/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2" aria-label="RAGATHON home">
            {/* <span className="text-lg font-extrabold tracking-tight">RAGATHON</span> */}
            <img src={logo} alt="RAGATHON" className="h-8 w-auto" />
          </Link>

          {user && user.role === "admin" && (
            <div className="hidden md:flex items-center gap-3">
              {adminTabs.map(([tab,label]) => {
                const isActive = location.pathname === "/dashboard" && activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => goToAdminTab(tab)}
                    className={`text-sm font-medium px-2 py-1 rounded ${isActive ? 'text-accent' : 'text-muted'} hover:text-accent transition-colors`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Timer compact />
          <LanguageSwitcher />
          {/* <ThemeSwitcher /> */}

          {user ? (
            <>
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