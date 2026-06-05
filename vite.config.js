import { defineConfig } from "vite";

// Local dev: "/"
// GitHub Pages (project site): "/tên-repo/" — set qua VITE_BASE trong workflow
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  build: {
    outDir: "dist",
  },
});
