import { createContext, useContext, useState, ReactNode } from "react";

// export type AdminTab = "users" | "submissions" | "timer" | "export" | "leaderboard" | "scores" | "settings";
export type AdminTab = "users" | "timer" | "export" | "leaderboard" | "scores" | "settings";

interface AdminTabContextValue {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const AdminTabContext = createContext<AdminTabContextValue | undefined>(undefined);

export function AdminTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("leaderboard");

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminTabContext.Provider>
  );
}

export function useAdminTab(): AdminTabContextValue {
  const ctx = useContext(AdminTabContext);
  if (!ctx) throw new Error("useAdminTab must be used within an AdminTabProvider");
  return ctx;
}