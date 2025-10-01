import { useEffect, useState } from "react";
import { fetchRanking } from "../lib/api";

type Params = { from?: string; to?: string; limit?: number };

type Row = { nome: string; presencas: number };

export function useRankingAssiduidade({ from, to, limit = 10 }: Params) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // defaults compatíveis com o backend
        const pFrom = from ?? new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
        const pTo   = to   ?? new Date().toISOString().slice(0, 10);

        const resp = await fetchRanking({ from: pFrom, to: pTo, limit });
        // mapeia alunoId -> nome (até termos o nome real do aluno)
        const rows: Row[] = resp.data.map((r) => ({
          nome: r.alunoId,
          presencas: r.presencas,
        }));
        setData(rows);
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar ranking");
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to, limit]);

  return { data, loading, error };
}
