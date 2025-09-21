import { Router } from "express";
import { frequenciaQuerySchema } from "../schemas/frequencia";
import { getFrequencia } from "../repos/frequenciaRepo";

export const frequenciaRouter = Router();

function enumerateDays(from: Date, to: Date) {
  const out: Array<{ date: string; presencas: number }> = [];
  const d = new Date(from);
  while (d <= to) {
    out.push({ date: d.toISOString().slice(0, 10), presencas: 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

frequenciaRouter.get("/", async (req, res) => {
  const parsed = frequenciaQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Parâmetros inválidos",
      details: parsed.error.flatten(),
    });
  }

  const { from, to, groupBy, classId, alunoId, limit } = parsed.data;

  // Gate por env: se ligado, usa DB e mantém o MESMO shape { filters, data, meta }
  if (process.env.USE_FREQ_DB === "1") {
    try {
      const db = await getFrequencia({
        from: from.toISOString(),
        to: to.toISOString(),
        groupBy,
        classId,
        alunoId,
        limit,
      });

      const data = db.series.map((p) => ({
        date: p.date,
        presencas: p.value,
      }));

      return res.json({
        filters: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          groupBy,
          classId: classId ?? null,
          alunoId: alunoId ?? null,
          limit,
        },
        data,
        meta: { source: "db", count: data.length },
      });
    } catch (e) {
      // fallback seguro para mock se o DB falhar
      if (process.env.NODE_ENV !== "test") {
        console.error(e);
      }
      // segue para o mock abaixo
    }
  }

  // Mock atual (mesmo shape já usado no frontend)
  const mock = enumerateDays(from, to).slice(0, limit);
  return res.json({
    filters: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      groupBy,
      classId: classId ?? null,
      alunoId: alunoId ?? null,
      limit,
    },
    data: mock,
    meta: { source: "demo", count: mock.length },
  });
});
