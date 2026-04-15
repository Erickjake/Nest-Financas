import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Permite usar 'describe' e 'it' sem importar
    root: "./",
  },
  plugins: [
    // O SWC é o que faz o TypeScript ser compilado na velocidade da luz
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  alias: {
    src: path.resolve(__dirname, "./src"),
    generated: path.resolve(__dirname, "./generated"), // 👈 Adicione isso
  },
});
