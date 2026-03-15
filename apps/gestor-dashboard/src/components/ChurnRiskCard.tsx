import { useEffect, useState } from "react";
import {
  fetchChurnRisk,
  type ChurnRiskItem,
  type ChurnRiskResponse,
} from "@/lib/api";

const DEFAULT_DAYS = 30;

export default function ChurnRiskCard() {
  const [res, setRes] = useState<ChurnRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await fetchChurnRisk({ days: DEFAULT_DAYS, limit: 20 });
        if (!abort) setRes(data);
      } catch (e: unknown) {
        if (!abort) {
          setErr(e instanceof Error ? e.message : "Erro ao carregar membros em risco");
          setRes(null);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const noShowDays = res?.period?.noShowDays ?? 10;
  const baselinePeriodWeeks = res?.criteria?.baselinePeriodWeeks ?? 12;

  return (
    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50 shadow-sm">
      <div className="flex flex-col gap-1 mb-3">
        <h2 className="font-semibold text-gray-800">
          Membros em risco (churn)
        </h2>
        {res?.period && (
          <div className="text-xs text-gray-500 space-y-0.5">
            <div>Período baseline: últimas {baselinePeriodWeeks} semanas</div>
            <div>No-show: &gt;{noShowDays} dias sem check-in</div>
          </div>
        )}
      </div>
      {loading && (
        <div className="text-sm text-gray-500 py-4">Carregando…</div>
      )}
      {err && (
        <div className="text-sm text-red-600 py-2">{err}</div>
      )}
      {!loading && !err && res && (
        <>
          {res.data.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              Nenhum membro em risco no período.
            </p>
          ) : (
            <ol className="divide-y divide-amber-100">
              {res.data.map((item: ChurnRiskItem) => (
                <li
                  key={item.userId}
                  className="flex flex-col py-2 first:pt-0 gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {item.name}
                    </span>
                    <span className="text-sm font-medium text-amber-700">
                      −{item.dropPercent}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="text-gray-500">Baseline (sem): </span>
                    <span>{item.baselineCheckInsPerWeek != null ? item.baselineCheckInsPerWeek.toFixed(1) : "—"}</span>
                    <span className="text-gray-500 ml-1">· Atual (sem): </span>
                    <span>{item.currentCheckInsPerWeek.toFixed(1)}</span>
                    {item.daysSinceLastCheckIn != null && item.daysSinceLastCheckIn > noShowDays && (
                      <>
                        <span className="text-gray-500 ml-1">· Dias sem vir: </span>
                        <span className="text-amber-600 font-medium">{item.daysSinceLastCheckIn}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
