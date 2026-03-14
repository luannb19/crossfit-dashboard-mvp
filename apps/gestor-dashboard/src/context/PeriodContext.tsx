import React, { createContext, useContext, useMemo, useState } from "react";

export type PeriodDays = 7 | 28 | 90 | 365;

type PeriodContextValue = {
  period: PeriodDays;
  setPeriod: (p: PeriodDays) => void;
  from: string; // YYYY-MM-DD (local)
  to: string;   // YYYY-MM-DD (local)
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

function formatDateLocal(d: Date) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriod] = useState<PeriodDays>(28); // padrão: últimos 28 dias

  const value = useMemo<PeriodContextValue>(() => {
    const end = new Date(); // hoje (horário local)
    const start = new Date();
    start.setDate(end.getDate() - (period - 1)); // janela inclusiva

    return {
      period,
      setPeriod,
      from: formatDateLocal(start),
      to: formatDateLocal(end),
    };
  }, [period]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within <PeriodProvider>");
  return ctx;
}
