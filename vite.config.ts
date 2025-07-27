import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/mermaidEdit/', // GitHub Pages 部署路径
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})