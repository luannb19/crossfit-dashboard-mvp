import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "text-summary", "html", "lcov"],
      // conte APENAS arquivos TS da pasta src
      include: ["src/**/*.ts"],
      // exclua legados em JS e seeds/prisma
      exclude: [
        "src/**/*.js",
        "prisma/**",
        "**/*.d.ts",
        "src/**/__tests__/**"
      ],
      all: true, // reporta % também pros TS não testados
    },
  },
});
