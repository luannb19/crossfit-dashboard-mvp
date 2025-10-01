// src/hooks/useHeatmapSemanaHora.ts
import { useEffect, useState } from "react";
import { fetchHeatmap } from "../lib/api"; // caminho RELATIVO

type Params = { from?: string; to?: string };
type Cell = { weekday: number; hour: number; ocupacao: number };
type Stats = { min: number; max: number };

export function useHeatmapSemanaHora({ from, to }: Params) {
  const [data, setData] = useState<Cell[]>([]);
  const [stats, setStats] = useState<Stats>({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pFrom = from ?? new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
        const pTo   = to   ?? new Date().toISOString().slice(0, 10);

        const resp = await fetchHeatmap({ from: pFrom, to: pTo });

        // Backend: dow = 1..7 (1=Seg … 7=Dom) -> UI: weekday = 0..6 (0=Dom)
        const cells: Cell[] = resp.data.map(b => ({
          weekday: b.dow % 7,     // 7 -> 0
          hour: b.hour,
          ocupacao: b.presencas,
        }));

        const vals = cells.map(c => c.ocupacao);
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 0;

        setData(cells);
        setStats({ min, max });
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar heatmap");
        setData([]);
        setStats({ min: 0, max: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  return { data, stats, loading, error };
}
