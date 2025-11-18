// apps/gestor-dashboard/src/components/HeatmapSemanaHoraCard.tsx
import { useEffect, useMemo, useState } from "react";
import { usePeriod } from "@/context/PeriodContext";
import { fetchJSON } from "@/lib/api";
import { demoHeatmapWeekHour, seedFromRange } from "@/lib/demo";

function extractRows(resp: any): Array<{ weekday: number; hour: number; count: number }> {
  if (!resp) return [];

  // formato novo do adapter → bins[][] → converter para rows
  if (Array.isArray(resp?.bins)) {
    const out: Array<{ weekday: number; hour: number; count: number }> = [];
    resp.bins.forEach((row: any[], wd: number) => {
      if (Array.isArray(row)) {
        row.forEach((count: any, hr: number) => {
          out.push({
            weekday: wd,
            hour: hr,
            count: Number(count) || 0,
          });
        });
      }
    });
    return out;
  }

  // formato nested: data.bins
  if (Array.isArray(resp?.data?.bins)) {
    const out: Array<{ weekday: number; hour: number; count: number }> = [];
    resp.data.bins.forEach((row: any[], wd: number) => {
      if (Array.isArray(row)) {
        row.forEach((count: any, hr: number) => {
          out.push({
            weekday: wd,
            hour: hr,
            count: Number(count) || 0,
          });
        });
      }
    });
    return out;
  }

  // formato antigo: array de objetos {weekday,hour,count}
  if (Array.isArray(resp?.data) && resp.data.length && resp.data[0].weekday !== undefined) {
    return resp.data;
  }

  return [];
}

type Row = { weekday: number; hour: number; count: number };
type Props = { demo?: boolean };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function HeatmapSemanaHoraCard({ demo = false }: Props) {
  const { from, to } = usePeriod();
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        if (demo) {
          const mock = demoHeatmapWeekHour(seedFromRange(from, to));
          if (!abort) setData(mock);
        } else {
          const q = new URLSearchParams({ from, to });
          const res = await fetchJSON<any>(`/api/heatmap/week-hour?${q.toString()}`);
          const rows = extractRows(res);
          if (!abort) setData(rows);
        }
      } catch (e: any) {
        if (!abort) {
          setErr(e?.message ?? "erro ao carregar heatmap");
          setData([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [from, to, demo]);

  const { min, max } = useMemo(() => {
    let mn = 0, mx = 0;
    for (const r of data) {
      mn = Math.min(mn, r.count);
      mx = Math.max(mx, r.count);
    }
    return { min: mn, max: mx };
  }, [data]);

  const grid = useMemo(() => {
    const rows: Row[][] = Array.from({ length: 7 }, (_, wd) =>
      Array.from({ length: 24 }, (_, hr) => {
        const found = data.find((b) => b.weekday === wd && b.hour === hr);
        return found ?? { weekday: wd, hour: hr, count: 0 };
      })
    );
    return rows;
  }, [data]);

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Heatmap — Semana × Hora</h2>
          <span className="text-xs text-gray-500">{from} → {to}</span>
        </div>
        <div className="text-xs text-gray-500">
          {loading ? "Carregando…" : err ? "Erro" : "OK"}
          {demo && <span className="ml-2 px-1.5 py-0.5 border rounded">demo</span>}
        </div>
      </div>

      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

      {/* tabela */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid" style={{ gridTemplateColumns: `100px repeat(24, 1fr)` }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-[11px] text-center text-gray-600 pb-1">
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {grid.map((row, wd) => (
            <div key={wd} className="grid" style={{ gridTemplateColumns: `100px repeat(24, 1fr)` }}>
              <div className="text-sm text-gray-700 py-1 pr-2">{WEEKDAYS[wd]}</div>
              {row.map((cell) => {
                const v = cell.count;
                const intensity = max > 0 ? v / max : 0;
                const bg = `hsl(220deg 90% ${92 - Math.round(intensity * 52)}%)`;

                return (
                  <div
                    key={`${cell.weekday}-${cell.hour}`}
                    className="h-8 border-[0.5px] border-gray-200"
                    style={{ background: bg }}
                    title={`${WEEKDAYS[cell.weekday]} ${cell.hour}h — ${v}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
        <span>Min</span>
        <div className="h-3 w-24 rounded" style={{ background: "hsl(220deg 90% 92%)" }} />
        <div className="h-3 w-24 rounded" style={{ background: "hsl(220deg 90% 70%)" }} />
        <div className="h-3 w-24 rounded" style={{ background: "hsl(220deg 90% 40%)" }} />
        <span>Max</span>
        <span className="ml-3">({min} → {max})</span>
      </div>
    </div>
  );
}
