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
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Mermaid代码</h2>
          <span class="text-sm text-gray-500">实时预览，输入即可看到效果</span>
        </div>
      </div>
      <div class="flex-1 p-4">
        <textarea 
          id="mermaid-editor" 
          class="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="在此输入Mermaid图表代码..."
        ></textarea>
      </div>
      <div class="p-4 border-t border-gray-200">
          <div class="flex items-start space-x-2">
          <textarea 
            id="ai-prompt" 
            class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm resize-none transition-all duration-200" 
            style="height: 40px; min-height: 40px;"
            placeholder="用AI生成图表，如：创建一个用户登录流程图"
          ></textarea>
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
    const aiPrompt = this.element.querySelector('#ai-prompt') as HTMLTextAreaElement
    const aiGenerateBtn = this.element.querySelector('#ai-generate-btn')
    
    // 防抖定时器
    let debounceTimer: NodeJS.Timeout
    
    this.textarea?.addEventListener('input', () => {
      const state = this.store.getState()
      if (state.currentChart) {
        // 更新状态（立即更新，用于保存）
        this.store.updateChart(state.currentChart.id, {
          mermaidCode: this.textarea!.value
        })
        
        // 防抖渲染（300ms 延迟）
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          const code = this.textarea!.value.trim()
          if (code) {
            // 触发预览更新
            const event = new CustomEvent('mermaid-update', { detail: { code } })
            document.dispatchEvent(event)
          }
        }, 300)
      }
    })

    // AI输入框动态高度调整
    aiPrompt?.addEventListener('focus', () => {
      // 获得焦点时增加高度
      aiPrompt.style.height = '320px'
    })

    aiPrompt?.addEventListener('blur', () => {
      // 失去焦点时恢复原始高度
      aiPrompt.style.height = '40px'
    })

    // AI生成按钮
    aiGenerateBtn?.addEventListener('click', () => {
      const prompt = aiPrompt?.value.trim()
      if (!prompt) {
        alert('请输入AI生成提示词')
        return
      }

      // 点击生成按钮后恢复输入框高度
       aiPrompt.style.height = '40px'
       aiPrompt.blur() // 移除焦点

      document.dispatchEvent(new CustomEvent('generate-with-ai', {
        detail: { prompt }
      }))
    })

    // AI提示框回车事件（Ctrl+Enter或Cmd+Enter提交）
    aiPrompt?.addEventListener('keypress', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && aiGenerateBtn) {
        e.preventDefault()
        ;(aiGenerateBtn as HTMLButtonElement).click()
      }
    })
  }

  private updateFromStore() {
    const state = this.store.getState()
    if (this.textarea && state.currentChart) {
      this.textarea.value = state.currentChart.mermaidCode
    }
  }


}