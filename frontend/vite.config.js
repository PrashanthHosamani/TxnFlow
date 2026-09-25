import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',   // needed so Docker exposes it to the host machine
    port: 5173,

    // ─── The proxy ───────────────────────────────────────────────
    // Any request from React that starts with /api is silently
    // forwarded to Django running inside the Docker network.
    // The browser only ever sees localhost:5173 — it never
    // directly talks to :8000. This also means no CORS headers
    // are needed in development (browser thinks it's same-origin).
    proxy: {
      '/api': {
        target: 'http://web:8000',  // 'web' = Django service name in docker-compose
        changeOrigin: true,
      },
    },
  },
})
