import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global.ts"],
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
