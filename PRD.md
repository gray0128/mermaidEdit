# mermaidEdit 产品需求文档

## 1. 产品概述

### 1.1 产品定位
一个简洁美观的在线 mermaid 图表编辑器，专注于提供高效的图表创建和分享体验。

### 1.2 目标用户
- 技术人员：需要快速创建技术文档中的图表
- 产品经理：需要制作流程图、时序图等
- 学生和教育工作者：需要制作教学图表

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 图表编辑
- **代码编辑器**
  - 基础文本编辑功能
  - 支持快捷键操作
  - AI 提示输入框（支持动态高度调整）
  - 提交快捷键：Ctrl/Cmd + Enter

- **实时预览**
  - 左右分屏布局（左侧 40% 编辑器，右侧 60% 预览）
  - 实时渲染图表
  - 支持图表缩放（鼠标滚轮 + 按钮控制）
  - 支持图表拖拽移动
  - 支持图表重置视图

#### 2.1.2 AI 辅助生成
- **配置界面**
  - 提供配置弹窗，包含以下字段：
    - 提供商选择（OpenAI/Anthropic/自定义）
    - Base URL（文本输入框，可选）
    - API Key（密码输入框，必填）
    - 模型名称（文本输入框，可选）
  - 配置信息保存在 localStorage

- **生成功能**
  - 提供自然语言输入框（支持动态高度调整）
  - 支持生成后替换当前代码
  - 显示生成进度和错误提示
  - 支持 OpenAI 和 Anthropic 两种 AI 提供商

#### 2.1.3 数据持久化
- **nocodb 集成**
  - 配置界面包含：
    - API 地址（文本输入框，必填）
    - API Key（密码输入框，必填）
    - 表名（文本输入框，必填，默认值：mermaid_charts）
  - 自动创建表结构（如表不存在）
  - 实时同步（每次修改后 1 秒内同步）
  - 离线缓存（IndexedDB），网络恢复后自动同步

#### 2.1.4 分享功能
- **生成分享链接**
  - 格式：`https://[domain]/share/[chart-id]`
  - 分享页面为只读模式
  - 支持复制链接按钮
  - 支持二维码分享

#### 2.1.5 导出功能
- **导出选项**
  - PNG 导出（无背景，透明背景）
  - SVG 导出（无背景，压缩优化）
  - 支持设置导出文件名（默认：chart-[timestamp]）

### 2.2 用户体验

#### 2.2.1 界面设计
- **整体风格**
  - 使用 Tailwind CSS 默认主题
  - 简洁的白色背景设计
  - 圆角按钮和输入框
  - 适当的阴影和过渡效果

- **布局结构**
  ```
  ┌─────────────────────────────────────┐
  │ 顶部导航栏                           │
  │ [Logo] mermaidEdit    [配置] [分享]  │
  ├─────────────────┬───────────────────┤
  │                 │                   │
  │   代码编辑器     │    图表预览区      │
  │                 │                   │
  │                 │                   │
  │                 │                   │
  └─────────────────┴───────────────────┘
  ```

#### 2.2.2 交互设计
- **加载状态**
  - 骨架屏加载
  - 进度条显示
  - 友好的错误提示

- **操作反馈**
  - 按钮点击有视觉反馈
  - 成功操作显示 toast 提示
  - 错误操作显示错误提示

## 3. 技术规范

### 3.1 技术栈
- **前端框架**：原生 TypeScript（无框架依赖）
- **样式框架**：Tailwind CSS 3.x
- **图表渲染**：mermaid.js 最新版本
- **构建工具**：Vite
- **包管理**：npm
- **本地存储**：IndexedDB（通过 idb 库）

### 3.2 浏览器兼容性
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### 3.3 性能要求
- 首屏加载时间 < 2秒
- 图表渲染时间 < 500ms
- 内存占用 < 100MB

## 4. 数据结构设计

### 4.1 nocodb 表结构
```sql
CREATE TABLE mermaid_charts (
  id VARCHAR(36) PRIMARY KEY,        -- 图表ID
  title VARCHAR(255),                -- 图表标题
  mermaidCode TEXT,                  -- mermaid 代码
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 本地存储结构
```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface NocoDBConfig {
  baseUrl: string;
  apiToken: string;
  projectId: string;
  tableId: string;
}

interface ChartData {
  id: string;
  title: string;
  mermaidCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 5. API 设计

### 5.1 nocodb API 使用
- **基础 URL**：`https://[nocodb-domain]/api/v2`
- **认证方式**：`xc-auth` header
- **常用端点**：
  - `GET /tables/[tableId]/records` - 获取图表列表
  - `POST /tables/[tableId]/records` - 创建图表
  - `PATCH /tables/[tableId]/records/[recordId]` - 更新图表
  - `GET /tables/[tableId]/records/[recordId]` - 获取单个图表

### 5.2 AI API 调用
- **请求格式**：OpenAI 兼容格式
- **端点**：`[baseUrl]/v1/chat/completions`
- **请求示例**：
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "请根据以下描述生成 mermaid 图表代码：..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

## 6. 错误处理

### 6.1 错误类型
- **网络错误**：显示"网络连接失败，请检查网络后重试"
- **API 错误**：显示具体的错误信息
- **渲染错误**：显示"图表格式错误，请检查代码"并提供错误位置
- **配置错误**：引导用户检查配置信息

### 6.2 错误提示样式
- 使用 toast 通知
- 红色背景，白色文字
- 3 秒后自动消失
- 支持手动关闭

## 7. 部署方案

### 7.1 静态部署
- 支持部署到 Vercel、Netlify、GitHub Pages
- 支持 CDN 加速
- 支持自定义域名

### 7.2 环境变量
```bash
# 可选的环境变量
VITE_DEFAULT_NOCODB_URL=https://api.nocodb.com
VITE_DEFAULT_TABLE_NAME=mermaid_charts
```

## 8. 开发计划

### 8.1 第一阶段（MVP）
- [ ] 基础项目搭建
- [ ] 代码编辑器实现
- [ ] 图表渲染功能
- [ ] nocodb 集成
- [ ] 基础 UI 实现

### 8.2 第二阶段（功能完善）
- [ ] AI 集成功能
- [ ] 分享功能
- [ ] 导出功能
- [ ] 错误处理优化

### 8.3 第三阶段（体验优化）
- [ ] 性能优化
- [ ] 缓存策略优化
- [ ] 用户体验改进

## 9. 测试策略

### 9.1 功能测试
- 图表创建和编辑
- 数据同步测试
- 分享链接测试
- 导出功能测试

### 9.2 兼容性测试
- 不同浏览器测试
- 不同分辨率测试
- 网络异常测试

## 10. 监控指标

### 10.1 用户行为
- 图表创建数量
- 分享链接访问次数
- AI 生成功能使用频率
- 导出功能使用频率

### 10.2 性能指标
- 页面加载时间
- 图表渲染时间
- API 响应时间
- 错误发生率