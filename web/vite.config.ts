import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // a demo lê ../dados/base_sintetica.json diretamente (sem API)
  server: { fs: { allow: [".."] } },
});
