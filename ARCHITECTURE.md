# mermaidEdit 系统架构设计文档

## 1. 总体架构

### 1.1 架构概览
```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   UI 组件    │  │  状态管理    │  │  工具函数    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      业务逻辑层                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  图表管理    │  │  AI 服务    │  │  存储服务    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      数据访问层                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  nocodb API │  │  IndexedDB  │  │ localStorage │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术架构特点
- **纯前端架构**：无后端服务，所有逻辑在浏览器端执行
- **模块化设计**：清晰的模块边界和职责分离
- **事件驱动**：基于自定义事件实现模块间通信
- **渐进增强**：核心功能优先，逐步添加增强功能

## 2. 模块设计

### 2.1 核心模块划分

#### 2.1.1 UI 组件层
```typescript
// 模块结构
src/
├── components/          // 基础组件
│   ├── Editor/         // 代码编辑器组件
│   ├── Preview/        // 图表预览组件
│   ├── ConfigModal/    // 配置弹窗组件
│   └── ShareModal/     // 分享弹窗组件
├── layouts/            // 布局组件
│   ├── Header/         // 顶部导航
│   └── SplitView/      // 分屏布局
└── styles/             // 样式文件
    └── main.css        // 主样式文件
```

#### 2.1.2 业务逻辑层
```typescript
// 核心服务
services/
├── AIService.ts        // AI 生成服务
├── StorageService.ts   // 存储服务
└── ExportService.ts    // 导出服务
```

#### 2.1.3 数据管理层
```typescript
// 数据管理
store/
└── AppStore.ts         // 应用状态管理（统一状态管理）

types/
└── index.ts           // 类型定义
```

### 2.2 模块职责说明

| 模块名称 | 主要职责 | 依赖关系 |
|---------|----------|----------|
| Editor | 代码编辑、AI 提示输入、事件处理 | 依赖 AppStore |
| Preview | 图表渲染、缩放控制、拖拽、错误展示 | 依赖 AppStore、mermaid.js |
| AIService | AI 调用、多提供商支持、错误处理 | 独立服务 |
| StorageService | IndexedDB 操作、NocoDB API 调用、离线同步 | 依赖 idb 库 |
| ExportService | 图表导出、格式转换 | 独立服务 |
| AppStore | 统一状态管理、事件订阅 | 核心状态管理 |

## 3. 数据流设计

### 3.1 数据流向图
```
用户输入 → Editor → AppStore → Preview
                    ↓
               StorageService → IndexedDB
                    ↓
               NocoDB API (可选)
```

### 3.2 状态管理设计

#### 3.2.1 全局状态结构
```typescript
interface AppState {
  currentChart: ChartData | null;
  charts: ChartData[];
  isLoading: boolean;
  error: string | null;
}

interface ChartData {
  id: string;
  title: string;
  mermaidCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3.2.2 状态更新机制
- **单向数据流**：UI → Action → Store → UI
- **不可变更新**：使用结构化克隆确保状态不可变
- **批量更新**：合并短时间内的多次更新

### 3.3 事件系统设计

#### 3.3.1 自定义事件类型
```typescript
// 事件定义
interface AppEvents {
  'open-config': void;
  'share-chart': { chartId: string };
  'export-png': { svgElement: SVGElement };
  'export-svg': { svgElement: SVGElement };
  'export-mermaid': { mermaidCode: string };
  'generate-with-ai': { prompt: string };
  'mermaid-updated': { code: string };
}
```

#### 3.3.2 事件总线实现
```typescript
class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  on<T extends keyof AppEvents>(
    event: T, 
    callback: (data: AppEvents[T]) => void
  ): void;
  
  emit<T extends keyof AppEvents>(
    event: T, 
    data: AppEvents[T]
  ): void;
}
```

## 4. 存储架构

### 4.1 存储层次结构
```
┌─────────────────┐
│   nocodb API    │ 云端主存储
├─────────────────┤
│   IndexedDB     │ 本地缓存
├─────────────────┤
│  localStorage   │ 配置存储
├─────────────────┤
│  SessionStorage │ 临时状态
└─────────────────┘
```

### 4.2 数据同步策略

#### 4.2.1 同步机制
- **实时同步**：每次修改后 1 秒内触发同步
- **冲突解决**：最后写入优先（基于 updated_at 时间戳）
- **离线处理**：网络恢复后自动同步离线期间的更改

#### 4.2.2 缓存策略
- **LRU 缓存**：最多缓存 50 个最近使用的图表
- **增量更新**：只同步变更的字段
- **压缩存储**：使用 LZ-string 压缩图表内容

### 4.3 数据一致性保证

#### 4.3.1 版本控制
```typescript
interface ChartVersion {
  id: string;
  version: number;
  checksum: string;  // 内容校验和
  updatedAt: string;
}
```

#### 4.3.2 冲突检测
- 基于时间戳的冲突检测
- 内容哈希验证完整性
- 用户手动解决冲突的界面

## 5. 安全设计

### 5.1 数据安全
- **敏感信息加密**：API keys 使用 AES 加密存储
- **HTTPS 强制**：所有 API 调用必须使用 HTTPS
- **输入验证**：所有用户输入进行 XSS 过滤

### 5.2 配置安全
```typescript
// 加密存储示例
class SecureStorage {
  private key: CryptoKey;
  
  async encrypt(data: string): Promise<string>;
  async decrypt(encrypted: string): Promise<string>;
}
```

### 5.3 内容安全策略（CSP）
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline';">
```

## 6. 性能优化

### 6.1 渲染优化
- **虚拟滚动**：大数据量时的编辑器优化
- **防抖渲染**：输入防抖 300ms
- **Web Worker**：mermaid 渲染在 Worker 中执行

### 6.2 网络优化
- **请求缓存**：API 响应缓存 5 分钟
- **批量请求**：合并多个同步请求
- **CDN 加速**：静态资源使用 CDN

### 6.3 内存优化
- **组件卸载**：及时清理事件监听器
- **垃圾回收**：定期清理过期缓存
- **内存监控**：开发模式下内存使用监控

## 7. 错误处理架构

### 7.1 错误分类
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  RENDER = 'RENDER',
  STORAGE = 'STORAGE',
  CONFIG = 'CONFIG'
}

interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
}
```

### 7.2 错误恢复机制
- **自动重试**：网络错误 3 次重试
- **优雅降级**：离线模式使用本地缓存
- **用户指导**：提供具体的解决步骤

## 8. 扩展性设计

### 8.1 插件架构
```typescript
interface Plugin {
  name: string;
  version: string;
  activate: (context: PluginContext) => void;
  deactivate?: () => void;
}

interface PluginContext {
  registerCommand: (command: Command) => void;
  registerComponent: (component: Component) => void;
  getStore: () => AppState;
}
```

### 8.2 主题系统
- **CSS 变量**：基于 Tailwind CSS 的主题变量
- **动态加载**：支持运行时主题切换
- **自定义主题**：用户可上传自定义 CSS

### 8.3 国际化支持
- **i18n 框架**：基于浏览器 Intl API
- **语言包**：JSON 格式的翻译文件
- **动态加载**：按需加载语言包

## 9. 开发规范

### 9.1 代码规范
- **TypeScript 严格模式**：启用所有严格检查
- **ESLint 配置**：使用 Airbnb 规范
- **代码格式化**：Prettier 统一格式

### 9.2 目录规范
```
src/
├── assets/          // 静态资源
├── components/       // 可复用组件
├── services/         // 业务服务
├── store/           // 状态管理
├── types/           // 类型定义
├── utils/           // 工具函数
└── styles/          // 样式文件
```

### 9.3 命名规范
- **文件命名**：kebab-case（例：chart-service.ts）
- **类命名**：PascalCase（例：ChartService）
- **函数命名**：camelCase（例：getChartById）
- **常量命名**：UPPER_SNAKE_CASE（例：API_ENDPOINT）

## 10. 部署架构

### 10.1 构建配置
- **Vite 配置**：优化打包和开发体验
- **环境变量**：区分开发、测试、生产环境
- **代码分割**：按路由和组件分割代码

### 10.2 CI/CD 流程
```yaml
# GitHub Actions 示例
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: peaceiris/actions-gh-pages@v3
```

### 10.3 监控配置
- **性能监控**：Core Web Vitals 指标
- **错误监控**：Sentry 集成
- **用户分析**：Google Analytics 集成