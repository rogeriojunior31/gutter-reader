/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  server: {
    port: 5173,
    // Fase 2: o servidor Go roda em :8080
    proxy: { '/api': 'http://localhost:8080', '/opds': 'http://localhost:8080' },
  },
  build: { target: 'es2023', sourcemap: true },
  test: { include: ['src/**/*.test.{ts,tsx}'] },
});
