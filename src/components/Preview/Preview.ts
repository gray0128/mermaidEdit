import mermaid from 'mermaid'
import { AppStore } from '@/store/AppStore'

export class Preview {
  private store: AppStore
  private element: HTMLElement
  private previewContainer: HTMLElement | null = null
  private currentScale: number = 1
  private minScale: number = 0.1
  private maxScale: number = 3

  constructor(store: AppStore) {
    this.store = store
    this.element = document.createElement('div')
    this.element.className = 'h-full flex flex-col'
    
    // 初始化mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict' // 设置为'strict'以避免CSP问题
    })
    
    this.render()
    this.bindEvents()
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">实时预览</h2>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500" id="zoom-level">${Math.round(this.currentScale * 100)}%</span>
            <button id="zoom-out" class="p-1 rounded hover:bg-gray-100" title="缩小">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
            </button>
            <button id="zoom-reset" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" title="重置缩放">
              重置
            </button>
            <button id="zoom-in" class="p-1 rounded hover:bg-gray-100" title="放大">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="flex-1 p-4 overflow-auto" id="preview-scroll-container">
        <div id="mermaid-preview" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-full transition-transform duration-200" style="transform: scale(${this.currentScale}); transform-origin: top left;">
          <div class="text-center text-gray-500 py-8">
            <p>输入Mermaid代码即可看到实时预览</p>
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

    // 缩放控制事件
    const zoomInBtn = this.element.querySelector('#zoom-in')
    const zoomOutBtn = this.element.querySelector('#zoom-out')
    const zoomResetBtn = this.element.querySelector('#zoom-reset')
    const previewScrollContainer = this.element.querySelector('#preview-scroll-container')

    zoomInBtn?.addEventListener('click', () => this.zoomIn())
    zoomOutBtn?.addEventListener('click', () => this.zoomOut())
    zoomResetBtn?.addEventListener('click', () => this.resetZoom())

    // 鼠标滚轮缩放（按住 Ctrl 键）
    previewScrollContainer?.addEventListener('wheel', (e: Event) => {
      const wheelEvent = e as WheelEvent
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        e.preventDefault()
        if (wheelEvent.deltaY < 0) {
          this.zoomIn()
        } else {
          this.zoomOut()
        }
      }
    })
  }

  private zoomIn() {
    if (this.currentScale < this.maxScale) {
      this.currentScale = Math.min(this.currentScale + 0.1, this.maxScale)
      this.updateZoom()
    }
  }

  private zoomOut() {
    if (this.currentScale > this.minScale) {
      this.currentScale = Math.max(this.currentScale - 0.1, this.minScale)
      this.updateZoom()
    }
  }

  private resetZoom() {
    this.currentScale = 1
    this.updateZoom()
  }

  private updateZoom() {
    const previewElement = this.element.querySelector('#mermaid-preview') as HTMLElement
    const zoomLevelElement = this.element.querySelector('#zoom-level') as HTMLElement
    
    if (previewElement) {
      previewElement.style.transform = `scale(${this.currentScale})`
    }
    
    if (zoomLevelElement) {
      zoomLevelElement.textContent = `${Math.round(this.currentScale * 100)}%`
    }
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