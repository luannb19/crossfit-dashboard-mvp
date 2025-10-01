import { useEffect, useMemo, useState } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { fetchJSON, getToken } from "@/lib/api";
import { demoOcupacaoDia } from "@/lib/demo";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Point = { date: string; presencas: number };

export default function OcupacaoDiaCard({ demo = false }: { demo?: boolean }) {
  const { range } = useDateRange();
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (demo) {
          const mock = demoOcupacaoDia(range.from, range.to);
          if (!abort) setData(mock);
        } else {
          // backend estável informou /frequencia; usamos groupBy=day
          const q = new URLSearchParams({ from: range.from, to: range.to, groupBy: "day" });
          const res = await fetchJSON(`/frequencia?${q.toString()}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          // formatos aceitos:
          // 1) [{ date: "YYYY-MM-DD", presencas: number }, ...]
          // 2) { series: [...] }  -> normalizamos
          const arr: any[] = Array.isArray(res) ? res : Array.isArray(res?.series) ? res.series : [];
          const normalized: Point[] = arr.map((d: any) => ({
            date: (d.date ?? d.day ?? d.dt ?? "").slice(0, 10),
            presencas: Number(d.presencas ?? d.count ?? 0),
          }));
          if (!abort) setData(normalized);
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message ?? "erro ao carregar ocupação");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [range.from, range.to, demo]);

  const maxY = useMemo(() => Math.max(10, ...data.map((d) => d.presencas || 0)), [data]);

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Ocupação por dia</h2>
          <span className="text-xs text-gray-500">{range.from} → {range.to}</span>
        </div>
        <div className="text-xs text-gray-500">
          {loading ? "Carregando…" : err ? "Erro" : "OK"}
          {demo && <span className="ml-2 px-1.5 py-0.5 border rounded">demo</span>}
        </div>
      </div>

      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              minTickGap={20}
            />
            <YAxis
              domain={[0, Math.ceil(maxY * 1.1)]}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: any) => [`${v} presenças`, "Ocupação"]}
              labelFormatter={(l: any) => `Dia ${l}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="presencas"
              name="Ocupação"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* tabela compacta opcional abaixo do gráfico */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-1 pr-2">Data</th>
              <th className="py-1">Presenças</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 && !loading && !err && (
              <tr><td colSpan={2} className="py-2 text-gray-500">Sem dados no período.</td></tr>
            )}
            {data.map((d) => (
              <tr key={d.date}>
                <td className="py-1 pr-2">{d.date}</td>
                <td className="py-1">{d.presencas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
