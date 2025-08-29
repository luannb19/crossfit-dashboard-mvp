import { useEffect, useState } from "react";
import api from "../api";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function OcupacaoPorDiaCard({ from, to }: { from?: string; to?: string }) {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const q = new URLSearchParams({ from: from ?? "", to: to ?? "" });
      const res = await api.get(`/analytics/ocupacao-por-dia?${q}`);
      setData(res.data?.series ?? []);
    })();
  }, [from, to]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h2 className="font-semibold mb-2">Ocupação por dia</h2>
      <div className="h-72">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Line type="monotone" dataKey="ocupacao" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
