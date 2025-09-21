// src/db.test.ts
import { describe, test, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const isCI = !!process.env.CI;

describe("DB smoke (Postgres only)", () => {
  const itOrSkip = isCI ? test : test.skip;

  itOrSkip("connects and SELECT 1", async () => {
    const prisma = new PrismaClient();
    try {
      const res = await prisma.$queryRawUnsafe("SELECT 1");
      expect(res).toBeTruthy();
    } finally {
      await prisma.$disconnect();
    }
  });
});
