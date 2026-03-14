import { useEffect, useState } from "react";
import { usePeriod } from "@/context/PeriodContext";
import {
  fetchMemberRanking,
  type MemberRankingItem,
} from "@/lib/api";

export default function MemberRankingCard() {
  const { from, to } = usePeriod();
  const [data, setData] = useState<MemberRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchMemberRanking({ from, to });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!abort) setData(list);
      } catch (e: unknown) {
        if (!abort) {
          setErr(e instanceof Error ? e.message : "Erro ao carregar ranking");
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

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">
          Ranking de engajamento
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
        <ol className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <li className="py-3 text-sm text-gray-500">
              Nenhum check-in no período.
            </li>
          ) : (
            data.map((item, i) => (
              <li
                key={item.userId}
                className="flex items-center justify-between py-2 first:pt-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 w-6">
                    {i + 1}º
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm text-indigo-600 font-medium">
                  {item.checkinCount} {item.checkinCount === 1 ? "check-in" : "check-ins"}
                </span>
              </li>
            ))
          )}
        </ol>
      )}
    </div>
  );
}
