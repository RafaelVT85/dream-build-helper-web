import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Config do app novo em React. O app antigo (estático, em /public + /app.js)
// continua no ar até essa migração ficar pronta e substituir de vez.
export default defineConfig({
  plugins: [react()],
  root: "apps/web",
  publicDir: "../../public",
  build: {
    outDir: "../../dist-web",
    emptyOutDir: true,
  },
});
