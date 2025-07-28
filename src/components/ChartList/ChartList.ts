import { AppStore } from '@/store/AppStore'
import { ChartData } from '@/types'
import { StorageService } from '@/services/StorageService'

export class ChartList {
  private store: AppStore
  private element: HTMLElement
  private unsubscribe: (() => void) | null = null
  private isLoading: boolean = false

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
      this.isLoading = true
      this.render()
      
      // 并行加载云端和本地图表，提高性能
      const [cloudCharts, localCharts] = await Promise.allSettled([
        StorageService.getChartsFromNocoDB(),
        this.getLocalCharts()
      ])
      
      let charts: ChartData[] = []
      
      // 处理云端图表
      if (cloudCharts.status === 'fulfilled' && cloudCharts.value.length > 0) {
        charts = cloudCharts.value
        console.log(`从云端加载了 ${cloudCharts.value.length} 个图表`)
      }
      
      // 处理本地图表（仅在云端无数据时或作为补充）
      if (localCharts.status === 'fulfilled' && localCharts.value.length > 0) {
        if (charts.length === 0) {
          charts = localCharts.value
          console.log(`从本地加载了 ${localCharts.value.length} 个图表`)
        } else {
          // 合并并去重（优先保留云端数据）
          const localIds = new Set(charts.map(c => c.id))
          const uniqueLocalCharts = localCharts.value.filter(c => !localIds.has(c.id))
          charts.push(...uniqueLocalCharts)
          if (uniqueLocalCharts.length > 0) {
            console.log(`补充了 ${uniqueLocalCharts.length} 个本地图表`)
          }
        }
      }
      
      // 按更新时间排序（最新的在前）
      charts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      
      // 更新store中的图表列表
      this.store.setState({ charts })
      console.log(`总共加载了 ${charts.length} 个图表`)
      
    } catch (error) {
      console.error('加载图表列表失败:', error)
      // 如果加载失败，设置为空列表
      this.store.setState({ charts: [] })
    } finally {
      this.isLoading = false
      this.render()
    }
  }

  private async getLocalCharts(): Promise<ChartData[]> {
    try {
      const db = await StorageService['getDB']()
      const tx = db.transaction('charts', 'readonly')
      const store = tx.objectStore('charts')
      const charts = await store.getAll()
      await tx.done
      return charts || []
    } catch (error) {
      console.error('从本地数据库获取图表失败:', error)
      return []
    }
  }

  render(): HTMLElement {
    const state = this.store.getState()
    const { charts, currentChart } = state

    this.element.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 class="text-base font-semibold text-gray-900">图表列表</h2>
        <p class="text-xs text-gray-500 mt-0.5">共 ${charts.length} 个图表</p>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        ${this.isLoading ? this.renderLoadingState() : 
          charts.length === 0 ? this.renderEmptyState() : this.renderChartList(charts, currentChart)}
      </div>
      
      <div class="p-4 border-t border-gray-200 bg-white">
        <button id="refresh-charts" class="w-full btn-secondary text-sm ${this.isLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
                ${this.isLoading ? 'disabled' : ''}>
          <svg class="w-4 h-4 mr-2 inline ${this.isLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${this.isLoading ? 
              '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>' :
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>'
            }
          </svg>
          ${this.isLoading ? '加载中...' : '刷新列表'}
        </button>
      </div>
    `

    return this.element
  }

  private renderLoadingState(): string {
    return `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg class="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">加载图表列表</h3>
        <p class="text-gray-500">正在从云端和本地加载图表...</p>
      </div>
    `
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
    const createdDate = this.formatDateTime(chart.createdAt instanceof Date ? chart.createdAt.toISOString() : chart.createdAt)
    const updatedDate = this.formatDateTime(chart.updatedAt instanceof Date ? chart.updatedAt.toISOString() : chart.updatedAt)
    const isUpdated = chart.createdAt !== chart.updatedAt

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

  private formatDateTime(dateString: string): string {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
        // Preview组件会自动通过store订阅更新预览，无需手动触发事件
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
        // Preview组件会自动通过store订阅更新预览，无需手动触发事件
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
    // Preview组件会自动通过store订阅更新预览，无需手动触发事件
  }

  private async handleRefreshCharts(): Promise<void> {
    if (this.isLoading) {
      console.log('正在加载中，忽略刷新请求')
      return
    }
    
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
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${type === 'success' 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
          }
        </svg>
        <span class="font-medium">${message}</span>
      </div>
    `
    
    // 添加到页面
    document.body.appendChild(notification)
    
    // 动画显示
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
    }, 100)
    
    // 3秒后自动移除
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
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