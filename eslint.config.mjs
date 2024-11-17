// @ts-check
// Adapted from `yo code` generator and then https://typescript-eslint.io/users/configs/

import eslint from "@eslint/js";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import tseslint from "typescript-eslint";

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
    eslint.configs.recommended,
    // ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ["**/*.ts"],
    }, {
        plugins: {
            "@stylistic/ts": stylisticTs,
            "@typescript-eslint": tseslint.plugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['eslint.config.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            }
        },

        rules: {
            "@stylistic/ts/semi": "warn",
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
        },
    }];