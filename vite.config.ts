import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE')
  const port = env.VITE_PORT ? parseInt(env.VITE_PORT, 10) : 5173

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  }
})
