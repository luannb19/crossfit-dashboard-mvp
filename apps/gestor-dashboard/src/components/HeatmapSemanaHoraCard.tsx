import { useEffect, useMemo, useState } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { fetchJSON } from "@/lib/api"; // centralizador com base + headers + 401 handling
import { getToken } from "@/lib/api";
import { demoHeatmapWeekHour } from "@/lib/demo"; // seu mock já criado

type Bin = { weekday: number; hour: number; count: number };
type Props = { demo?: boolean };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function HeatmapSemanaHoraCard({ demo = false }: Props) {
  const { range } = useDateRange();
  const [data, setData] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        if (demo) {
          // mock consistente por período (opcionalmente poderíamos semear por seed)
          const mock = demoHeatmapWeekHour();
          if (!abort) setData(mock);
        } else {
          const q = new URLSearchParams({ from: range.from, to: range.to });
          const res = await fetchJSON(`/api/heatmap/week-hour?${q.toString()}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          // esperamos algo como: [{ weekday: 0..6, hour: 0..23, count }]
          if (!abort) setData(Array.isArray(res) ? (res as Bin[]) : []);
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message ?? "erro ao carregar heatmap");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [range.from, range.to, demo]);

  const { min, max } = useMemo(() => {
    let mn = Number.POSITIVE_INFINITY;
    let mx = 0;
    for (const b of data) {
      mn = Math.min(mn, b.count);
      mx = Math.max(mx, b.count);
    }
    if (!isFinite(mn)) mn = 0;
    return { min: mn, max: mx };
  }, [data]);

  const grid = useMemo(() => {
    // monta matriz 7 x 24 (1 linha por weekday)
    const rows: Bin[][] = Array.from({ length: 7 }, (_, wd) =>
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
          <span className="text-xs text-gray-500">
            {range.from} → {range.to}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {loading ? "Carregando…" : err ? "Erro" : "OK"}
          {demo && <span className="ml-2 px-1.5 py-0.5 border rounded">demo</span>}
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600 mb-2">
          {err} — verifique token/401 e backend.
        </div>
      )}

      <div className="overflow-x-auto">
        {/* Cabeçalho com horas 0..23 */}
        <div className="min-w-[960px]">
          <div className="grid" style={{ gridTemplateColumns: `100px repeat(24, 1fr)` }}>
            <div />{/* canto vazio */}
            {Array.from({ length: 24 }, (_, h) => (
              <div key={`h-${h}`} className="text-[11px] text-center text-gray-600 pb-1">
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Linhas por dia da semana */}
          {grid.map((row, rIdx) => (
            <div
              key={`row-${rIdx}`}
              className="grid items-center"
              style={{ gridTemplateColumns: `100px repeat(24, 1fr)` }}
            >
              <div className="text-sm text-gray-700 py-1 pr-2">{WEEKDAYS[rIdx]}</div>
              {row.map((cell) => {
                const v = cell.count ?? 0;
                const intensity = max > min ? (v - min) / (max - min) : 0;
                // mapeia 0..1 → light → dark (usando HSL, sem libs)
                const bg = `hsl(220deg 90% ${92 - Math.round(intensity * 52)}%)`;

                return (
                  <div
                    key={`c-${cell.weekday}-${cell.hour}`}
                    title={`${WEEKDAYS[cell.weekday]} ${String(cell.hour).padStart(2, "0")}h — ${v}`}
                    className="h-8 border-[0.5px] border-gray-200"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legenda simples */}
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
