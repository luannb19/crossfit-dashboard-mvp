// src/hooks/useHeatmapSemanaHora.ts
import { useEffect, useMemo, useState } from "react";
import { usePeriod } from "@/context/PeriodContext"; // novo: fallback global
import { fetchHeatmap } from "../lib/api"; // caminho RELATIVO
// (opcional) use os mocks se já existirem:
import { getDemoHeatmap } from "@/lib/demo"; // remova esta linha se não tiver mock

type Params = {
  from?: string;
  to?: string;
  demoMode?: boolean; // novo: para suportar Demo ON/OFF
};

type Cell = { weekday: number; hour: number; ocupacao: number };
type Stats = { min: number; max: number };

export function useHeatmapSemanaHora({ from, to, demoMode }: Params) {
  const { from: ctxFrom, to: ctxTo } = usePeriod(); // pega período global
  const [data, setData] = useState<Cell[]>([]);
  const [stats, setStats] = useState<Stats>({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escolhe datas efetivas: props > contexto > defaults
  const { effFrom, effTo } = useMemo(() => {
    const today = new Date();
    const defTo = today.toISOString().slice(0, 10);
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    const defFrom = d.toISOString().slice(0, 10);

    return {
      effFrom: from ?? ctxFrom ?? defFrom,
      effTo: to ?? ctxTo ?? defTo,
    };
  }, [from, to, ctxFrom, ctxTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // DEMO: usa mock se habilitado e disponível
        if (demoMode) {
          const mock = getDemoHeatmap
            ? getDemoHeatmap({ from: effFrom, to: effTo })
            : { data: [] as any[] };

          const cells: Cell[] = (Array.isArray(mock) ? mock : mock.data).map((b: any) => ({
            weekday: (b.dow ?? b.weekday ?? 7) % 7, // 7->0
            hour: b.hour,
            ocupacao: b.presencas ?? b.ocupacao ?? 0,
          }));

          const vals = cells.map(c => c.ocupacao);
          const min = vals.length ? Math.min(...vals) : 0;
          const max = vals.length ? Math.max(...vals) : 0;

          if (!cancelled) {
            setData(cells);
            setStats({ min, max });
          }
          return;
        }

        // PROD: busca no backend
        const resp = await fetchHeatmap({ from: effFrom, to: effTo });

        // Backend: dow = 1..7 (1=Seg … 7=Dom) -> UI: weekday = 0..6 (0=Dom)
        const cells: Cell[] = (resp?.data ?? []).map((b: any) => ({
          weekday: b.dow % 7, // 7 -> 0
          hour: b.hour,
          ocupacao: b.presencas,
        }));

        const vals = cells.map(c => c.ocupacao);
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 0;

        if (!cancelled) {
          setData(cells);
          setStats({ min, max });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Erro ao carregar heatmap");
          setData([]);
          setStats({ min: 0, max: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effFrom, effTo, demoMode]);

  return { data, stats, loading, error };
}
