import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
//alvaras/index.tsx - mudar também ip manualmente
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5188,
    proxy: {
      "/api": {
        target: "http://localhost:3555",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:3555",
        changeOrigin: true,
      }
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})