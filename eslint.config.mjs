import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The project contains a sizeable collection of animation, WebGL and
      // third-party-derived UI primitives that are not compiled with React
      // Compiler. Keep the runtime hook-order checks, while avoiding compiler
      // eligibility diagnostics that do not apply to the current build.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/exhaustive-deps': 'off',

      // Legacy visual primitives rely on flexible library callback shapes.
      // TypeScript still validates their concrete call sites during typecheck.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Existing remote and protected-media rendering intentionally uses raw
      // image elements where Next Image cannot provide the required behavior.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
