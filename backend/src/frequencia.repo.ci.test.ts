import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { getFrequencia } from "./repos/frequenciaRepo";

const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;
const itOrSkip = isCI ? it : it.skip;
const prisma = new PrismaClient();

const TMP = "attendance_tmp_ci";

describe("[CI] getFrequencia com tabela temporária", () => {
  beforeAll(async () => {
    if (!isCI) return;
    // tabela leve e sem WAL pra ficar rápido no CI
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS "${TMP}";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNLOGGED TABLE "${TMP}"(
        id serial primary key,
        happened_at timestamp not null,
        class_id text,
        aluno_id text
      );
    `);
    // seed simples: 3 dias, 3 presenças (2 no dia 1, 1 no dia 3)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${TMP}" (happened_at, class_id, aluno_id) VALUES
        ('2025-01-01 10:00:00', 'c1', 'a1'),
        ('2025-01-01 11:00:00', 'c1', 'a2'),
        ('2025-01-03 09:00:00', 'c1', 'a1');
    `);
  });

  afterAll(async () => {
    if (isCI) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TMP}";`);
    }
    await prisma.$disconnect();
  });

  itOrSkip(
    "agrupa por day e respeita filtros/limite mantendo shape",
    async () => {
      const res = await getFrequencia({
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-05T00:00:00.000Z",
        groupBy: "day",
        classId: "c1",
        limit: 10,
        tableName: TMP, // 👈 usamos a tabela temporária
      });

      expect(Array.isArray(res.series)).toBe(true);
      // deve ter pelo menos 2 buckets (dia 1 e dia 3)
      expect(res.series.length).toBeGreaterThanOrEqual(2);

      // dia 01 tem 2 presenças
      const d1 = res.series.find((p) => p.date === "2025-01-01");
      expect(d1?.value).toBe(2);

      // meta refletindo filtros
      expect(res.meta.groupBy).toBe("day");
      expect(res.meta.classId).toBe("c1");
      expect(res.meta.limit).toBe(10);
    },
  );
});
