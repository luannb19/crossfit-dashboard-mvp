// backend/eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';


export default [
  { ignores: ['dist', 'node_modules', 'coverage', 'prisma/**', 'src/**/*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended, // versão não type-aware (rápida e simples)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];