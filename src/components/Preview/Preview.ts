import mermaid from 'mermaid'
import { AppStore } from '@/store/AppStore'

export class Preview {
  private store: AppStore
  private element: HTMLElement
  private previewContainer: HTMLElement | null = null
  private currentScale: number = 1
  private minScale: number = 0.1
  private maxScale: number = 3
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private translateX: number = 0
  private translateY: number = 0

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
    
    // 强制初始化mermaid，确保首次粘贴能正常渲染
    this.initializeMermaid()
    
    // 初始渲染当前图表
    const state = this.store.getState()
    if (state.currentChart && state.currentChart.mermaidCode.trim()) {
      this.renderChart(state.currentChart.mermaidCode)
    }
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
        <div id="mermaid-preview" class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-full transition-transform duration-200" style="transform: translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale}); transform-origin: top left;">
          <div class="text-center text-gray-500 py-8">
            <p>输入Mermaid代码即可看到实时预览</p>
          </div>
        </div>
      </div>
    `

    this.previewContainer = this.element.querySelector('#mermaid-preview')
    
    // 绑定缩放控制事件（在DOM创建后立即绑定）
    this.bindZoomEvents()
    
    return this.element
  }

  private bindEvents() {
    // 订阅状态变化
    this.store.subscribe(() => {
      const state = this.store.getState()
      if (state.currentChart) {
        this.renderChart(state.currentChart.mermaidCode)
      } else {
        // 如果没有当前图表，显示默认提示
        this.renderChart('')
      }
    })
  }

  private bindZoomEvents() {
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

    // 添加拖拽功能
    this.bindDragEvents()
  }

  private bindDragEvents() {
    if (!this.previewContainer) return

    // 鼠标按下开始拖拽
    this.previewContainer.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true
      this.dragStartX = e.clientX - this.translateX
      this.dragStartY = e.clientY - this.translateY
      this.previewContainer!.style.cursor = 'grabbing'
      e.preventDefault()
    })

    // 鼠标移动时拖拽 - 直接更新，不使用RAF以获得最佳响应性
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return
      
      // 立即更新位置，确保跟手性
      this.translateX = e.clientX - this.dragStartX
      this.translateY = e.clientY - this.dragStartY
      
      // 直接更新transform，获得最佳响应速度
      if (this.previewContainer) {
        this.previewContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale})`
      }
    })

    // 鼠标松开结束拖拽
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false
        this.previewContainer!.style.cursor = 'grab'
      }
    })

    // 设置初始光标样式
    this.previewContainer.style.cursor = 'grab'
    
    // 防止拖拽时选中文本
    this.previewContainer.addEventListener('selectstart', (e) => {
      if (this.isDragging) {
        e.preventDefault()
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
    this.translateX = 0
    this.translateY = 0
    this.updateZoom()
  }

  private updateZoom() {
    const zoomLevelElement = this.element.querySelector('#zoom-level') as HTMLElement
    
    if (zoomLevelElement) {
      zoomLevelElement.textContent = `${Math.round(this.currentScale * 100)}%`
    }
    
    this.updateTransform()
  }

  private updateTransform() {
    if (this.previewContainer) {
      this.previewContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale})`
    }
  }

  private async initializeMermaid() {
    // 强制初始化mermaid，确保首次粘贴能正常渲染
    try {
      // 使用一个简单的图表来初始化mermaid
      const initCode = 'graph TD\n    A[开始] --> B[结束]'
      await mermaid.render('mermaid-init', initCode)
      console.log('Mermaid 初始化成功')
    } catch (error) {
      console.warn('Mermaid 初始化失败:', error)
    }
  }

  private async renderChart(code: string) {
    if (!this.previewContainer) {
      return
    }

    // 如果代码为空，显示默认提示
    if (!code.trim()) {
      this.previewContainer.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <p>输入Mermaid代码即可看到实时预览</p>
        </div>
      `
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