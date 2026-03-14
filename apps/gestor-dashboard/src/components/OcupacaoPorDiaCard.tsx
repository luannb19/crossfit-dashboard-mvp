// apps/gestor-dashboard/src/components/OcupacaoPorDiaCard.tsx
import { useEffect, useMemo, useState } from "react";
import { usePeriod } from "@/context/PeriodContext";
import { fetchJSON } from "@/lib/api";
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

type Point = { date: string; presencas: number; ocupacaoPercent: number };

// ---------------- helpers ----------------
function toInt(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function isObj(x: any): x is Record<string, any> {
  return x !== null && typeof x === "object";
}

// Extrai presença + ocupação%
function extractOcupacao(resp: any): Point[] {
  if (!resp) return [];

  const top = resp;
  const nested = isObj(resp?.data) ? resp.data : {};

  const normal = (obj: any) => ({
    date: String(
      obj.date ?? obj.day ?? obj.d ?? obj.x ?? ""
    ),
    presencas: toInt(obj.presencas ?? obj.value ?? obj.ocupacao ?? obj.y),
    ocupacaoPercent: toInt(
      obj.ocupacaoPercent ??
        obj.percent ??
        (obj.ocupacaoRatio ? obj.ocupacaoRatio * 100 : 0)
    ),
  });

  // 1) payload já em formato de tabela
  if (Array.isArray(top.data) && top.data.every(isObj)) {
    return top.data.map(normal);
  }
  if (Array.isArray(nested.data) && nested.data.every(isObj)) {
    return nested.data.map(normal);
  }

  if (Array.isArray(top.items) && top.items.every(isObj)) {
    return top.items.map(normal);
  }
  if (Array.isArray(nested.items) && nested.items.every(isObj)) {
    return nested.items.map(normal);
  }

  // 2) series
  const series =
    (Array.isArray(top.series) && top.series) ||
    (Array.isArray(nested.series) && nested.series) ||
    [];
  if (series.length && series.every(isObj)) {
    return series.map(normal);
  }

  // 3) points (x, y)
  const points =
    (Array.isArray(top.points) && top.points) ||
    (Array.isArray(nested.points) && nested.points) ||
    [];
  if (points.length && points.every(isObj)) {
    return points.map(normal);
  }

  // 4) fallback labels + values
  const labels: string[] =
    (Array.isArray(top.labels) && top.labels) ||
    (Array.isArray(nested.labels) && nested.labels) ||
    [];

  const values: number[] =
    (Array.isArray(top.data) && top.data.every((x: any) => typeof x === "number") && top.data) ||
    (Array.isArray(nested.values) && nested.values.every((x: any) => typeof x === "number") && nested.values) ||
    (Array.isArray(nested.data) && nested.data.every((x: any) => typeof x === "number") && nested.data) ||
    [];

  if (labels.length && values.length && labels.length === values.length) {
    return labels.map((d, i) => ({
      date: String(d),
      presencas: toInt(values[i]),
      ocupacaoPercent: 0,
    }));
  }

  return [];
}

// -------------------------------------------

export default function OcupacaoPorDiaCard({ demo = false }: { demo?: boolean }) {
  const { from, to } = usePeriod();
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
          const mock = demoOcupacaoDia(from, to).map((x) => ({
            ...x,
            ocupacaoPercent: 0,
          }));
          if (!abort) setData(mock);
        } else {
          const q = new URLSearchParams({ from, to }).toString();
          const res = await fetchJSON<any>(`/api/ocupacao/dia?${q}`);
          const normalized = extractOcupacao(res);
          if (!abort) setData(Array.isArray(normalized) ? normalized : []);
        }
      } catch (e: any) {
        if (!abort) {
          setErr(e?.message ?? "erro ao carregar ocupação");
          setData([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [from, to, demo]);

  const maxY = useMemo(
    () => Math.max(10, ...data.map((d) => d.presencas || 0)),
    [data]
  );

  const maxPercent = useMemo(
    () => Math.max(100, ...data.map((d) => d.ocupacaoPercent || 0)),
    [data]
  );

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Ocupação por dia</h2>
          <span className="text-xs text-gray-500">
            {from} → {to}
          </span>
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
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
            
            {/* Eixo da esquerda = presenças */}
            <YAxis
              yAxisId="left"
              domain={[0, Math.ceil(maxY * 1.1)]}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />

            {/* Eixo da direita = porcentagem */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, Math.ceil(maxPercent)]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
            />

            <Tooltip
              formatter={(v: any, name: any) =>
                name === "Ocupação (%)"
                  ? [`${v}%`, name]
                  : [`${v} presenças`, name]
              }
              labelFormatter={(l: any) => `Dia ${l}`}
            />
            <Legend />

            {/* Linha de presenças */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="presencas"
              name="Presenças"
              dot={false}
              strokeWidth={2}
            />

            {/* Linha de porcentagem */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ocupacaoPercent"
              name="Ocupação (%)"
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* tabela compacta */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-1 pr-2">Data</th>
              <th className="py-1">Presenças</th>
              <th className="py-1">Ocupação (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 && !loading && !err && (
              <tr>
                <td colSpan={3} className="py-2 text-gray-500">
                  Sem dados no período.
                </td>
              </tr>
            )}
            {data.map((d) => (
              <tr key={d.date}>
                <td className="py-1 pr-2">{d.date}</td>
                <td className="py-1">{d.presencas}</td>
                <td className="py-1">{d.ocupacaoPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
