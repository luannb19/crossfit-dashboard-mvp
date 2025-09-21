// backend/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ✅ precisa disto para usar describe/it/expect sem imports em todo arquivo
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      all: true,
      include: [
        "src/routes/**/*.ts",
        "src/middleware/**/*.ts",
        "src/schemas/**/*.ts",
        "src/app.ts",
        "src/env.ts",
      ],
      exclude: [
        "src/index.ts",
        "src/lib/**/*.ts",
        "src/repos/**/*.ts",
      ],
      lines: 0.75,
      functions: 0.75,
      statements: 0.75,
      branches: 0.70,
    },
  },
});
