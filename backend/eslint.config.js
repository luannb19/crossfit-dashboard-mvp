// backend/eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'prisma/**',
      'src/**/*.js',

      // ⛔ Ignorar arquivos com ANY por enquanto
      'src/routes/analytics.dev.ts',
      'src/routes/analytics.ts',
      'src/routes/attendance.ts',
      'src/routes/heatmap.ts',
      'src/services/payments.ts',

      // (opcional, mas ajuda com builds)
      'src/swagger.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended, // versão não type-aware (rápida)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
