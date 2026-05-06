import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    test: {
      include: ["tests/**/*.test.ts"],
      testTimeout: 180_000,
    },
  };
});
