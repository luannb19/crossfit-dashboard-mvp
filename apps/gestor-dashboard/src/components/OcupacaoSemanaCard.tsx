import { useEffect, useState } from "react";
import { fetchHeatmap } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Row = { weekday: string; avg: number };

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]; // dow 1..7

export default function OcupacaoSemanaCard({ from, to }: { from?: string; to?: string }) {
  const [data, setData] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        // chama /api/heatmap/week-hour (retorna bins 7x24)
        const resp = await fetchHeatmap({
          from: from ?? "2025-01-01",
          to:   to   ?? "2025-01-31",
        });

        // agrega por dia da semana: média por hora (soma/24)
        const sums = Array(7).fill(0);
        for (const b of resp.data) {
          // dow: 1..7 (1=Seg ... 7=Dom)
          sums[b.dow - 1] += b.presencas;
        }
        const avgs = sums.map(s => s / 24);

        // normaliza 0..1 para o eixo Y do gráfico (ou use valor absoluto, ver nota abaixo)
        const maxAvg = Math.max(1, ...avgs);
        const rows: Row[] = avgs.map((v, i) => ({
          weekday: WEEKDAY_LABELS[i],
          avg: maxAvg ? v / maxAvg : 0,
        }));

        setData(rows);
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar ocupação por dia da semana");
        setData([]);
      }
    })();
  }, [from, to]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h2 className="font-semibold mb-2">Ocupação média por dia da semana</h2>
      {err ? <div className="text-red-600 text-sm">Erro: {err}</div> : null}
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="weekday" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="avg" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

