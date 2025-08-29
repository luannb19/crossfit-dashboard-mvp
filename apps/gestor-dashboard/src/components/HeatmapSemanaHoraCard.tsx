import { useMemo } from "react";
import { useHeatmapSemanaHora } from "../hooks/useHeatmapSemanaHora";


type Props = {
  from?: string;
  to?: string;
  hoursRange?: [number, number]; // ex.: [6, 22]
  className?: string;
};

// labels dos dias (0=Dom)
const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function HeatmapSemanaHoraCard({
  from,
  to,
  hoursRange = [6, 22],
  className,
}: Props) {
  const { data, loading, error, stats } = useHeatmapSemanaHora({ from, to });

  const hours = useMemo(() => {
    const [hStart, hEnd] = hoursRange;
    const arr: number[] = [];
    for (let h = hStart; h <= hEnd; h++) arr.push(h);
    return arr;
  }, [hoursRange]);

  // normaliza 0..1
  const scale = (v: number) => {
    const { min, max } = stats;
    if (max === min) return 0; // evita NaN
    return (v - min) / (max - min);
  };

  // cor baseada na intensidade (sem especificar cores exatas no chart; aqui é CSS inline do card)
  const colorFor = (v: number) => {
    const t = scale(v); // 0..1
    // interpolação simples de "transparente" para uma cor sólida neutra (usaremos apenas opacidade):
    const alpha = 0.12 + t * 0.88; // mantém algo visível mesmo p/ valores baixos
    // usa um cinza-azulado neutro
    return `rgba(31, 41, 55, ${alpha})`; // tailwind gray-800 com alpha
  };

  // cria um índice rápido: weekday-hour -> ocupacao
  const index = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data) {
      map.set(`${c.weekday}-${c.hour}`, c.ocupacao);
    }
    return map;
  }, [data]);

  return (
    <div className={`rounded-2xl shadow p-4 bg-white/70 backdrop-blur ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Heatmap — Semana × Hora</h3>
        <span className="text-xs text-gray-500">
          {from && to ? `Período: ${from} → ${to}` : "Últimos 30 dias"}
        </span>
      </div>

      {loading && <div className="text-sm text-gray-500">Carregando...</div>}
      {error && <div className="text-sm text-red-600">Erro: {error}</div>}

      {!loading && !error && (
        <div className="overflow-auto">
          {/* Header de horas */}
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${hours.length}, minmax(28px, 1fr))` }}>
            <div /> 
            {hours.map((h) => (
              <div key={`h-${h}`} className="text-xs text-gray-600 text-center py-1">
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Linhas por dia da semana */}
          {WEEK_LABELS.map((label, weekday) => (
            <div
              key={`row-${weekday}`}
              className="grid items-center"
              style={{ gridTemplateColumns: `80px repeat(${hours.length}, minmax(28px, 1fr))` }}
            >
              {/* label do dia */}
              <div className="text-xs text-gray-700 py-1">{label}</div>

              {/* células */}
              {hours.map((h) => {
                const v = index.get(`${weekday}-${h}`) ?? 0;
                return (
                  <div
                    key={`cell-${weekday}-${h}`}
                    title={`${label} ${String(h).padStart(2, "0")}:00 — ${v} presenças`}
                    className="m-0.5 rounded"
                    style={{
                      height: 24,
                      background: colorFor(v),
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* legenda simples */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500">Menor</span>
            <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-2" style={{ width: "100%", background: "linear-gradient(to right, rgba(31,41,55,0.12), rgba(31,41,55,1))" }} />
            </div>
            <span className="text-xs text-gray-500">Maior</span>
            <span className="text-xs text-gray-500 ml-2">
              (min={stats.min ?? 0}, max={stats.max ?? 0})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
