import { fileURLToPath, URL } from "node:url";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite+ (vite-plus) unified config. The `vp` CLI is provided by mise (viteplus).
// Vite 8 dropped Babel from @vitejs/plugin-react v6 (JSX/Fast Refresh now run on
// oxc). React Compiler therefore runs through @rolldown/plugin-babel, and it must
// execute *before* react() so the compiler sees untransformed source.
export default defineConfig({
  plugins: [
    babel({
      presets: [reactCompilerPreset()],
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Mirrors the tsconfig path alias (@/* -> src/*) owned by the TS agent.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      // エントリ（main.tsx）・テスト・型定義はカバレッジ対象外。
      exclude: ["src/main.tsx", "**/*.{test,spec}.*", "**/*.d.ts"],
      // 自律エージェントに「変更にはテスト」を機械的に課すための閾値。
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
