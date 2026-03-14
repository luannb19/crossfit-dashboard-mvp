import React, { useEffect, useState } from "react";

type Workout = {
  id: string;
  boxId: string;
  date: string;
  title: string;
  description?: string;
  category: string;
  videoUrl?: string;
};

export default function TreinosPage() {
  const [treinos, setTreinos] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // aqui por enquanto boxId é fixo
        const res = await fetch(
          "http://localhost:4000/api/workouts?from=2025-01-01&to=2025-12-31&boxId=superforce"
        );
        const data = await res.json();
        setTreinos(data);
      } catch (err) {
        console.error("Erro ao carregar treinos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Treinos</h1>

      <button
        style={{
          marginTop: 16,
          padding: "10px 16px",
          background: "#4c6ef5",
          color: "white",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        Criar Treino
      </button>

      <div style={{ marginTop: 24 }}>
        {loading && <p>Carregando...</p>}

        {!loading && treinos.length === 0 && <p>Nenhum treino encontrado.</p>}

        {!loading && treinos.length > 0 && (
          <ul>
            {treinos.map((t) => (
              <li key={t.id} style={{ marginBottom: 12 }}>
                <strong>{new Date(t.date).toLocaleDateString("pt-BR")}:</strong>{" "}
                {t.title} — <em>{t.category}</em>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
