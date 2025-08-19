/**
 * 环境配置工具
 */

// 环境类型
export type Environment = 'development' | 'test' | 'production'

// 获取当前环境
export function getEnvironment(): Environment {
  if (import.meta.env.MODE === 'development') {
    return 'development'
  } else if (import.meta.env.MODE === 'test') {
    return 'test'
  } else {
    return 'production'
  }
}

// 检查是否为生产环境
export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

// 检查是否为开发环境
export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}

// 检查是否为测试环境
export function isTest(): boolean {
  return getEnvironment() === 'test'
}

// 获取应用配置
export function getAppConfig() {
  return {
    title: import.meta.env.VITE_APP_TITLE || 'Mermaid Edit',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'A web-based editor for Mermaid diagrams',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
    enableErrorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
    errorTrackingId: import.meta.env.VITE_ERROR_TRACKING_ID || '',
  }
}

// 获取 API 基础 URL
export function getApiBaseUrl(): string {
  return getAppConfig().apiBaseUrl
}

// 检查是否启用分析
export function isAnalyticsEnabled(): boolean {
  return isProduction() && getAppConfig().enableAnalytics
}

// 检查是否启用错误跟踪
export function isErrorTrackingEnabled(): boolean {
  return isProduction() && getAppConfig().enableErrorTracking
}