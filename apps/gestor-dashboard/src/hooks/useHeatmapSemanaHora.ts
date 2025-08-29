import { useEffect, useMemo, useState } from "react";
import axios from "axios";

export type HeatCell = {
  weekday: number;   // 0=Dom, 1=Seg, ... 6=Sáb
  hour: number;      // 0..23
  ocupacao: number;  // valor em %
};

type ApiRow = {
  weekday: number;
  hour: number;
  avg: number;
};

const HEATMAP_PATH = "/analytics/heatmap";

export function useHeatmapSemanaHora(params?: { from?: string; to?: string }) {
  const [data, setData] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL;
  const TOKEN = import.meta.env.VITE_GESTOR_TOKEN;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const base = API.replace(/\/$/, "");
        const url = `${base}${HEATMAP_PATH}`;

        const today = new Date();
        const toDefault = today.toISOString().slice(0, 10);
        const fromDefault = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const res = await axios.get(url, {
          params: {
            from: params?.from ?? fromDefault,
            to: params?.to ?? toDefault,
          },
          headers: { Authorization: `Bearer ${TOKEN}` },
        });

        if (!mounted) return;

        // backend retorna { from, to, heat: [...] }
        const arr: ApiRow[] = res.data?.heat ?? [];

        const parsed: HeatCell[] = arr.map((r) => ({
          weekday: r.weekday,
          hour: r.hour,
          ocupacao: Math.round((r.avg ?? 0) * 100), // normaliza pra %
        }));

        setData(parsed);
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? "Erro ao carregar heatmap");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API, TOKEN, params?.from, params?.to]);

  const stats = useMemo(() => {
    const values = data.map((c) => c.ocupacao);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    return { min, max };
  }, [data]);

  return { data, loading, error, stats };
}
