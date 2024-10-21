// @ts-check

import js from "@eslint/js"
import json from "@eslint/json"
import markdown from "@eslint/markdown"
import jest from "eslint-plugin-jest"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import tsDoc from "eslint-plugin-tsdoc"
import globals from "globals"
import ts from "typescript-eslint"

export default ts.config(
  { ignores: ["**/coverage"] },
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigDirName: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": ts.plugin,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "off",
        {
          allowAny: true,
          allowBoolean: true,
          allowNullish: true,
          allowNumber: true,
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        process: "readonly",
      },
    },
    ...js.configs.recommended,
    // an awkward workaround to disable previous rules incorrectly scoped
    ...ts.configs.disableTypeChecked,
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
      tsdoc: tsDoc,
    },
    rules: {
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^\\u0000"], // Side effect imports
            ["^node:"], // Node imports
            ["^@?\\w"], // Npm imports
            ["^@nillion/"], // Monorepo packages
            ["^\\."], // Relative imports
          ],
        },
      ],
      "tsdoc/syntax": "warn",
    },
  },
  {
    files: ["**/*.test.ts"],
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.style.rules,
      "@typescript-eslint/no-non-null-assertion": "off",
      "jest/no-conditional-expect": "off",
    },
  },
  {
    plugins: {
      json,
    },
    files: ["**/*.json"],
    language: "json/json",
    rules: {
      "json/no-duplicate-keys": "warn",
      // an awkward workaround to disable previous rules incorrectly scoped
      ...ts.configs.disableTypeChecked.rules,
    },
  },
  {
    files: ["**/*.md"],
    plugins: {
      markdown,
    },
    language: "markdown/commonmark",
    rules: {
      "markdown/no-html": "error",
      // an awkward workaround to disable previous rules incorrectly scoped
      ...ts.configs.disableTypeChecked.rules,
    },
  },
)
