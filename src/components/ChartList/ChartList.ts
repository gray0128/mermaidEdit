import { AppStore } from '@/store/AppStore'
import { ChartData } from '@/types'
import { StorageService } from '@/services/StorageService'

export class ChartList {
  private store: AppStore
  private element: HTMLElement
  private unsubscribe: (() => void) | null = null

  constructor(store: AppStore) {
    this.store = store
    this.element = document.createElement('div')
    this.element.className = 'h-full flex flex-col bg-gray-50 border-r border-gray-200'
    this.init()
  }

  private async init() {
    await this.loadCharts()
    this.render()
    this.bindEvents()
    
    // 订阅store变化
    this.unsubscribe = this.store.subscribe(() => {
      this.render()
    })
  }

  private async loadCharts() {
    try {
      // 从存储服务加载图表列表
      const charts = await StorageService.getChartsFromNocoDB()
      // 更新store中的图表列表
      this.store.setState({ charts })
    } catch (error) {
      console.error('加载图表列表失败:', error)
      // 如果云端加载失败，尝试从本地加载
      // 这里可以添加本地存储的加载逻辑
    }
  }

  render(): HTMLElement {
    const state = this.store.getState()
    const { charts, currentChart } = state

    this.element.innerHTML = `
      <div class="p-4 border-b border-gray-200 bg-white">
        <h2 class="text-lg font-semibold text-gray-900">图表列表</h2>
        <p class="text-sm text-gray-500 mt-1">共 ${charts.length} 个图表</p>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        ${charts.length === 0 ? this.renderEmptyState() : this.renderChartList(charts, currentChart)}
      </div>
      
      <div class="p-4 border-t border-gray-200 bg-white">
        <button id="refresh-charts" class="w-full btn-secondary text-sm">
          <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          刷新列表
        </button>
      </div>
    `

    return this.element
  }

  private renderEmptyState(): string {
    return `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无图表</h3>
        <p class="text-gray-500 mb-4">创建您的第一个图表开始使用</p>
        <button id="create-first-chart" class="btn-primary">
          创建图表
        </button>
      </div>
    `
  }

  private renderChartList(charts: ChartData[], currentChart: ChartData | null): string {
    return `
      <div class="divide-y divide-gray-200">
        ${charts.map(chart => this.renderChartItem(chart, currentChart?.id === chart.id)).join('')}
      </div>
    `
  }

  private renderChartItem(chart: ChartData, isActive: boolean): string {
    const createdDate = new Date(chart.createdAt).toLocaleDateString()
    const updatedDate = new Date(chart.updatedAt).toLocaleDateString()
    const isUpdated = createdDate !== updatedDate

    return `
      <div class="chart-item p-4 hover:bg-gray-100 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-r-2 border-blue-500' : 'bg-white'
      }" data-chart-id="${chart.id}">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              ${chart.title || '未命名图表'}
            </h3>
            <div class="mt-1 flex items-center text-xs text-gray-500">
              <span>创建于 ${createdDate}</span>
              ${isUpdated ? `<span class="ml-2">• 更新于 ${updatedDate}</span>` : ''}
            </div>
            <div class="mt-2 text-xs text-gray-400 truncate">
              ${this.getChartTypeFromCode(chart.mermaidCode)}
            </div>
          </div>
          <div class="ml-2 flex items-center space-x-1">
            ${isActive ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                当前
              </span>
            ` : ''}
            <button class="delete-chart p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors" 
                    data-chart-id="${chart.id}" 
                    title="删除图表">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
  }

  private getChartTypeFromCode(mermaidCode: string): string {
    const code = mermaidCode.toLowerCase()
    
    if (code.includes('flowchart') || code.includes('graph')) {
      return '流程图'
    } else if (code.includes('sequencediagram')) {
      return '时序图'
    } else if (code.includes('classdiagram')) {
      return '类图'
    } else if (code.includes('statediagram')) {
      return '状态图'
    } else if (code.includes('gantt')) {
      return '甘特图'
    } else if (code.includes('pie')) {
      return '饼图'
    } else if (code.includes('mindmap')) {
      return '思维导图'
    } else if (code.includes('erdiagram')) {
      return '实体关系图'
    } else if (code.includes('journey')) {
      return '用户旅程图'
    } else {
      return '图表'
    }
  }

  private bindEvents(): void {
    // 图表项点击事件
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
      // 处理删除按钮点击
      if (target.closest('.delete-chart')) {
        e.stopPropagation()
        const chartId = target.closest('.delete-chart')?.getAttribute('data-chart-id')
        if (chartId) {
          this.handleDeleteChart(chartId)
        }
        return
      }
      
      // 处理图表项点击
      const chartItem = target.closest('.chart-item')
      if (chartItem) {
        const chartId = chartItem.getAttribute('data-chart-id')
        if (chartId) {
          this.handleSelectChart(chartId)
        }
      }
      
      // 处理创建第一个图表按钮
      if (target.id === 'create-first-chart') {
        this.handleCreateChart()
      }
      
      // 处理刷新按钮
      if (target.id === 'refresh-charts') {
        this.handleRefreshCharts()
      }
    })
  }

  private async handleSelectChart(chartId: string): Promise<void> {
    try {
      const chart = await StorageService.getChart(chartId)
      if (chart) {
        this.store.setCurrentChart(chart)
        // 触发图表更新事件
        document.dispatchEvent(new CustomEvent('mermaid-update', {
          detail: { code: chart.mermaidCode }
        }))
      }
    } catch (error) {
      console.error('加载图表失败:', error)
      alert('加载图表失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  private async handleDeleteChart(chartId: string): Promise<void> {
    const state = this.store.getState()
    const chart = state.charts.find(c => c.id === chartId)
    
    if (!chart) return
    
    const confirmed = confirm(`确定要删除图表 "${chart.title || '未命名图表'}" 吗？此操作不可撤销。`)
    if (!confirmed) return
    
    try {
      // 从存储服务删除
      await StorageService.deleteChart(chartId)
      
      // 从store中删除
      this.store.deleteChart(chartId)
      
      // 如果删除的是当前图表，清空当前图表
      if (state.currentChart?.id === chartId) {
        this.store.setCurrentChart(null)
        // 清空编辑器和预览
        document.dispatchEvent(new CustomEvent('mermaid-update', {
          detail: { code: '' }
        }))
      }
      
      this.showNotification('图表删除成功', 'success')
    } catch (error) {
      console.error('删除图表失败:', error)
      this.showNotification('删除图表失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
    }
  }

  private handleCreateChart(): void {
    // 触发新建图表事件
    const newChart = {
      id: `chart-${Date.now()}`,
      title: '新建图表',
      mermaidCode: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.store.addChart(newChart)
    this.store.setCurrentChart(newChart)
    
    // 清空编辑器
    document.dispatchEvent(new CustomEvent('mermaid-update', {
      detail: { code: '' }
    }))
  }

  private async handleRefreshCharts(): Promise<void> {
    try {
      await this.loadCharts()
      this.showNotification('图表列表已刷新', 'success')
    } catch (error) {
      console.error('刷新图表列表失败:', error)
      this.showNotification('刷新失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
    }
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // 创建通知元素
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`
    notification.textContent = message
    
    // 添加到页面
    document.body.appendChild(notification)
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  getElement(): HTMLElement {
    return this.element
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }
}