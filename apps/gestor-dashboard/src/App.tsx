import { useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import HeatmapSemanaHoraCard from "@/components/HeatmapSemanaHoraCard";
import RankingAssiduidadeCard from "@/components/RankingAssiduidadeCard";
import OcupacaoPorDiaCard from "@/components/OcupacaoPorDiaCard";
import DevLogin from "@/components/DevLogin";
import BillingSection from "@/components/BillingSection";

export default function App() {
  // Começa em DEMO para validar UI mesmo sem dados reais do backend
  const [demo, setDemo] = useState<boolean>(true);

  return (
    <div className="min-h-dvh font-sans text-gray-900">
      <div className="mx-auto max-w-6xl p-4 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">InsightFlow — Dashboard</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border">beta</span>
          </div>

          <div className="flex items-center gap-3">
            <DateRangePicker />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
              />
              Demo mode
            </label>
          </div>
        </header>

        {/* Painel para setar/limpar token e pingar /auth/me (só no ambiente de dev) */}
        {import.meta.env.DEV && <DevLogin />}

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 💳 Pagamentos (TEST) — ocupa a largura toda */}
          <section className="lg:col-span-3">
            <BillingSection />
          </section>

          {/* Heatmap ocupa a largura toda na primeira linha */}
          <section className="lg:col-span-3">
            <HeatmapSemanaHoraCard demo={demo} />
          </section>

          {/* Ranking em 1 coluna */}
          <section className="lg:col-span-1">
            <RankingAssiduidadeCard demo={demo} />
          </section>

          {/* Ocupação por dia em 2 colunas */}
          <section className="lg:col-span-2">
            <OcupacaoPorDiaCard demo={demo} />
          </section>
        </main>
      </div>
    </div>
  );
}
