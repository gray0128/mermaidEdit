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

    saveBtn?.addEventListener('click', () => {
      // 保存逻辑将在后续实现
      console.log('保存图表')
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
}