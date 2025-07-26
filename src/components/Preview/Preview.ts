import mermaid from 'mermaid'
import { AppStore } from '@/store/AppStore'

export class Preview {
  private store: AppStore
  private element: HTMLElement
  private previewContainer: HTMLElement | null = null

  constructor(store: AppStore) {
    this.store = store
    this.element = document.createElement('div')
    this.element.className = 'h-full flex flex-col'
    
    // 初始化mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    })
    
    this.render()
    this.bindEvents()
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">实时预览</h2>
      </div>
      <div class="flex-1 p-4 overflow-auto">
        <div id="mermaid-preview" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-full">
          <div class="text-center text-gray-500 py-8">
            <p>输入Mermaid代码后点击"生成图表"查看预览</p>
          </div>
        </div>
      </div>
    `

    this.previewContainer = this.element.querySelector('#mermaid-preview')
    return this.element
  }

  private bindEvents() {
    // 监听mermaid更新事件
    document.addEventListener('mermaid-update', (e: Event) => {
      const customEvent = e as CustomEvent
      this.renderChart(customEvent.detail.code)
    })

    // 订阅状态变化
    this.store.subscribe(() => {
      const state = this.store.getState()
      if (state.currentChart) {
        this.renderChart(state.currentChart.mermaidCode)
      }
    })
  }

  private async renderChart(code: string) {
    if (!this.previewContainer || !code.trim()) {
      return
    }

    try {
      // 清空预览容器
      this.previewContainer.innerHTML = ''
      
      // 生成图表
      const { svg } = await mermaid.render('mermaid-chart', code)
      this.previewContainer.innerHTML = svg
      
    } catch (error) {
      this.previewContainer.innerHTML = `
        <div class="text-center text-red-500 py-8">
          <p class="font-semibold">图表生成失败</p>
          <p class="text-sm mt-2">${error instanceof Error ? error.message : '未知错误'}</p>
        </div>
      `
    }
  }
}