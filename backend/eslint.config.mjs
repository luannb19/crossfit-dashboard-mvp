import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Ignorar temporariamente JS até migrarmos rotas/arquivos para TS
  { ignores: ['**/*.js', 'dist/**', 'node_modules/**', 'prisma/**/*.js', '.eslintrc.cjs'] },

  // Regras recomendadas para TypeScript
  ...tseslint.configs.recommended,

  // Ajustes do projeto
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
