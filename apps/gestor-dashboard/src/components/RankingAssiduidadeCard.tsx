import { useEffect, useState } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { fetchJSON, getToken } from "@/lib/api";
import { demoRankingAssiduidade } from "@/lib/demo";

type Item = {
  pos: number;
  memberId: string;
  nome: string;
  presencas: number;
};

export default function RankingAssiduidadeCard({ demo = false }: { demo?: boolean }) {
  const { range } = useDateRange();
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (demo) {
          const mock = demoRankingAssiduidade();
          if (!abort) setData(mock);
        } else {
          const q = new URLSearchParams({ from: range.from, to: range.to });
          const res = await fetchJSON(`/api/assiduidade/ranking?${q.toString()}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          // back esperado: [{ memberId, nome, presencas }, ...]; ordenamos e numeramos
          const arr = Array.isArray(res) ? res as Omit<Item, "pos">[] : [];
          const sorted = arr
            .sort((a, b) => (b.presencas ?? 0) - (a.presencas ?? 0))
            .map((it, i) => ({ ...it, pos: i + 1 }));
          if (!abort) setData(sorted);
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message ?? "erro ao carregar ranking");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [range.from, range.to, demo]);

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Ranking de Assiduidade</h2>
          <span className="text-xs text-gray-500">{range.from} → {range.to}</span>
        </div>
        <div className="text-xs text-gray-500">
          {loading ? "Carregando…" : err ? "Erro" : "OK"}
          {demo && <span className="ml-2 px-1.5 py-0.5 border rounded">demo</span>}
        </div>
      </div>

      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

      <ol className="divide-y">
        {data.length === 0 && !loading && !err && (
          <li className="py-3 text-sm text-gray-500">Sem dados no período.</li>
        )}
        {data.map((row) => (
          <li key={row.memberId} className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold">
                {row.pos}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{row.nome}</span>
                <span className="text-xs text-gray-500">ID: {row.memberId}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="font-semibold">{row.presencas}</span> presenças
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
