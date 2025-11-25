import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "out/**",
      "public/**"
    ],
  },
  // 공통 규칙
  {
    files: ["**/*.{js,ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/react-in-jsx-scope": "off" 
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
      "no-console": "off",
      "@typescript-eslint/no-var-requires": "off"
    },
  },
];

export default eslintConfig;
