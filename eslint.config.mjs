import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import comply360 from "./src/eslint-rules/index.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Plugin local con reglas custom de design-system.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: { comply360 },
    rules: {
      "comply360/no-conflicting-bg": "error",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".design-temp/**",
    "design-preview/**",
    "playwright-report/**",
    "test-results/**",
    "test_*.{js,ts,cjs,mjs}",
    "test-*.{js,ts,cjs,mjs}",
    "e2e/**",
    "scripts/**",
    "*.cjs",
    // El propio plugin no se lintea a sí mismo (es CommonJS-style ESM puro).
    "src/eslint-rules/**",
  ]),
]);

export default eslintConfig;
