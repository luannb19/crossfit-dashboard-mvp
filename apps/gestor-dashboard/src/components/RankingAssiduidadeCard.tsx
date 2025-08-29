import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRankingAssiduidade } from "../hooks/useRankingAssiduidade";

type Props = { from?: string; to?: string; limit?: number; className?: string };

export default function RankingAssiduidadeCard({ from, to, limit = 10, className }: Props) {
  const { data, loading, error } = useRankingAssiduidade({ from, to, limit });

  return (
    <div className={`rounded-2xl shadow p-4 bg-white/70 backdrop-blur ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Ranking de Assiduidade</h3>
        <span className="text-xs text-gray-500">{from && to ? `Período: ${from} → ${to}` : "Últimos 30 dias"}</span>
      </div>

      {loading && <div className="text-sm text-gray-500">Carregando...</div>}
      {error && <div className="text-sm text-red-600">Erro: {error}</div>}
      {!loading && !error && (!data || data.length === 0) && (
        <div className="text-sm text-gray-500">Sem dados para o período.</div>
      )}

      {!loading && !error && data?.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 12, right: 12, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="presencas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
