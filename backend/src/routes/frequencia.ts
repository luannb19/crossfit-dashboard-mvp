import { Router } from "express";
import { frequenciaQuerySchema } from "../schemas/frequencia";

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

frequenciaRouter.get("/", (req, res) => {
  const parsed = frequenciaQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Parâmetros inválidos",
      details: parsed.error.flatten(),
    });
  }

  const { from, to, groupBy, classId, alunoId, limit } = parsed.data;
  const data = enumerateDays(from, to).slice(0, limit);

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
    meta: { source: "demo", count: data.length },
  });
});
