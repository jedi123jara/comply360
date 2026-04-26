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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El propio plugin no se lintea a sí mismo (es CommonJS-style ESM puro).
    "src/eslint-rules/**",
  ]),
]);

export default eslintConfig;
