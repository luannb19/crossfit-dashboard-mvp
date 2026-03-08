import { useState } from "react";
import HeatmapSemanaHoraCard from "@/components/HeatmapSemanaHoraCard";
import RankingAssiduidadeCard from "@/components/RankingAssiduidadeCard";
import OcupacaoPorDiaCard from "@/components/OcupacaoPorDiaCard";
import ManagerSummaryCard from "@/components/ManagerSummaryCard";
import DevLogin from "@/components/DevLogin";
import BillingSection from "@/components/BillingSection";
import AdminBillingPanel from "@/components/AdminBillingPanel";

import { PeriodProvider } from "@/context/PeriodContext";
import PeriodSelector from "@/components/PeriodSelector";

// NOVO IMPORT
import TreinosPage from "@/pages/TreinosPage";

export default function App() {
  // Página atual: "dashboard" ou "treinos"
  const [page, setPage] = useState<"dashboard" | "treinos">("dashboard");

  // Modo de demonstração (já existente)
  const [demo, setDemo] = useState<boolean>(true);

  return (
    <PeriodProvider>
      <div className="min-h-dvh font-sans text-gray-900">
        <div className="mx-auto max-w-6xl p-4 space-y-4">
          {/* HEADER */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">InsightFlow — Dashboard</h1>
              <span className="text-xs px-2 py-0.5 rounded-full border">beta</span>

              {/* NOVO: botões de navegação */}
              <div className="flex items-center gap-3 ml-6">
                <button
                  onClick={() => setPage("dashboard")}
                  className={`text-sm px-2 py-1 rounded ${
                    page === "dashboard" ? "font-bold underline" : "opacity-60"
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => setPage("treinos")}
                  className={`text-sm px-2 py-1 rounded ${
                    page === "treinos" ? "font-bold underline" : "opacity-60"
                  }`}
                >
                  Treinos
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PeriodSelector />
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

          {/* Painel dev para token /auth/me */}
          {import.meta.env.DEV && <DevLogin />}

          {/* CONTEÚDO PRINCIPAL */}
          <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* --- DASHBOARD ORIGINAL --- */}
            {page === "dashboard" && (
              <>
                {/* Manager summary: one-glance KPIs */}
                <section className="lg:col-span-3">
                  <ManagerSummaryCard />
                </section>
                {/* Billing: largura total */}
                <section className="lg:col-span-3">
                  <BillingSection />
                </section>

                {/* Billing admin (DEV only) */}
                {import.meta.env.DEV && (
                  <section className="lg:col-span-3">
                    <AdminBillingPanel />
                  </section>
                )}

                {/* Heatmap: largura total */}
                <section className="lg:col-span-3">
                  <HeatmapSemanaHoraCard demo={demo} />
                </section>

                {/* Ranking: 1 coluna */}
                <section className="lg:col-span-1">
                  <RankingAssiduidadeCard demo={demo} />
                </section>

                {/* Ocupação por dia: 2 colunas */}
                <section className="lg:col-span-2">
                  <OcupacaoPorDiaCard demo={demo} />
                </section>
              </>
            )}

            {/* --- NOVO: PÁGINA DE TREINOS --- */}
            {page === "treinos" && (
              <section className="lg:col-span-3">
                <TreinosPage />
              </section>
            )}
          </main>
        </div>
      </div>
    </PeriodProvider>
  );
}
