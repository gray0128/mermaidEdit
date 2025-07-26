import { AppStore } from '@/store/AppStore'

export class Editor {
  private store: AppStore
  private element: HTMLElement
  private textarea: HTMLTextAreaElement | null = null

  constructor(store: AppStore) {
    this.store = store
    this.element = document.createElement('div')
    this.element.className = 'h-full flex flex-col'
    this.render()
    
    // 订阅状态变化
    this.store.subscribe(() => this.updateFromStore())
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Mermaid代码</h2>
      </div>
      <div class="flex-1 p-4">
        <textarea 
          id="mermaid-editor" 
          class="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="在此输入Mermaid图表代码..."
        ></textarea>
      </div>
      <div class="p-4 border-t border-gray-200 space-y-2">
        <button id="generate-btn" class="btn-primary w-full">
          生成图表
        </button>
        <div class="flex space-x-2">
          <input 
            type="text" 
            id="ai-prompt" 
            class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" 
            placeholder="用AI生成图表，如：创建一个用户登录流程图"
          >
          <button id="ai-generate-btn" class="btn-secondary px-4 py-2 text-sm">
            AI生成
          </button>
        </div>
      </div>
    `

    this.textarea = this.element.querySelector('#mermaid-editor') as HTMLTextAreaElement
    this.bindEvents()
    this.updateFromStore()
    
    return this.element
  }

  private bindEvents() {
    const generateBtn = this.element.querySelector('#generate-btn')
    const aiPrompt = this.element.querySelector('#ai-prompt') as HTMLInputElement
    const aiGenerateBtn = this.element.querySelector('#ai-generate-btn')
    
    generateBtn?.addEventListener('click', () => this.handleGenerate())
    
    this.textarea?.addEventListener('input', () => {
      const state = this.store.getState()
      if (state.currentChart) {
        this.store.updateChart(state.currentChart.id, {
          mermaidCode: this.textarea!.value
        })
      }
    })

    // AI生成按钮
    aiGenerateBtn?.addEventListener('click', () => {
      const prompt = aiPrompt?.value.trim()
      if (!prompt) {
        alert('请输入AI生成提示词')
        return
      }

      document.dispatchEvent(new CustomEvent('generate-with-ai', {
        detail: { prompt }
      }))
    })

    // AI提示框回车事件
    aiPrompt?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && aiGenerateBtn) {
        (aiGenerateBtn as HTMLButtonElement).click();
      }
    })
  }

  private updateFromStore() {
    const state = this.store.getState()
    if (this.textarea && state.currentChart) {
      this.textarea.value = state.currentChart.mermaidCode
    }
  }

  private handleGenerate() {
    if (this.textarea) {
      const code = this.textarea.value.trim()
      if (code) {
        // 触发预览更新
        const event = new CustomEvent('mermaid-update', { detail: { code } })
        document.dispatchEvent(event)
      }
    }
  }
}