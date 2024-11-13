import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// BEGIN: FlatCompat workaround for importing older, eslintrc-based plugins that
// use "extends", namely eslint-config-airbnb-base ('airbnb-base' below)
// See https://www.raulmelo.me/en/blog/migration-eslint-to-flat-config#fixing-compatibility-issues
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname, // optional; default: process.cwd()
  resolvePluginsRelativeTo: __dirname, // optional
});
// END: FlatCompat workaround

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ['**/*.ts'],
  },
  ...compat.extends('airbnb-base'), // See FlatCompat workaround above
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/naming-convention': ['warn', {
        selector: 'import',
        format: ['camelCase', 'PascalCase'],
      }],

      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',

      // BEGIN: Modify some rules set by Airbnb config
      'import/extensions': ['error', {
        ts: 'never',
      }],
      'import/no-unresolved': 'off',
      // END: Modify some rules set by Airbnb config
    },
  },
];
