import eslint from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "server/prisma/**",
      "**/*.config.ts",
      "eslint.config.mjs"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["server/**/*.ts", "web-client/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  {
    files: ["server/tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest
      }
    }
  }
);
