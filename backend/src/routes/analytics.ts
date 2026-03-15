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

/* ----------------------------------------------------------------------------------------------
 * Churn risk (Option B): types and constants
 * ----------------------------------------------------------------------------------------------*/
const BASELINE_PERIOD_WEEKS = 12;
const BASELINE_STALE_DAYS = 7;
const CHURN_BASELINE_DROP_THRESHOLD = 0.7; // currentRate < baseline * this => at-risk
const CHURN_NO_SHOW_DAYS = 10;

export type ChurnRiskItemResponse = {
  userId: string;
  name: string;
  previousCount: number;
  currentCount: number;
  dropPercent: number;
  baselineCheckInsPerWeek: number | null;
  currentCheckInsPerWeek: number;
  daysSinceLastCheckIn: number | null;
};

export type ChurnRiskApiResponse = {
  period: {
    current: { from: string; to: string };
    days: number;
    noShowDays: number;
  };
  criteria: {
    baselineDropThreshold: number;
    baselinePeriodWeeks: number;
  };
  data: ChurnRiskItemResponse[];
};

/* ----------------------------------------------------------------------------------------------
 * Baseline: compute and store avg check-ins per week over last periodWeeks (for churn learning).
 * ----------------------------------------------------------------------------------------------*/
async function ensureBaselinesForUsers(
  userIds: string[],
  periodWeeks: number = BASELINE_PERIOD_WEEKS,
): Promise<void> {
  if (userIds.length === 0) return;
  const since = new Date();
  since.setDate(since.getDate() - periodWeeks * 7);

  const counts = await prisma.attendance.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: { userId: { in: userIds }, attendedAt: { gte: since } },
  });

  for (const row of counts) {
    const avgCheckInsPerWeek = row._count.id / periodWeeks;
    await prisma.userChurnBaseline.upsert({
      where: { userId: row.userId },
      create: {
        userId: row.userId,
        avgCheckInsPerWeek,
        periodWeeks,
      },
      update: { avgCheckInsPerWeek, periodWeeks, computedAt: new Date() },
    });
  }
}

/* ----------------------------------------------------------------------------------------------
 * 6) CHURN RISK (at-risk members) — Option B: stored baseline + behavior drop + no-show days
 *    At-risk if: (current rate < baseline * 0.7) OR (no check-in in last 10 days).
 *    Baseline: avg check-ins per week over last 12 weeks, stored in UserChurnBaseline (computed on demand if missing/stale).
 *    Query: ?days=30 (current window), ?noShowDays=10, ?limit=50.
 * ----------------------------------------------------------------------------------------------*/
analyticsRouter.get("/churn-risk", async (req, res) => {
  const days = Math.min(
    Math.max(parseInt((req.query.days as string) || "30", 10) || 30, 7),
    90,
  );
  const noShowDays = Math.min(
    Math.max(parseInt((req.query.noShowDays as string) || "10", 10) || 10, 1),
    60,
  );
  const limit = Math.min(
    parseInt((req.query.limit as string) || "50", 10) || 50,
    100,
  );

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const baselineSince = new Date(now);
  baselineSince.setDate(baselineSince.getDate() - BASELINE_PERIOD_WEEKS * 7);

  try {
    // Candidates: users with any attendance in last 60 days (so we can have baseline/current/lastAt)
    const candidateSince = new Date(now);
    candidateSince.setDate(candidateSince.getDate() - 60);
    const candidateCounts = await prisma.attendance.groupBy({
      by: ["userId"],
      where: { attendedAt: { gte: candidateSince } },
    });
    const candidateIds = candidateCounts.map((r) => r.userId);
    if (candidateIds.length === 0) {
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return res.json({
        period: {
          current: { from: fmt(currentStart), to: fmt(now) },
          days,
          noShowDays,
        },
        criteria: {
          baselineDropThreshold: CHURN_BASELINE_DROP_THRESHOLD,
          baselinePeriodWeeks: BASELINE_PERIOD_WEEKS,
        },
        data: [],
      });
    }

    // Fetch existing baselines; mark who needs (re)compute (missing or stale)
    const baselines = await prisma.userChurnBaseline.findMany({
      where: { userId: { in: candidateIds } },
    });
    const baselineByUser = new Map(baselines.map((b) => [b.userId, b]));
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - BASELINE_STALE_DAYS);
    const needCompute = candidateIds.filter(
      (id) =>
        !baselineByUser.get(id) ||
        baselineByUser.get(id)!.computedAt < staleCutoff,
    );
    await ensureBaselinesForUsers(needCompute, BASELINE_PERIOD_WEEKS);
    if (needCompute.length > 0) {
      const refreshed = await prisma.userChurnBaseline.findMany({
        where: { userId: { in: needCompute } },
      });
      refreshed.forEach((b) => baselineByUser.set(b.userId, b));
    }

    // Current period counts (last N days) and last attendedAt per user
    const [currentCounts, lastAttendedRows] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["userId"],
        _count: { id: true },
        where: { attendedAt: { gte: currentStart, lte: now } },
      }),
      prisma.$queryRawUnsafe<{ userId: string; lastAt: Date }[]>(
        `SELECT "userId", MAX("attendedAt") AS "lastAt" FROM "Attendance" GROUP BY "userId"`,
      ),
    ]);

    const currentCountByUser = new Map(
      currentCounts.map((r) => [r.userId, r._count.id]),
    );
    const lastAtByUser = new Map(
      lastAttendedRows.map((r) => [r.userId, r.lastAt]),
    );

    const weeksInWindow = days / 7;
    const atRisk: {
      userId: string;
      previousCount: number;
      currentCount: number;
      dropPercent: number;
      baselineCheckInsPerWeek: number | null;
      currentCheckInsPerWeek: number;
      daysSinceLastCheckIn: number | null;
    }[] = [];

    for (const userId of candidateIds) {
      const baseline = baselineByUser.get(userId);
      const currentCount = currentCountByUser.get(userId) ?? 0;
      const currentRate = currentCount / weeksInWindow;
      const lastAt = lastAtByUser.get(userId);
      const daysSince =
        lastAt != null
          ? Math.floor((now.getTime() - new Date(lastAt).getTime()) / 86400000)
          : null;

      const belowBaseline =
        baseline != null &&
        baseline.avgCheckInsPerWeek >= 0.5 &&
        currentRate <
          baseline.avgCheckInsPerWeek * CHURN_BASELINE_DROP_THRESHOLD;
      const noShow = daysSince != null && daysSince > noShowDays;

      if (belowBaseline || noShow) {
        const prevCount = baseline
          ? Math.round(baseline.avgCheckInsPerWeek * weeksInWindow)
          : 0;
        const dropPercent =
          prevCount > 0
            ? Math.round(((prevCount - currentCount) / prevCount) * 100)
            : currentCount === 0
              ? 100
              : 0;
        atRisk.push({
          userId,
          previousCount: prevCount,
          currentCount,
          dropPercent,
          baselineCheckInsPerWeek: baseline?.avgCheckInsPerWeek ?? null,
          currentCheckInsPerWeek: Math.round(currentRate * 100) / 100,
          daysSinceLastCheckIn: daysSince,
        });
      }
    }

    // Sort: longest no-show first, then by current rate ascending
    atRisk.sort((a, b) => {
      const aNo = a.daysSinceLastCheckIn ?? 0;
      const bNo = b.daysSinceLastCheckIn ?? 0;
      if (bNo !== aNo) return bNo - aNo;
      return a.currentCheckInsPerWeek - b.currentCheckInsPerWeek;
    });

    const sliced = atRisk.slice(0, limit);
    const users =
      sliced.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: sliced.map((r) => r.userId) } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const data = sliced.map((r) => ({
      userId: r.userId,
      name: nameById.get(r.userId) ?? "—",
      previousCount: r.previousCount,
      currentCount: r.currentCount,
      dropPercent: r.dropPercent,
      baselineCheckInsPerWeek: r.baselineCheckInsPerWeek,
      currentCheckInsPerWeek: r.currentCheckInsPerWeek,
      daysSinceLastCheckIn: r.daysSinceLastCheckIn,
    }));

    return res.json({
      period: {
        current: { from: fmt(currentStart), to: fmt(now) },
        days,
        noShowDays,
      },
      criteria: {
        baselineDropThreshold: CHURN_BASELINE_DROP_THRESHOLD,
        baselinePeriodWeeks: BASELINE_PERIOD_WEEKS,
      },
      data,
    });
  } catch (e: any) {
    console.error("[analytics churn-risk]", e?.message ?? e);
    return res.status(500).json({
      error: "Erro ao gerar churn risk",
      period: { days },
    });
  }
});

/* ----------------------------------------------------------------------------------------------
 * Recompute baselines (e.g. for cron) — POST or GET with ?periodWeeks=12
 * ----------------------------------------------------------------------------------------------*/
analyticsRouter.get("/baselines/recompute", async (req, res) => {
  const periodWeeks = Math.min(
    Math.max(parseInt((req.query.periodWeeks as string) || "12", 10) || 12, 4),
    52,
  );
  const since = new Date();
  since.setDate(since.getDate() - periodWeeks * 7);
  try {
    const userIds = await prisma.attendance
      .groupBy({ by: ["userId"], where: { attendedAt: { gte: since } } })
      .then((rows) => rows.map((r) => r.userId));
    await ensureBaselinesForUsers(userIds, periodWeeks);
    const count = await prisma.userChurnBaseline.count();
    return res.json({
      ok: true,
      periodWeeks,
      updatedUsers: userIds.length,
      totalBaselines: count,
    });
  } catch (e: any) {
    console.error("[analytics baselines/recompute]", e?.message ?? e);
    return res.status(500).json({ error: "Erro ao recomputar baselines" });
  }
});

export default analyticsRouter;
export { analyticsRouter };
