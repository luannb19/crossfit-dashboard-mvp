import * as React from "react";
import { fetchFrequencia, GroupBy, FrequenciaPoint } from "../lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

export function FrequenciaCard() {
  const [from, setFrom] = React.useState(fmtDateInput(firstOfMonth));
  const [to, setTo] = React.useState(fmtDateInput(today));
  const [groupBy, setGroupBy] = React.useState<GroupBy>("day");
  const [classId, setClassId] = React.useState("");
  const [alunoId, setAlunoId] = React.useState("");
  const [limit, setLimit] = React.useState(90);

  const [data, setData] = React.useState<FrequenciaPoint[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<{ source: "demo" | "db"; count: number } | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFrequencia({
        from,
        to,
        groupBy,
        classId: classId || undefined,
        alunoId: alunoId || undefined,
        limit,
      });
      setData(res.data);
      setMeta(res.meta);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar");
      setData(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 border rounded-2xl shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Group by</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="border rounded px-2 py-1"
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Class ID (opcional)</label>
          <input
            placeholder="c1..."
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Aluno ID (opcional)</label>
          <input
            placeholder="a1..."
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Limit</label>
          <input
            type="number"
            min={1}
            max={365}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
        </div>
        <button
          onClick={run}
          className="ml-auto border rounded px-3 py-2 hover:bg-gray-50"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-4">
        {loading && <div>Carregando…</div>}
        {error && (
          <div className="text-red-600">
            Erro: {error} <button onClick={run}>Tentar novamente</button>
          </div>
        )}
        {!loading && !error && data && (
          <>
            <div className="text-sm text-gray-600 mb-2">
              Fonte: <b>{meta?.source}</b> • {data.length} pontos
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="presencas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
