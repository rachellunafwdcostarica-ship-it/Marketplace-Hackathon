import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // server-only lanza fuera de un contexto RSC; en tests lo resolvemos a su
      // variante no-op (la misma que Next usa bajo la condición react-server).
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
})
