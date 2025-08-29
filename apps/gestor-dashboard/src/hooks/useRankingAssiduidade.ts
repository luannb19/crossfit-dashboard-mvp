import { useEffect, useState } from "react";
import axios from "axios";

type AlunoRank = { alunoId: string; nome: string; presencas: number };

export function useRankingAssiduidade(params?: { from?: string; to?: string; limit?: number }) {
  const [data, setData] = useState<AlunoRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL;
  const TOKEN = import.meta.env.VITE_GESTOR_TOKEN;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        const base = API.replace(/\/$/, "");
        const url = `${base}/analytics/assiduidade-top`;

        const res = await axios.get(url, {
          params: {
            from: params?.from,
            to: params?.to,
            limit: params?.limit ?? 10,
          },
          headers: { Authorization: `Bearer ${TOKEN}` },
        });

        if (!mounted) return;

        // Shape: { ranking: [{ userId, name, email, presencas }, ...] }
        const arr = res.data?.ranking ?? [];
        const items: AlunoRank[] = (Array.isArray(arr) ? arr : []).map((r: any) => ({
          alunoId: r.userId ?? r.alunoId ?? "",
          nome: r.name ?? r.nome ?? "",
          presencas: Number(r.presencas ?? r.count ?? 0),
        }));

        setData(items);
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? "Erro ao carregar ranking");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API, TOKEN, params?.from, params?.to, params?.limit]);

  return { data, loading, error };
}
