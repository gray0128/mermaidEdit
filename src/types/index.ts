// 图表数据类型
export interface ChartData {
  id: string
  title: string
  mermaidCode: string
  createdAt: Date
  updatedAt: Date
}

// AI配置类型
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseUrl?: string
  model?: string
}

// NocoDB配置类型
export interface NocoDBConfig {
  baseUrl: string
  apiToken: string
  projectId: string
  tableId: string
}

// 应用状态类型
export interface AppState {
  currentChart: ChartData | null
  charts: ChartData[]
  isLoading: boolean
  error: string | null
}

// 分享配置类型
export interface ShareConfig {
  chartId: string
  readonly: boolean
}