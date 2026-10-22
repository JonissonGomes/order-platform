import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const plugins = [react(), tailwindcss()];

// Carrega o .env de FE/ para todos os ambientes (dev, test, prod)
// Isso garante que process.env.VITE_API_URL esteja disponível no proxy
export default defineConfig(({ mode }) => {
  // Carrega variáveis do .env, .env.local, .env.[mode], .env.[mode].local
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");

  // URL da API: usa VITE_API_URL do .env, senão localhost:8080 (proxy em dev)
  const apiTarget = env.VITE_API_URL || "http://localhost:8080";

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        // Proxy /api/* para o backend — lê do .env via loadEnv
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
      },
    },
  };
});
