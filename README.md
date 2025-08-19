# Mermaid Edit

一个基于 Web 的 Mermaid 图表编辑器，支持实时预览和本地存储。

## 功能特点

- 🎨 **实时预览**：编辑代码时实时预览图表效果
- 💾 **本地存储**：使用 IndexedDB 本地存储图表数据
- 📱 **响应式设计**：支持桌面和移动设备
- 🌙 **暗色主题**：支持明暗主题切换
- 📤 **多种导出格式**：支持导出为 SVG、PNG 等格式
- ⌨️ **快捷键支持**：提供常用操作的快捷键
- 🔍 **语法验证**：实时验证 Mermaid 语法错误

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite
- **状态管理**：Zustand
- **代码编辑器**：CodeMirror
- **图表渲染**：Mermaid
- **样式**：Tailwind CSS + Radix UI
- **测试**：Vitest + Testing Library

## 开发环境设置

### 前提条件

- Node.js 18 或更高版本
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 运行测试

```bash
npm run test
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── ui/             # UI 组件
│   ├── CodeEditor.tsx  # 代码编辑器
│   ├── MermaidPreview.tsx  # 图表预览
│   └── ...
├── hooks/              # 自定义 hooks
├── lib/                # 工具函数
├── services/           # 服务层
├── store/              # 状态管理
├── types/              # TypeScript 类型定义
└── test/               # 测试文件
```

## 部署

### GitHub Pages

项目已配置 GitHub Actions 自动部署到 GitHub Pages。

1. 将代码推送到 `main` 分支
2. GitHub Actions 会自动构建并部署到 GitHub Pages
3. 访问 `https://your-username.github.io/mermaidEdit/` 查看部署的应用

### 其他平台

您也可以将项目部署到其他平台，如 Netlify、Vercel 等：

1. 构建项目：`npm run build`
2. 将 `dist` 目录上传到您的托管平台

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
