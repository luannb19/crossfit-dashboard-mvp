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

function sanitizeIdent(name: string) {
  // Permite apenas letras, números e underscore
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

    // Tabela e colunas configuráveis por ENV
    const tblDefault = process.env.FREQ_TABLE || "attendance";
    const COL_TIME = sanitizeIdent(process.env.FREQ_COL_TIME || "happened_at");
    const COL_CLASS = sanitizeIdent(process.env.FREQ_COL_CLASS || "class_id");
    const COL_ALUNO = sanitizeIdent(process.env.FREQ_COL_ALUNO || "aluno_id");
    const tbl = sanitizeIdent(tableName || tblDefault);

    const lim = Math.min(Math.max(limit ?? MAX_LIMIT, 1), MAX_LIMIT);

    // Monta WHERE dinâmico com placeholders corretos
    const params: unknown[] = [from, to];
    let whereExtra = "";
    let idx = 3;

    if (classId) {
      whereExtra += ` AND "${COL_CLASS}" = $${idx++}`;
      params.push(classId);
    }
    if (alunoId) {
      whereExtra += ` AND "${COL_ALUNO}" = $${idx++}`;
      params.push(alunoId);
    }

    const sql = `
      SELECT date_trunc('${g}', "${COL_TIME}") AS bucket, COUNT(*)::int AS qty
      FROM "${tbl}"
      WHERE "${COL_TIME}" BETWEEN $1::timestamp AND $2::timestamp
      ${whereExtra}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT ${lim}
    `;

    const rows: { bucket: Date; qty: number }[] = await prisma.$queryRawUnsafe(
      sql,
      ...params,
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
