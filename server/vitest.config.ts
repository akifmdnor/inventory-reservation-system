import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        statements: 10,
        branches: 8,
        functions: 9,
        lines: 10,
        "src/domain/**/*.ts": {
          statements: 65,
          branches: 75,
          functions: 45,
          lines: 65
        },
        "src/lib/reserveFailureToHttp.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    }
  }
});
