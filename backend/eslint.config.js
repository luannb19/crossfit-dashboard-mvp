import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // Ignora build, deps e seeds JS do Prisma
  { ignores: ["dist/**", "node_modules/**", "prisma/**/*.js"] },

  // Opções base (Node + ES modules)
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node }
    }
  },

  // Regras JS recomendadas
  js.configs.recommended,

  // Regras TS recomendadas, aplicadas SOMENTE a .ts/.tsx
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ["**/*.ts", "**/*.tsx"],
  })),

  // Ajustes de regras para TS
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  }
];
