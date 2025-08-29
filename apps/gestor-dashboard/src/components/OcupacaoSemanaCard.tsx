import { useEffect, useState } from "react";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function OcupacaoSemanaCard({ from, to }: { from?: string; to?: string }) {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const q = new URLSearchParams({ from: from ?? "", to: to ?? "" });
      const res = await api.get(`/analytics/weekday-media?${q}`);
      setData(res.data?.medias ?? []);
    })();
  }, [from, to]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h2 className="font-semibold mb-2">Ocupação média por dia da semana</h2>
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
