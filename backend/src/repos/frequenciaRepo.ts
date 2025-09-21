import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const groupByEnum = z.enum(["day", "week", "month"]);
export type GroupBy = z.infer<typeof groupByEnum>;

type Params = {
  from: string;
  to: string;
  groupBy: GroupBy;
  classId?: string | null;
  alunoId?: string | null;
  limit?: number | null;
  tableName?: string; // opcional (ex.: testes de CI)
};

const MAX_LIMIT = 365;

function sanitizeTableName(name: string) {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
}

function truncateExpr(g: GroupBy) {
  if (g === "day") return "day";
  if (g === "week") return "week";
  return "month";
}

export async function getFrequencia({
  from,
  to,
  groupBy,
  classId,
  alunoId,
  limit,
  tableName,
}: Params) {
  const prisma = new PrismaClient();
  try {
    const g = truncateExpr(groupBy);
    const tblDefault = process.env.FREQ_TABLE || "attendance";
    const tbl = sanitizeTableName(tableName || tblDefault);
    const lim = Math.min(Math.max(limit ?? MAX_LIMIT, 1), MAX_LIMIT);

    const rows: { bucket: Date; qty: number }[] = await prisma.$queryRawUnsafe(
      `
      SELECT date_trunc('${g}', happened_at) AS bucket, COUNT(*)::int AS qty
      FROM "${tbl}"
      WHERE happened_at BETWEEN $1::timestamp AND $2::timestamp
        ${classId ? `AND class_id = $3` : ""}
        ${alunoId ? `AND aluno_id = $4` : ""}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT ${lim}
      `,
      from,
      to,
      ...(classId ? [classId] : []),
      ...(alunoId ? [alunoId] : []),
    );

    const series = rows.map((r) => ({
      date: r.bucket.toISOString().slice(0, 10),
      value: r.qty,
    }));

    return {
      series,
      meta: {
        from,
        to,
        groupBy,
        classId: classId ?? null,
        alunoId: alunoId ?? null,
        limit: lim,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}
