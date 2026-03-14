import React, { useEffect, useState, useCallback } from "react";
import CreateWorkoutModal from "@/components/CreateWorkoutModal";

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
  const [showModal, setShowModal] = useState(false);

  // Função de carregamento reutilizável
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
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
  }, []);

  // Carrega só uma vez no início
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Treinos</h2>

      <button
        className="px-4 py-2 rounded bg-indigo-600 text-white"
        onClick={() => setShowModal(true)}
      >
        Criar Treino
      </button>

      <div className="mt-6">
        {loading && <p>Carregando...</p>}

        {!loading && treinos.length === 0 && <p>Nenhum treino encontrado.</p>}

        {!loading && treinos.length > 0 && (
          <ul className="space-y-2">
            {treinos.map((t) => (
              <li key={t.id} className="border p-3 rounded">
                <strong>{new Date(t.date).toLocaleDateString()}</strong>
                <div>{t.title}</div>
                <em className="text-sm text-gray-500">{t.category}</em>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal fora da lista */}
      {showModal && (
        <CreateWorkoutModal
          onClose={() => setShowModal(false)}
          onCreated={loadData} // Agora recarrega dinamicamente
        />
      )}
    </div>
  );
}

