import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      // External test suite — Week 3-4 investor report tests
      '../../Week3-4 Front end/PR4/*.test.tsx',
      // PR5 — Tenant report tests
      '../../Week3-4 Front end/PR5/*.test.tsx',
      // PR6 — Personal Buyer + Landlord report tests
      '../../Week3-4 Front end/PR6/*.test.tsx',
      // PR7 — Paywall, Account, Auth, States tests
      '../../Week3-4 Front end/PR7/*.test.tsx',
      // PR8 — Mobile responsive pass tests
      '../../Week3-4 Front end/PR8/*.test.tsx',
    ],
  },
})
