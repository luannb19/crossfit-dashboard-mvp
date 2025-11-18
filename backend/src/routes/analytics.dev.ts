// src/routes/analytics.dev.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

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

const router = Router();

// Totais, range e amostra recente
router.get("/dev/inspect/attendance", async (_req, res) => {
  try {
    const [{ total }] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM ${Q_TBL}`,
    );

    const [range] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT MIN(${Q_COLT}) AS min_ts, MAX(${Q_COLT}) AS max_ts FROM ${Q_TBL}`,
    );

    const sample = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ${Q_COLA} AS userId, ${Q_COLT} AS attendedAt
       FROM ${Q_TBL}
       ORDER BY ${Q_COLT} DESC
       LIMIT 10`,
    );

    res.json({
      table: `${SCHEMA}.${TBL}`,
      time_col: COLT,
      user_col: COLA,
      total,
      range,
      sample,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "inspect failed" });
  }
});

export default router;
