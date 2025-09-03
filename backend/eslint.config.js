import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignorar artefatos/gerados
  { ignores: ["dist/**", "node_modules/**", "prisma/**/*.js"] },

  // Regras base JS e TS
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Ajustes do projeto
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];
