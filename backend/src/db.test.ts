import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
const isPg = url.startsWith("postgresql://");

const prisma = isPg ? new PrismaClient() : null;

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

describe("DB smoke (Postgres only)", () => {
  it("connects and SELECT 1", async () => {
    if (!isPg) {
      expect(true).toBe(true); // skip quando não for Postgres
      return;
    }
    const res = await prisma!.$queryRawUnsafe("SELECT 1");
    expect(res).toBeTruthy();
  });
});
