import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Sobe um Postgres 18 real por arquivo de teste; o primeiro pull da imagem é lento.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
