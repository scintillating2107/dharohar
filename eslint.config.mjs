import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Superseded JSON-store prototype modules (blocked in middleware; see README)
    "src/lib/store.ts",
    "src/lib/seed-demo.ts",
    "src/lib/processing-pipeline.ts",
    "src/lib/file-storage.ts",
    "src/lib/pdf-renderer.ts",
    "src/lib/ocr-engine.ts",
    "src/lib/text-extraction.ts",
    "src/lib/field-extraction.ts",
    "src/lib/gis-utils.ts",
    "src/lib/data-paths.ts",
    "src/lib/gemini-env.ts",
    "src/lib/integrations/**",
    "src/lib/member-local/**",
    "src/mocks/**",
    "src/lib/demo-assets.ts",
    "src/lib/demo-workflow.ts",
    "src/lib/demo-portal-data.ts",
    "src/lib/record-ids.ts",
    "src/lib/auth.ts",
    "src/lib/api-utils.ts",
    "src/lib/dashboard-stats.ts",
    "src/lib/document-metadata.ts",
    "src/lib/ai-settings.ts",
    "src/app/api/local/**",
    "src/app/api/integrations/webhooks/**",
    "src/app/demo/**",
    "src/components/demo/**",
    "services/**",
    ".debug/**",
  ]),
]);

export default eslintConfig;
