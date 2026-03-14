import React, { useState } from "react";

type Props = {
  onClose: () => void;
  onCreated: () => void; // callback para atualizar lista
};

const categories = ["METCON", "STRENGTH", "TECHNIQUE", "MOBILITY"];

export default function CreateWorkoutModal({ onClose, onCreated }: Props) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("METCON");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!date || !title) {
      alert("Data e título são obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId: "superforce",
          date,
          title,
          description,
          category,
        }),
    });

    if (!res.ok) throw new Error("Erro ao criar treino");
    alert("Treino criado com sucesso!");


    onCreated();  // Atualiza lista dinamicamente
    onClose();    // Fecha modal
  } catch (err) {
    alert("Erro ao criar o treino.");
    console.error(err);
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Criar Treino</h2>

        <div className="space-y-4">

          <div>
            <label className="text-sm">Data</label>
            <input
              type="date"
              className="w-full mt-1 p-2 border rounded"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Categoria</label>
            <select
              className="w-full mt-1 p-2 border rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Título</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Força – Deadlift 5x5"
            />
          </div>

          <div>
            <label className="text-sm">Descrição</label>
            <textarea
              className="w-full mt-1 p-2 border rounded"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do treino..."
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
