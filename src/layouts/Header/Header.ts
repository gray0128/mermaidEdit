import { AppStore } from '@/store/AppStore'

export class Header {
  private store: AppStore
  private element: HTMLElement

  constructor(store: AppStore) {
    this.store = store
    this.element = document.createElement('header')
    this.element.className = 'bg-white border-b border-gray-200 px-4 py-3'
    this.render()
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-bold text-gray-900">MermaidEdit</h1>
          <span class="text-sm text-gray-500">在线Mermaid图表编辑器</span>
        </div>
        
        <div class="flex items-center space-x-2">
          <button id="new-chart-btn" class="btn-primary">
            新建图表
          </button>
          <button id="save-btn" class="btn-secondary">
            保存
          </button>
          <button id="share-btn" class="btn-secondary">
            分享
          </button>
          <div class="relative group">
            <button class="btn-secondary" id="export-btn">
              导出
              <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" id="export-png">
                导出为PNG
              </button>
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" id="export-svg">
                导出为SVG
              </button>
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" id="export-mermaid">
                导出为Mermaid代码
              </button>
            </div>
          </div>
          <button id="config-btn" class="btn-secondary">
            配置
          </button>
        </div>
      </div>
    `

    this.bindEvents()
    return this.element
  }

  private bindEvents() {
    const newBtn = this.element.querySelector('#new-chart-btn')
    const saveBtn = this.element.querySelector('#save-btn')
    const shareBtn = this.element.querySelector('#share-btn')
    const configBtn = this.element.querySelector('#config-btn')
    const exportPngBtn = this.element.querySelector('#export-png')
    const exportSvgBtn = this.element.querySelector('#export-svg')
    const exportMermaidBtn = this.element.querySelector('#export-mermaid')

    newBtn?.addEventListener('click', () => {
      const newChart = {
        id: `chart-${Date.now()}`,
        title: '新建图表',
        mermaidCode: 'graph TD\n    A[开始] --> B[结束]',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.store.addChart(newChart);
      this.store.setCurrentChart(newChart);
    })

    saveBtn?.addEventListener('click', async () => {
      const currentChart = this.store.getState().currentChart
      if (!currentChart) {
        alert('没有可保存的图表')
        return
      }
      
      if (!currentChart.mermaidCode || currentChart.mermaidCode.trim() === '') {
        alert('请先输入图表内容再保存')
        return
      }
      
      try {
        // 设置保存中状态
        this.store.setLoading(true)
        this.showSaveNotification('保存中...', 'info')
        
        let chartTitle = currentChart.title
        
        // 如果图表标题为空或是默认标题，使用AI生成新标题
        if (!chartTitle || chartTitle === '新建图表' || chartTitle === '未命名图表') {
          try {
            this.showSaveNotification('AI生成标题中...', 'info')
            const { AIService } = await import('@/services/AIService')
            const aiService = new AIService()
            
            // 加载AI配置
            const { StorageService } = await import('@/services/StorageService')
            const aiConfig = StorageService.getAIConfig()
            if (aiConfig) {
              aiService.setConfig(aiConfig)
              chartTitle = await aiService.generateChartTitle(currentChart.mermaidCode)
              console.log('AI生成的标题:', chartTitle)
            } else {
              console.log('AI配置未设置，使用默认标题')
              chartTitle = this.generateDefaultTitle(currentChart.mermaidCode)
            }
          } catch (aiError) {
            console.warn('AI生成标题失败，使用默认标题:', aiError)
            chartTitle = this.generateDefaultTitle(currentChart.mermaidCode)
          }
        }
        
        // 更新图表数据
        const updatedChart = {
          ...currentChart,
          title: chartTitle,
          updatedAt: new Date()
        }
        
        // 保存到存储服务
        const { StorageService } = await import('@/services/StorageService')
        const savedChart = await StorageService.saveChart(updatedChart)
        
        // 更新store中的图表数据
        this.store.setCurrentChart(savedChart)
        
        // 确保图表在列表中
        const state = this.store.getState()
        const existingChartIndex = state.charts.findIndex(c => c.id === savedChart.id || c.id === updatedChart.id)
        if (existingChartIndex >= 0) {
          // 更新现有图表
          this.store.updateChart(savedChart.id, savedChart)
        } else {
          // 添加新图表到列表
          this.store.addChart(savedChart)
        }
        
        // 显示保存成功提示
        this.showSaveNotification(`保存成功: ${chartTitle}`)
        
      } catch (error) {
        console.error('保存图表失败:', error)
        this.showSaveNotification('保存失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
      } finally {
        this.store.setLoading(false)
      }
    })

    shareBtn?.addEventListener('click', () => {
      const chart = this.store.getState().currentChart
      if (chart?.id) {
        document.dispatchEvent(new CustomEvent('share-chart', {
          detail: { chartId: chart.id }
        }))
      } else {
        alert('请先保存图表后再分享')
      }
    })

    configBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-config'))
    })

    exportPngBtn?.addEventListener('click', () => {
      this.handleExportWithSvg('export-png')
    })

    exportSvgBtn?.addEventListener('click', () => {
      this.handleExportWithSvg('export-svg')
    })

    exportMermaidBtn?.addEventListener('click', () => {
      const mermaidCode = this.store.getState().currentChart?.mermaidCode
      if (mermaidCode) {
        document.dispatchEvent(new CustomEvent('export-mermaid', {
          detail: { mermaidCode }
        }))
      } else {
        alert('请先生成图表')
      }
    })
  }

  private handleExportWithSvg(eventType: string) {
    const svgElement = document.querySelector('#preview-container svg')
    if (svgElement) {
      document.dispatchEvent(new CustomEvent(eventType, {
        detail: { svgElement }
      }))
    } else {
      alert('请先生成图表')
    }
  }

  private showSaveNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    // 创建通知元素
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500'
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

  private generateDefaultTitle(mermaidCode: string): string {
    const lines = mermaidCode.trim().split('\n')
    const firstLine = lines[0]?.trim() || ''
    
    // 尝试从第一行提取图表类型
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
      return '流程图'
    } else if (firstLine.includes('sequenceDiagram')) {
      return '时序图'
    } else if (firstLine.includes('classDiagram')) {
      return '类图'
    } else if (firstLine.includes('erDiagram')) {
      return '实体关系图'
    } else if (firstLine.includes('gantt')) {
      return '甘特图'
    } else if (firstLine.includes('pie')) {
      return '饼图'
    } else if (firstLine.includes('gitgraph')) {
      return 'Git图'
    } else if (firstLine.includes('mindmap')) {
      return '思维导图'
    } else {
      return '图表'
    }
  }
}