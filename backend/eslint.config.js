import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // arquivos/pastas ignorados
  { ignores: ["dist/**", "node_modules/**"] },

  // Regras JS recomendadas
  js.configs.recommended,

  // Regras TS recomendadas
  ...tseslint.configs.recommended,

  // Ajustes do projeto
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
