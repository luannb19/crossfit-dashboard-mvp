import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.js", "prisma/**", "**/*.d.ts", "src/**/__tests__/**"],
      all: true,
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
  },
});
