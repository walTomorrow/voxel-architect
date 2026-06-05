import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/blueprints/__tests__/**/*.test.ts",
      "src/lib/builder/__tests__/**/*.test.ts",
      "src/lib/builder/semantic/__tests__/**/*.test.ts",
      "src/lib/builder/windows/__tests__/**/*.test.ts",
      "src/lib/generation/__tests__/**/*.test.ts",
      "src/lib/generation/components/__tests__/**/*.test.ts",
      "src/lib/voxel/__tests__/**/*.test.ts",
      "src/app/generic-lab/v2/__tests__/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
