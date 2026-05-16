import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    },
    watch: {
      // Exclude backend directory from Vite's file watcher
      // This prevents Vite from watching cloned repos in backend/temp
      ignored: ['**/backend/**']
    }
  }
})

// Made with Bob
