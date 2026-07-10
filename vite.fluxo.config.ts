import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Config isolada do "app novo" (Fluxo · demandas de marketing).
// Não toca no app antigo (Finanças/Planner) — root próprio em app-fluxo/.
// Rodar: npm run dev:fluxo   /   npm run build:fluxo
export default defineConfig({
  root: path.resolve(__dirname, 'app-fluxo'),
  // Lê o .env da RAIZ do repo (mesmas VITE_FIREBASE_* do app antigo),
  // mesmo com o root do Vite apontando para app-fluxo/.
  envDir: path.resolve(__dirname),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@fluxo': path.resolve(__dirname, 'app-fluxo'),
    },
  },
  server: {
    port: 3100,
    host: '0.0.0.0',
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-fluxo'),
    emptyOutDir: true,
  },
});
