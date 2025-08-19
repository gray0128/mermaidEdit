import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // GitHub Pages 需要的基础路径配置
  base: '/mermaidEdit/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 React 相关库分割到单独的 chunk
          react: ['react', 'react-dom'],
          // 将状态管理相关库分割到单独的 chunk
          zustand: ['zustand'],
          // 将 UI 组件库分割到单独的 chunk
          ui: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-toast', 'lucide-react'],
          // 将编辑器相关库分割到单独的 chunk
          editor: ['@codemirror/view', '@codemirror/state', '@codemirror/lang-javascript', '@codemirror/theme-one-dark'],
        },
      },
    },
    // 减小包体积
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境时移除 console
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'mermaid'],
  },
})