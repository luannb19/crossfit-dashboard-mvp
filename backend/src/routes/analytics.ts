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

/* ----------------------------------------------------------------------------------------------
 * 2b) OCCUPANCY HEATMAP — dayOfWeek × hour with checkins, capacity, occupancyPercent
 *     Uses Class.startAt + Class.capacity and Attendance per class.
 * ----------------------------------------------------------------------------------------------*/
analyticsRouter.get("/occupancy-heatmap", async (req, res) => {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  try {
    const classes = await prisma.class.findMany({
      where: {
        startAt: { gte: fromDate, lte: toDate },
      },
      include: { _count: { select: { Attendance: true } } },
    });

    const slotKey = (dow: number, hour: number) => `${dow}-${hour}`;
    const capacityBySlot = new Map<string, number>();
    const checkinsBySlot = new Map<string, number>();

    const tz = "America/Sao_Paulo";
    const dowMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    for (const c of classes) {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: tz,
        weekday: "short",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(c.startAt);
      const weekdayShort =
        parts.find((p) => p.type === "weekday")?.value ?? "Sun";
      const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
      const dow = dowMap[weekdayShort] ?? 0;
      const hour = parseInt(hourStr, 10) || 0;
      const key = slotKey(dow, hour);
      capacityBySlot.set(
        key,
        (capacityBySlot.get(key) ?? 0) + (c.capacity ?? 0),
      );
      checkinsBySlot.set(
        key,
        (checkinsBySlot.get(key) ?? 0) + (c._count.Attendance ?? 0),
      );
    }

    const data: {
      dayOfWeek: number;
      hour: number;
      checkins: number;
      capacity: number;
      occupancyPercent: number;
    }[] = [];

    for (let dow = 0; dow < 7; dow++) {
      for (let h = 0; h < 24; h++) {
        const key = slotKey(dow, h);
        const capacity = capacityBySlot.get(key) ?? 0;
        const checkins = checkinsBySlot.get(key) ?? 0;
        const occupancyPercent =
          capacity > 0 ? Math.round((checkins / capacity) * 100) : 0;
        data.push({
          dayOfWeek: dow,
          hour: h,
          checkins,
          capacity,
          occupancyPercent,
        });
      }
    }

    return res.json({ period: { from, to }, data });
  } catch (e: any) {
    console.error("[analytics occupancy-heatmap]", e?.message ?? e);
    return res.status(500).json({
      error: "Erro ao gerar occupancy heatmap",
      period: { from, to },
    });
  }
});

/* ----------------------------------------------------------------------------------------------
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
    // 1) Busca todas as aulas no período com contagem real de presenças
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

    // 2) Agregar por dia (key YYYY-MM-DD)
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

    // 3) Série contínua (garante todos os dias)
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

        // valores base
        presencas: info.presencas,
        capacidade: info.capacidade,
        ocupacaoRatio,
        ocupacaoPercent,

        // compat com UI antiga
        value: info.presencas,
        ocupacao: info.presencas,
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

/* ----------------------------------------------------------------------------------------------
 * 4) MANAGER SUMMARY — one-glance KPIs for the period (for dashboard + mobile home)
 * ----------------------------------------------------------------------------------------------*/
const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

analyticsRouter.get("/summary", async (req, res) => {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  try {
    const [totalCheckIns, classes, memberCountResult, busiestRow] =
      await Promise.all([
        prisma.attendance.count({
          where: { attendedAt: { gte: fromDate, lte: toDate } },
        }),
        prisma.class.findMany({
          where: { startAt: { gte: fromDate, lte: toDate } },
          select: { capacity: true },
        }),
        prisma.attendance.groupBy({
          by: ["userId"],
          where: { attendedAt: { gte: fromDate, lte: toDate } },
        }),
        prisma.$queryRawUnsafe<{ dow: number; count: bigint }[]>(
          `
        SELECT EXTRACT(DOW FROM ("Attendance"."attendedAt" AT TIME ZONE 'America/Sao_Paulo'))::int AS dow, COUNT(*)::bigint AS count
        FROM "Attendance"
        WHERE "Attendance"."attendedAt" >= $1::timestamptz AND "Attendance"."attendedAt" <= $2::timestamptz
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 1
        `,
          fromDate,
          toDate,
        ),
      ]);

    const totalCapacity = classes.reduce(
      (sum, c) => sum + (c.capacity ?? 0),
      0,
    );
    const occupancyPercent =
      totalCapacity > 0 ? Math.round((totalCheckIns / totalCapacity) * 100) : 0;
    const memberCount = memberCountResult.length;
    const busiestDay =
      busiestRow?.[0] != null ? WEEKDAY_NAMES[Number(busiestRow[0].dow)] : null;

    return res.json({
      period: { from, to },
      occupancyPercent,
      totalCheckIns,
      totalCapacity,
      memberCount,
      busiestDay,
    });
  } catch (e: any) {
    console.error("[analytics summary]", e?.message ?? e);
    return res.status(500).json({
      error: "Erro ao gerar resumo",
      period: { from, to },
    });
  }
});

/* ----------------------------------------------------------------------------------------------
 * 5) MEMBER RANKING — top 10 by check-in count (userId, name, checkinCount)
 * ----------------------------------------------------------------------------------------------*/
analyticsRouter.get("/member-ranking", async (req, res) => {
  const from =
    (req.query.from as string) ??
    new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from) || !ISO.test(to)) {
    return res.status(400).json({ error: "from/to inválidos (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  try {
    const rows = await prisma.$queryRawUnsafe<
      { userId: string; name: string; checkinCount: bigint }[]
    >(
      `
      SELECT u.id AS "userId", u.name, COUNT(a.id)::bigint AS "checkinCount"
      FROM "Attendance" a
      INNER JOIN "User" u ON u.id = a."userId"
      WHERE a."attendedAt" >= $1::timestamptz AND a."attendedAt" <= $2::timestamptz
      GROUP BY u.id, u.name
      ORDER BY "checkinCount" DESC
      LIMIT 10
      `,
      fromDate,
      toDate,
    );

    const data = rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      checkinCount: Number(r.checkinCount),
    }));

    return res.json({ period: { from, to }, data });
  } catch (e: any) {
    console.error("[analytics member-ranking]", e?.message ?? e);
    return res.status(500).json({
      error: "Erro ao gerar ranking",
      period: { from, to },
    });
  }
});

export default analyticsRouter;
export { analyticsRouter };
