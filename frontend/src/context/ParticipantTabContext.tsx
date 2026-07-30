import { createContext, useContext, useState, ReactNode } from "react";

export type ParticipantTab = "submission" | "score" | "status";

interface ParticipantTabContextValue {
  activeTab: ParticipantTab;
  setActiveTab: (tab: ParticipantTab) => void;
}

const ParticipantTabContext = createContext<ParticipantTabContextValue | undefined>(undefined);

export function ParticipantTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<ParticipantTab>("submission");

  return (
    <ParticipantTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ParticipantTabContext.Provider>
  );
}

export function useParticipantTab(): ParticipantTabContextValue {
  const ctx = useContext(ParticipantTabContext);
  if (!ctx) throw new Error("useParticipantTab must be used within a ParticipantTabProvider");
  return ctx;
}