import { fileURLToPath, URL } from "node:url";

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

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
});
