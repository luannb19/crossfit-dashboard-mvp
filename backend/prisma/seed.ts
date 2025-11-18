// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // 1) Usuarios demo: use uma unique estável (email) no where do upsert,
  // e NÃO force "id" manualmente. Assim pegamos o id real (int/uuid).
  const u1 = await prisma.user.upsert({
    where: { email: "aluno1@example.com" },
    update: {},
    create: {
      name: "Aluno 1",
      email: "aluno1@example.com",
      password: "demo123", // <-- adicionado
    },
  });

  const u2 = await prisma.user.upsert({
    where: { email: "aluno2@example.com" },
    update: {},
    create: {
      name: "Aluno 2",
      email: "aluno2@example.com",
      password: "demo123", // <-- adicionado
    },
  });

  // 2) Classe demo (26/10/2025 12:00 America/Sao_Paulo -> 15:00Z)
  const start = new Date("2025-10-26T15:00:00.000Z");
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const demoClass = await prisma.class.upsert({
    where: { id: "demo-class-1" }, // se "id" for string no seu schema de Class
    update: {},
    create: {
      id: "demo-class-1",
      title: "Aula Demo",
      startAt: start,
      endAt: end,
      capacity: 20,
    },
  });

  // 3) Limpa presenças dessa aula (idempotente p/ re-seed)
  await prisma.attendance.deleteMany({ where: { classId: demoClass.id } });

  // 4) Presenças usando os IDs REAIS vindos do banco
  await prisma.attendance.createMany({
    data: [
      {
        userId: u1.id,
        classId: demoClass.id,
        attendedAt: new Date(start.getTime() + 5 * 60 * 1000),
      },
      {
        userId: u2.id,
        classId: demoClass.id,
        attendedAt: new Date(start.getTime() + 10 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed concluído");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
