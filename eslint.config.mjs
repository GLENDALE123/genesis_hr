import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
  // 공통 규칙: warn/error만 허용
  {
    files: ["**/*.{js,ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // Electron/Functions는 CommonJS/스크립트 문맥이므로 별도 설정
  {
    files: ["electron/**/*.{js,ts}", "functions/**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "script",
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
