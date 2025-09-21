// backend/prisma.config.ts
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    // usamos o seed DEMO atual; ajuste se trocar o arquivo
    seed: "tsx prisma/seed-demo.js",
  },
});