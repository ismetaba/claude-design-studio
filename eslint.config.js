import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': 'warn',
      // Underscore-prefixed args/vars are intentional throwaways (exhaustiveness
      // checks, destructured omits, unused handler params).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  // Plain JS/ESM tooling files (scripts, config) run on Node.
  {
    files: ['**/*.{js,mjs,cjs}', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
  // Test files and Node scripts may log freely.
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'scripts/**', 'vitest.setup.ts'],
    rules: { 'no-console': 'off' },
  },
);
