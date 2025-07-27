import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './', // 使用相对路径支持双域名访问
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