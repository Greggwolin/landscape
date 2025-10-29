import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Base Next.js + TypeScript rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Ignore generated artifacts (e.g., Prisma client/runtime)
      "src/generated/**",
      // Ignore backend Python virtual environment
      "backend/venv/**",
      "backend/**/*.py",
      // Ignore documentation and examples
      "Documentation/**",
      "docs/examples/**",
      "docs/**/*.tsx",
      // Ignore reference materials
      "reference/**",
      // Ignore uploads directories
      "backend/uploads/**",
      "uploads/**",
      // Ignore patches
      "patches/**",
      // Ignore prototypes project (contains experimental code)
      "src/prototypes/**",
      // Ignore broken/WIP files
      "**/*-broken.*",
      "**/*-legacy.*",
      "**/*-old.*",
    ],
  },

  // Allow CommonJS in Node scripts and config files
  {
    files: [
      "scripts/**/*.js",
      "tailwind.config.js",
      "postcss.config.js",
      "postcss.config.mjs",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // Loosen restrictions for plain .js files (project-wide)
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // UI components can pragmatically use `any` while evolving types
  {
    files: ["src/app/components/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Relax rules for API routes (often need any for dynamic Django responses)
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },

  // Legacy files - allow any and unused vars (to be refactored later)
  {
    files: [
      "src/app/api/ai/analyze-document/route-legacy.ts",
      "src/app/api/absorption/**/*.ts",
      "src/app/api/admin/**/*.ts",
      "scripts/**/*.js",
      "scripts/**/*.mjs",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Allow warnings instead of errors globally (pragmatic approach)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
];

export default eslintConfig;
