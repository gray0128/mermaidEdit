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
  provider: string // 支持任意服务商名称
  apiKey: string
  baseUrl: string // 必填，API端点地址
  model: string // 必填，模型名称
  authType?: 'bearer' | 'api-key' | 'custom' // 认证方式
  customHeaders?: Record<string, string> // 自定义请求头
}

// NocoDB配置类型
export interface NocoDBConfig {
  baseUrl: string
  apiToken: string
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