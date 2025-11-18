// src/routes/frequencia.ts
import { Router, Request, Response } from "express";
import { auth } from "../middleware/auth";
import { frequenciaQuerySchema } from "../schemas/frequencia";
import { getFrequencia } from "../repos/frequenciaRepo";

const router = Router();

type GroupBy = "day" | "week" | "month";

/** Decide se deve usar o caminho de DB. */
function shouldUseDb() {
  const v = (process.env.USE_FREQ_DB ?? "").toLowerCase();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return !!process.env.DATABASE_URL; // padrão: se há DATABASE_URL, usa DB
}

/** Helpers de mock/zero-fill */
function enumerateDays(from: Date, to: Date) {
  const out: Array<{ date: string; presencas: number }> = [];
  const d = new Date(from);
  while (d <= to) {
    out.push({ date: d.toISOString().slice(0, 10), presencas: 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function addStep(d: Date, groupBy: GroupBy) {
  const nd = new Date(d);
  if (groupBy === "day") nd.setDate(nd.getDate() + 1);
  else if (groupBy === "week") nd.setDate(nd.getDate() + 7);
  else nd.setMonth(nd.getMonth() + 1);
  return nd;
}

function alignStart(d: Date, groupBy: GroupBy) {
  const nd = new Date(d);
  if (groupBy === "week") {
    // alinhar para segunda-feira (como date_trunc('week') no Postgres)
    const dow = nd.getDay(); // 0=dom,1=seg,...6=sab
    const delta = (dow + 6) % 7; // seg=0
    nd.setDate(nd.getDate() - delta);
  } else if (groupBy === "month") {
    nd.setDate(1);
  }
  return nd;
}

function enumeratePeriods(from: Date, to: Date, groupBy: GroupBy) {
  const out: string[] = [];
  let d = alignStart(from, groupBy);
  while (d <= to) {
    out.push(d.toISOString().slice(0, 10));
    d = addStep(d, groupBy);
  }
  return out;
}

/**
 * GET /api/frequencia
 * Query: from, to, groupBy, classId?, alunoId?, limit?
 */
router.get(
  "/",
  auth(["GESTOR", "COACH"]),
  async (req: Request, res: Response) => {
    const parsed = frequenciaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        details: parsed.error.flatten(),
      });
    }

    // Coerção defensiva caso o schema retorne string em vez de Date
    const groupBy = (parsed.data.groupBy ?? "day") as GroupBy;
    const from: Date =
      parsed.data.from instanceof Date
        ? parsed.data.from
        : new Date(parsed.data.from);
    const to: Date =
      parsed.data.to instanceof Date
        ? parsed.data.to
        : new Date(parsed.data.to);
    const { classId, alunoId, limit } = parsed.data;

    if (shouldUseDb()) {
      try {
        const db = await getFrequencia({
          from: from.toISOString(),
          to: to.toISOString(),
          groupBy,
          classId,
          alunoId,
          limit,
        });

        // zero-fill para garantir série contínua
        const buckets = enumeratePeriods(from, to, groupBy).slice(0, limit);
        const map = new Map(
          db.series.map((p: { date: string; value: number }) => [
            p.date,
            p.value,
          ]),
        );
        const data = buckets.map((date) => ({
          date,
          presencas: map.get(date) ?? 0,
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
        if (process.env.NODE_ENV !== "test") {
          console.error("[/frequencia] DB fallback:", e);
        }
        // cai para o mock abaixo
      }
    }

    // Mock (fallback / modo demo)
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
  },
);

export default router;
