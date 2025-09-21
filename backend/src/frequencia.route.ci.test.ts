import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";

const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;
const itOrSkip = isCI ? it : it.skip;

const prisma = new PrismaClient();
const TMP = "attendance_tmp_route_ci";

// vamos importar o app só DEPOIS de setar as envs (pra rota ler corretamente)
let app: import("express").Express;

describe("[CI] rota /frequencia usando DB real (gate ligado)", () => {
  beforeAll(async () => {
    if (!isCI) return;

    // 1) tabela temporária e seed
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TMP}";`);
    await prisma.$executeRawUnsafe(`
      CREATE UNLOGGED TABLE "${TMP}"(
        id serial primary key,
        happened_at timestamp not null,
        class_id text,
        aluno_id text
      );
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${TMP}" (happened_at, class_id, aluno_id) VALUES
        ('2025-01-01 10:00:00', 'c1', 'a1'),
        ('2025-01-01 11:00:00', 'c1', 'a2'),
        ('2025-01-03 09:00:00',  'c1', 'a1');
    `);

    // 2) ligar o gate e apontar a tabela para a temporária
    process.env.USE_FREQ_DB = "1";
    process.env.FREQ_TABLE = TMP;

    // 3) importar o app depois de setar as envs
    ({ app } = await import("./app"));
  });

  afterAll(async () => {
    if (isCI) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TMP}";`);
    }
    await prisma.$disconnect();
  });

  itOrSkip(
    "retorna {filters, data, meta} com source=db e agregação correta",
    async () => {
      // login
      const login = await request(app)
        .post("/auth/login")
        .send({ email: "gestor@insightflow.com", password: "123456" });
      expect(login.status).toBe(200);
      const token = login.body.token;

      // chamada autenticada
      const res = await request(app)
        .get("/frequencia")
        .set("Authorization", `Bearer ${token}`)
        .query({
          from: "2025-01-01",
          to: "2025-01-05",
          groupBy: "day",
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body?.meta?.source).toBe("db");
      expect(Array.isArray(res.body?.data)).toBe(true);

      // ✅ tipa o array para evitar any
      type DataPoint = { date: string; presencas: number };
      const data = res.body.data as DataPoint[];

      const d1 = data.find((p) => p.date === "2025-01-01");
      const d3 = data.find((p) => p.date === "2025-01-03");
      expect(d1?.presencas).toBe(2);
      expect(d3?.presencas).toBe(1);
    },
  );
});
