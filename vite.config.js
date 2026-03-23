import { defineConfig } from 'vite'

export default defineConfig({
  root: 'app',
  server: {
    host: true
  },
  build: {
    outDir: '../dist'
  }
})
