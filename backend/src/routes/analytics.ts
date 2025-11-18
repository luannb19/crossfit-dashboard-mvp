import { Router } from "express";
import { prisma } from "../lib/prisma";

const analyticsRouter = Router();

function sanitizeIdent(x: string) {
  return x.replace(/[^a-zA-Z0-9_"]/g, "");
}

const SCHEMA = sanitizeIdent(process.env.FREQ_SCHEMA || "public");
const TBL = sanitizeIdent(process.env.FREQ_TABLE || "Attendance");
const COLT = sanitizeIdent(process.env.FREQ_COL_TIME || "attendedAt");
const COLA = sanitizeIdent(process.env.FREQ_COL_ALUNO || "userId");

const Q_TBL = `"${SCHEMA}"."${TBL}"`;
const Q_COLT = `"${COLT}"`;
const Q_COLA = `"${COLA}"`;

if (process.env.NODE_ENV !== "production") {
  console.log("[analytics env]", { SCHEMA, TBL, COLT, COLA });
}

/* ------------------------------------------------------------------------------------------------
 * 1) ASSIDUIDADE — RANKING
 * ----------------------------------------------------------------------------------------------*/

async function rankingAssiduidadeHandler(req: any, res: any) {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(
    parseInt((req.query.limit as string) || "10", 10) || 10,
    100,
  );

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  try {
    const rows = await prisma!.$queryRawUnsafe<
      { aluno_id: string | null; presencas: number }[]
    >(
      `
      SELECT ${Q_COLA} AS aluno_id, COUNT(*)::int AS presencas
      FROM ${Q_TBL}
      WHERE (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo')::date >= $1::date
        AND (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo')::date <  ($2::date + INTERVAL '1 day')
      GROUP BY ${Q_COLA}
      ORDER BY presencas DESC
      LIMIT $3
      `,
      from,
      to,
      limit,
    );

    const data = rows
      .filter((r) => r.aluno_id != null)
      .map((r) => ({ alunoId: r.aluno_id as string, presencas: r.presencas }));

    return res.json({ period: { from, to }, data });
  } catch (e: any) {
    console.error("[analytics ranking]", e?.message ?? e);
    return res.json({ period: { from, to }, data: [] });
  }
}

analyticsRouter.get("/assiduidade/ranking", rankingAssiduidadeHandler);
analyticsRouter.get("/ranking/assiduidade", rankingAssiduidadeHandler);

/* ------------------------------------------------------------------------------------------------
 * 2) HEATMAP — SEMANA × HORA
 * ----------------------------------------------------------------------------------------------*/

analyticsRouter.get("/heatmap/week-hour", async (req, res) => {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  try {
    const rows = await prisma!.$queryRawUnsafe<
      { weekday: number; hour: number; count: number }[]
    >(
      `
      SELECT
        EXTRACT(DOW  FROM (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo'))::int AS weekday,
        EXTRACT(HOUR FROM (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo'))::int AS hour,
        COUNT(*)::int AS count
      FROM ${Q_TBL}
      WHERE (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo')::date >= $1::date
        AND (${Q_COLT} AT TIME ZONE 'America/Sao_Paulo')::date <  ($2::date + INTERVAL '1 day')
      GROUP BY 1,2
      ORDER BY 1,2
      `,
      from,
      to,
    );

    const map = new Map(rows.map((r) => [`${r.weekday}-${r.hour}`, r.count]));
    const data: { weekday: number; hour: number; count: number }[] = [];

    for (let wd = 0; wd < 7; wd++) {
      for (let h = 0; h < 24; h++) {
        data.push({ weekday: wd, hour: h, count: map.get(`${wd}-${h}`) ?? 0 });
      }
    }

    res.json({ period: { from, to }, data });
  } catch (e: any) {
    console.error("[analytics heatmap]", e?.message ?? e);
    res.json({ period: { from, to }, data: [] });
  }
});

/* ------------------------------------------------------------------------------------------------
 * 3) OCUPAÇÃO REAL POR DIA (presenças / capacidade)
 * ----------------------------------------------------------------------------------------------*/

analyticsRouter.get("/ocupacao-por-dia", async (req, res) => {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  try {
    // 1) Todas as aulas do período com contagem de presenças
    const classes = await prisma.class.findMany({
      where: {
        startAt: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T23:59:59.999Z`),
        },
      },
      include: {
        _count: { select: { Attendance: true } },
      },
    });

    // 2) Agrega por data (YYYY-MM-DD)
    const agg: Record<string, { presencas: number; capacidade: number }> = {};

    for (const c of classes) {
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(c.startAt);

      if (!agg[dateKey]) {
        agg[dateKey] = { presencas: 0, capacidade: 0 };
      }

      agg[dateKey].presencas += c._count.Attendance ?? 0;
      agg[dateKey].capacidade += c.capacity ?? 0;
    }

    // 3) Cria a série contínua from..to
    const series = [];
    const cursor = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);

    while (cursor <= end) {
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(cursor);

      const info = agg[dateKey] ?? { presencas: 0, capacidade: 0 };
      const ocupacaoRatio =
        info.capacidade > 0 ? info.presencas / info.capacidade : 0;
      const ocupacaoPercent = Math.round(ocupacaoRatio * 100);

      series.push({
        date: dateKey,
        value: info.presencas, // compat com front atual
        presencas: info.presencas,
        capacidade: info.capacidade,
        ocupacaoPercent,
        ocupacaoRatio,
        ocupacao: info.presencas, // compat com adapter antigo
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return res.json({
      series,
      meta: {
        source: "db",
        timezone: "America/Sao_Paulo",
        from,
        to,
      },
    });
  } catch (e: any) {
    console.error("🔥 ERRO REAL NO /ocupacao-por-dia:", e);

    return res.json({
      series: [],
      meta: { source: "error", error: String(e), from, to },
    });
  }
});

export default analyticsRouter;
export { analyticsRouter };
