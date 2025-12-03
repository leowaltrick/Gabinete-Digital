import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: "/Gabinete-Digital/", 

    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    resolve: {
      alias: {
        // Correção CRÍTICA: Seus componentes estão na raiz, então @ deve apontar para a raiz, não para src.
        "@": path.resolve("./"),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
            maps: ['leaflet', 'react-leaflet', 'maplibre-gl'],
            db: ['@supabase/supabase-js']
          }
        }
      },
      chunkSizeWarningLimit: 1500
    }
  };
});