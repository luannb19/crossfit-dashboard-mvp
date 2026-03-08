import { useEffect, useState } from "react";
import { usePeriod } from "@/context/PeriodContext";
import { fetchSummary, type SummaryResponse } from "@/lib/api";

export default function ManagerSummaryCard() {
  const { from, to } = usePeriod();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchSummary({ from, to });
        if (!abort) setData(res);
      } catch (e: unknown) {
        if (!abort) setErr(e instanceof Error ? e.message : "Erro ao carregar resumo");
        if (!abort) setData(null);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [from, to]);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <h2 className="font-semibold text-gray-700 mb-2">Resumo do período</h2>
        <p className="text-sm text-gray-500">Carregando…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="border border-red-200 rounded-xl p-4 bg-red-50">
        <h2 className="font-semibold text-gray-700 mb-2">Resumo do período</h2>
        <p className="text-sm text-red-600">{err}</p>
      </div>
    );
  }

  if (!data) return null;

  const { occupancyPercent, totalCheckIns, memberCount, busiestDay, period } = data;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Resumo do período</h2>
        <span className="text-xs text-gray-500">{period.from} → {period.to}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-2xl font-bold text-indigo-600">{occupancyPercent}%</p>
          <p className="text-xs text-gray-500">Ocupação</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{totalCheckIns}</p>
          <p className="text-xs text-gray-500">Check-ins</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{memberCount}</p>
          <p className="text-xs text-gray-500">Alunos ativos</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-700">
            {busiestDay ?? "—"}
          </p>
          <p className="text-xs text-gray-500">Dia mais cheio</p>
        </div>
      </div>
      {busiestDay && (
        <p className="text-sm text-gray-600 mt-2">
          Dica: {busiestDay} foi o dia com mais presenças. Considere abrir mais horários nesse dia.
        </p>
      )}
    </div>
  );
}
