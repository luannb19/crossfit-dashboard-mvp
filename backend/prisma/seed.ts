import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const {
  DEMO_USER_EMAIL = "gestor@insightflow.com",
  DEMO_USER_PASSWORD = "123456",
  DEMO_USER_ROLE = "GESTOR",
} = process.env;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    create: {
      email: DEMO_USER_EMAIL,
      passwordHash,
      role: DEMO_USER_ROLE as Role,
    },
    update: { passwordHash, role: DEMO_USER_ROLE as Role },
  });

  console.log("✅ Seed ok:", DEMO_USER_EMAIL);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
