import { useEffect, useMemo, useState } from "react";
import { usePeriod } from "@/context/PeriodContext";
import {
  fetchOccupancyHeatmap,
  type OccupancyHeatmapCell,
} from "@/lib/api";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function OccupancyHeatmap() {
  const { from, to } = usePeriod();
  const [data, setData] = useState<OccupancyHeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchOccupancyHeatmap({ from, to });
        const cells = Array.isArray(res?.data) ? res.data : [];
        if (!abort) setData(cells);
      } catch (e: unknown) {
        if (!abort) {
          setErr(e instanceof Error ? e.message : "Erro ao carregar heatmap");
          setData([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [from, to]);

  const grid = useMemo(() => {
    const map = new Map(
      data.map((c) => [`${c.dayOfWeek}-${c.hour}`, c])
    );
    const rows: OccupancyHeatmapCell[][] = [];
    for (let dow = 0; dow < 7; dow++) {
      const row: OccupancyHeatmapCell[] = [];
      for (let h = 0; h < 24; h++) {
        const key = `${dow}-${h}`;
        row.push(
          map.get(key) ?? {
            dayOfWeek: dow,
            hour: h,
            checkins: 0,
            capacity: 0,
            occupancyPercent: 0,
          }
        );
      }
      rows.push(row);
    }
    return rows;
  }, [data]);

  const maxPercent = useMemo(
    () => Math.max(0, ...data.map((c) => c.occupancyPercent)),
    [data]
  );

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">
          Ocupação por dia e hora
        </h2>
        <span className="text-xs text-gray-500">
          {from} → {to}
        </span>
      </div>
      {loading && (
        <div className="text-sm text-gray-500 py-4">Carregando…</div>
      )}
      {err && (
        <div className="text-sm text-red-600 py-2">{err}</div>
      )}
      {!loading && !err && (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div
                className="grid mb-1"
                style={{ gridTemplateColumns: "72px repeat(24, minmax(0, 1fr))" }}
              >
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="text-[10px] text-center text-gray-500 truncate"
                  >
                    {h}h
                  </div>
                ))}
              </div>
              {grid.map((row, dow) => (
                <div
                  key={dow}
                  className="grid gap-px"
                  style={{
                    gridTemplateColumns:
                      "72px repeat(24, minmax(0, 1fr))",
                  }}
                >
                  <div className="text-sm text-gray-700 py-1 pr-2 flex items-center">
                    {WEEKDAYS[dow]}
                  </div>
                  {row.map((cell) => {
                    const pct = cell.occupancyPercent;
                    const intensity =
                      maxPercent > 0 ? pct / maxPercent : 0;
                    const bg =
                      cell.capacity === 0
                        ? "hsl(0 0% 96%)"
                        : `hsl(220 70% ${92 - Math.round(intensity * 55)}%)`;
                    return (
                      <div
                        key={`${cell.dayOfWeek}-${cell.hour}`}
                        className="h-7 border border-gray-100 rounded-sm min-w-0"
                        style={{ background: bg }}
                        title={`${WEEKDAYS[cell.dayOfWeek]} ${cell.hour}h — ${pct}% (${cell.checkins}/${cell.capacity})`}
                      >
                        {pct > 0 && (
                          <span className="text-[9px] text-gray-600 block text-center leading-7">
                            {pct}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>0%</span>
            <div
              className="h-2 w-12 rounded"
              style={{ background: "hsl(220 70% 92%)" }}
            />
            <div
              className="h-2 w-12 rounded"
              style={{ background: "hsl(220 70% 60%)" }}
            />
            <div
              className="h-2 w-12 rounded"
              style={{ background: "hsl(220 70% 40%)" }}
            />
            <span>{maxPercent}%</span>
          </div>
        </>
      )}
    </div>
  );
}
