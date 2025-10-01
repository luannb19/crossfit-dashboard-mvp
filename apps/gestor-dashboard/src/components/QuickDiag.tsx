import { useEffect, useState } from "react"
import { fetchFrequencia, fetchRanking, fetchHeatmap } from "../lib/api"

export function QuickDiag() {
  const [log, setLog] = useState<string>("Testando...")

  useEffect(() => {
    (async () => {
      try {
        const [freq, rank, heat] = await Promise.all([
          fetchFrequencia({ from: "2025-01-01", to: "2025-01-05", groupBy: "day" }),
          fetchRanking({ from: "2025-01-01", to: "2025-01-05", limit: 10 }),
          fetchHeatmap({ from: "2025-01-01", to: "2025-01-05" }),
        ])
        setLog(
          [
            `OK frequencia: ${freq.data.length} pts (source=${freq.meta.source})`,
            `OK ranking: ${rank.data.length} itens`,
            `OK heatmap: ${heat.data.length} bins`,
          ].join(" | ")
        )
      } catch (e: any) {
        setLog(`Falhou: ${e?.message || e}`)
      }
    })()
  }, [])

  return (
    <div className="p-2 border rounded bg-white">
      <div className="text-sm text-gray-700">Diag:</div>
      <pre className="text-xs">{log}</pre>
    </div>
  )
}
