import { createContext, useContext, useMemo, useState } from "react";

export type Preset = "7d" | "28d" | "90d" | "365d";
export type Range = { from: string; to: string; preset: Preset };

type Ctx = {
  range: Range;
  setPreset: (p: Preset) => void;
};

const DateRangeCtx = createContext<Ctx | null>(null);

// Util: formata como YYYY-MM-DD em UTC (corte em 10 chars)
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function calcRange(preset: Preset, now = new Date()): Range {
  const to = new Date(now);
  const from = new Date(now);
  const days = preset === "7d" ? 7 : preset === "28d" ? 28 : preset === "90d" ? 90 : 365;
  from.setDate(to.getDate() - (days - 1));
  return { from: toISODate(from), to: toISODate(to), preset };
}

// Safe getters para evitar erros em ambientes sem window (tests/SSR)
function getStoredPreset(): Preset | null {
  try {
    const v = localStorage.getItem("if.preset");
    if (v === "7d" || v === "28d" || v === "90d" || v === "365d") return v;
  } catch {}
  return null;
}
function setStoredPreset(p: Preset) {
  try { localStorage.setItem("if.preset", p); } catch {}
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const initialPreset = getStoredPreset() ?? "28d";
  const [range, setRange] = useState<Range>(() => calcRange(initialPreset));

  const value = useMemo<Ctx>(() => ({
    range,
    setPreset: (p: Preset) => {
      setStoredPreset(p);
      setRange(calcRange(p));
    },
  }), [range]);

  return <DateRangeCtx.Provider value={value}>{children}</DateRangeCtx.Provider>;
}

export function useDateRange(): Ctx {
  const ctx = useContext(DateRangeCtx);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
