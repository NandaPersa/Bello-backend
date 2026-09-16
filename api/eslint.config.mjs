import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";
import * as tsParser from "@typescript-eslint/parser";

export default tseslint.config({
  files: ["src/**/*.ts"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: "./tsconfig.json",
      tsconfigRootDir: import.meta.dirname,
    }
  },
  plugins: {
    boundaries,
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
    },
    "boundaries/elements": [
      { type: "identity", pattern: "src/identity/**/*" },
      { type: "professional-catalog", pattern: "src/professional-catalog/**/*" },
      { type: "discovery", pattern: "src/discovery/**/*" },
      { type: "scheduling", pattern: "src/scheduling/**/*" },
      { type: "client-records", pattern: "src/client-records/**/*" },
      { type: "reviews", pattern: "src/reviews/**/*" },
      { type: "billing", pattern: "src/billing/**/*" },
      { type: "payments", pattern: "src/payments/**/*" },
      { type: "marketing", pattern: "src/marketing/**/*" },
      { type: "notifications", pattern: "src/notifications/**/*" },
      { type: "analytics", pattern: "src/analytics/**/*" },
      { type: "admin", pattern: "src/admin/**/*" }
    ],
  },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        policies: [
          { from: { element: { type: "identity" } }, allow: [{ to: { element: { type: "identity" } } }] },
          { from: { element: { type: "professional-catalog" } }, allow: [{ to: { element: { type: "professional-catalog" } } }] },
          { from: { element: { type: "discovery" } }, allow: [{ to: { element: { type: "discovery" } } }] },
          { from: { element: { type: "scheduling" } }, allow: [{ to: { element: { type: "scheduling" } } }] },
          { from: { element: { type: "client-records" } }, allow: [{ to: { element: { type: "client-records" } } }] },
          { from: { element: { type: "reviews" } }, allow: [{ to: { element: { type: "reviews" } } }] },
          { from: { element: { type: "billing" } }, allow: [{ to: { element: { type: "billing" } } }] },
          { from: { element: { type: "payments" } }, allow: [{ to: { element: { type: "payments" } } }] },
          { from: { element: { type: "marketing" } }, allow: [{ to: { element: { type: "marketing" } } }] },
          { from: { element: { type: "notifications" } }, allow: [{ to: { element: { type: "notifications" } } }] },
          { from: { element: { type: "analytics" } }, allow: [{ to: { element: { type: "analytics" } } }] },
          { from: { element: { type: "admin" } }, allow: [{ to: { element: { type: "admin" } } }] }
        ],
      },
    ],
  },
}, {
  // Regra de isolamento do Domain (Zero frameworks)
  files: ["src/*/domain/**/*.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@nestjs/*", "@prisma/*"],
            message: "A camada de Domain não pode depender de frameworks (NestJS, Prisma, etc)."
          }
        ]
      }
    ]
  }
});
