# 图表列表和AI命名功能实现计划

## 功能需求分析

### 功能1：图表列表管理
- 显示已保存的图表列表
- 点击列表项可切换到对应图表
- 支持删除图表操作
- 显示图表创建/更新时间

### 功能2：AI自动生成图表名称
- 保存时自动调用AI生成有意义的图表名称
- 基于Mermaid代码内容智能命名
- 名称持久化保存到数据库

## 技术实现计划

### 阶段1：扩展AIService - AI命名功能
- [ ] 在AIService中添加`generateChartTitle`方法
- [ ] 设计专门的AI提示词用于生成图表标题
- [ ] 处理AI响应和错误情况

### 阶段2：创建图表列表组件
- [ ] 创建`ChartList`组件 (`src/components/ChartList/ChartList.ts`)
- [ ] 实现图表列表的渲染和交互
- [ ] 添加删除、选择图表功能
- [ ] 集成到主界面布局

### 阶段3：修改保存逻辑
- [ ] 更新Header组件的保存按钮逻辑
- [ ] 集成AI命名功能到保存流程
- [ ] 确保图表正确添加到列表
- [ ] 处理命名失败的降级方案

### 阶段4：更新UI布局
- [ ] 修改SplitView布局包含图表列表
- [ ] 调整界面比例和响应式设计
- [ ] 优化用户体验和交互流程

### 阶段5：数据持久化
- [ ] 确保图表列表正确同步到StorageService
- [ ] 验证本地和云端存储功能
- [ ] 测试离线同步机制

## 详细技术设计

### AI命名功能设计
```typescript
// AIService新增方法
async generateChartTitle(mermaidCode: string): Promise<string>
```

### 图表列表组件设计
```typescript
interface ChartListProps {
  charts: ChartData[]
  currentChartId: string | null
  onSelectChart: (chart: ChartData) => void
  onDeleteChart: (chartId: string) => void
}
```

### 保存流程更新
1. 用户点击保存
2. 检查当前图表是否有标题
3. 如果没有标题，调用AI生成
4. 保存图表到存储服务
5. 更新图表列表状态
6. 显示保存成功通知

## 风险和注意事项

1. **AI调用失败处理**：提供默认命名方案
2. **性能考虑**：图表列表过多时的分页或虚拟滚动
3. **用户体验**：保存过程中的加载状态提示
4. **数据一致性**：确保列表和当前图表状态同步

## 测试计划

1. **单元测试**：AI命名功能、图表列表组件
2. **集成测试**：保存流程、数据同步
3. **用户体验测试**：界面交互、错误处理
4. **性能测试**：大量图表时的性能表现