import { AppStore } from '@/store/AppStore'
import { StorageService } from '@/services/StorageService'

export class Editor {
  private store: AppStore
  private element: HTMLElement
  private textarea: HTMLTextAreaElement | null = null
  private cloudSyncTimer: NodeJS.Timeout | null = null
  private saveStatusElement: HTMLElement | null = null
  private lastSavedCode: string = ''

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
          <div class="flex items-center space-x-2">
            <span id="save-status" class="text-sm text-gray-500">
              <span class="inline-flex items-center">
                <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                已保存
              </span>
            </span>
            <span class="text-sm text-gray-400">|</span>
            <button id="sync-cloud-btn" class="text-sm text-blue-600 hover:text-blue-800 transition-colors" title="立即同步到云端">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
              </svg>
              同步云端
            </button>
            <span class="text-sm text-gray-400">|</span>
            <span class="text-sm text-gray-500">实时预览，输入即可看到效果</span>
          </div>
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
            placeholder="用AI生成或修改图表，如：创建一个用户登录流程图 / 添加错误处理分支 / 修改颜色样式"
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
    const aiGenerateBtn = this.element.querySelector('#ai-generate-btn') as HTMLButtonElement
    const syncCloudBtn = this.element.querySelector('#sync-cloud-btn') as HTMLButtonElement
    this.saveStatusElement = this.element.querySelector('#save-status')
    
    // 防抖定时器
    let debounceTimer: NodeJS.Timeout
    
    this.textarea?.addEventListener('input', () => {
      const state = this.store.getState()
      if (state.currentChart) {
        const currentCode = this.textarea!.value
        
        // 更新状态（立即更新）
        this.store.updateChart(state.currentChart.id, {
          mermaidCode: currentCode,
          updatedAt: new Date()
        })
        
        // 实时保存到本地（无延迟）
        this.saveToLocal(state.currentChart.id, currentCode)
        
        // 防抖渲染（300ms 延迟）
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          const code = currentCode.trim()
          // 即使代码为空也要触发预览更新，确保清空时显示提示
          const event = new CustomEvent('mermaid-update', { detail: { code } })
          document.dispatchEvent(event)
        }, 300)
        
        // 更新按钮状态（代码内容变化时）
        updateButtonState()
      }
    })

    // AI输入框内容变化时更新按钮状态
    const updateButtonState = () => {
      const hasContent = aiPrompt?.value.trim().length > 0
      const hasCode = (this.textarea?.value.trim().length || 0) > 0
      const state = this.store.getState()
      
      if (hasContent && !state.isLoading) {
        aiGenerateBtn.className = 'btn-primary px-4 py-2 text-sm transition-all duration-200'
        aiGenerateBtn.disabled = false
        // 根据是否有现有代码显示不同的按钮文字
        aiGenerateBtn.innerHTML = hasCode ? 'AI修改' : 'AI生成'
      } else if (state.isLoading) {
        aiGenerateBtn.className = 'bg-blue-400 text-white px-4 py-2 text-sm cursor-not-allowed transition-all duration-200'
        aiGenerateBtn.disabled = true
        aiGenerateBtn.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>${hasCode ? '修改中...' : '生成中...'}</span>
          </div>
        `
      } else {
        aiGenerateBtn.className = 'btn-secondary px-4 py-2 text-sm transition-all duration-200'
        aiGenerateBtn.disabled = false
        aiGenerateBtn.innerHTML = hasCode ? 'AI修改' : 'AI生成'
      }
    }

    // 监听输入变化
    aiPrompt?.addEventListener('input', updateButtonState)
    
    // 监听store状态变化
    this.store.subscribe(() => {
      updateButtonState()
    })
    
    // 初始化按钮状态
    updateButtonState()

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
    aiGenerateBtn?.addEventListener('click', (e) => {
      e.preventDefault() // 防止默认行为
      
      // 检查按钮是否被禁用
      if (aiGenerateBtn.disabled) {
        console.log('按钮已禁用，忽略点击')
        return
      }
      
      const prompt = aiPrompt?.value.trim()
      if (!prompt) {
        alert('请输入AI生成提示词')
        return
      }
      
      // 检查是否正在加载中
      const state = this.store.getState()
      if (state.isLoading) {
        console.log('正在处理中，请稍候')
        return
      }
      
      // 检查是否有当前图表
      if (!state.currentChart) {
        alert('请先创建一个图表')
        return
      }

      // 获取当前代码区域的内容
      const currentCode = this.textarea?.value.trim() || ''
      
      console.log('触发AI生成事件:', { prompt, currentCode })
      
      // 点击生成按钮后恢复输入框高度
      aiPrompt.style.height = '40px'
      aiPrompt.blur() // 移除焦点

      document.dispatchEvent(new CustomEvent('generate-with-ai', {
        detail: { 
          prompt,
          currentCode // 传递当前代码内容
        }
      }))
    })

    // 监听AI生成完成事件
    document.addEventListener('ai-generation-complete', (e: Event) => {
      const customEvent = e as CustomEvent
      const success = customEvent.detail?.success
      
      // 显示完成提醒
      this.showNotification(
        success ? 'AI生成完成！' : 'AI生成失败，请重试',
        success ? 'success' : 'error'
      )
      
      // 清空输入框
      if (success && aiPrompt) {
        aiPrompt.value = ''
        updateButtonState()
      }
    })

    // AI提示框回车事件（Ctrl+Enter或Cmd+Enter提交）
    aiPrompt?.addEventListener('keypress', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && aiGenerateBtn) {
        e.preventDefault()
        ;(aiGenerateBtn as HTMLButtonElement).click()
      }
    })

    // 粘贴事件处理，确保粘贴后能立即渲染
    this.textarea?.addEventListener('paste', () => {
      // 使用 setTimeout 确保在粘贴内容已经插入到 textarea 后再处理
      setTimeout(() => {
        const code = this.textarea!.value.trim()
        const event = new CustomEvent('mermaid-update', { detail: { code } })
        document.dispatchEvent(event)
      }, 10)
    })

    // 定时云端同步（30秒延迟）
    this.textarea?.addEventListener('input', () => {
      this.scheduleCloudSync()
    })

    // 立即同步到云端按钮
    syncCloudBtn?.addEventListener('click', async () => {
      if (syncCloudBtn.disabled) {
        return
      }
      
      syncCloudBtn.disabled = true
      syncCloudBtn.innerHTML = `
        <svg class="w-4 h-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        同步中...
      `
      
      try {
        await this.immediateSyncToCloud()
      } finally {
        syncCloudBtn.disabled = false
        syncCloudBtn.innerHTML = `
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          同步云端
        `
      }
    })
  }

  private updateFromStore() {
    const state = this.store.getState()
    if (this.textarea && state.currentChart) {
      const newCode = state.currentChart.mermaidCode
      
      // 只有当代码真的发生变化时才更新textarea和lastSavedCode
      if (this.textarea.value !== newCode) {
        this.textarea.value = newCode
        this.lastSavedCode = newCode
        console.log('Editor: 从store更新代码，重置lastSavedCode')
      }
      
      // 触发预览更新
      const code = newCode.trim()
      const event = new CustomEvent('mermaid-update', { detail: { code } })
      document.dispatchEvent(event)
    }
  }

  private async saveToLocal(chartId: string, code: string): Promise<void> {
    try {
      const state = this.store.getState()
      const currentChart = state.currentChart
      if (!currentChart || currentChart.id !== chartId) {
        console.error('当前图表不匹配或不存在，跳过保存')
        return
      }

      // 更新保存状态为"保存中..."
      this.updateSaveStatus('saving', '保存中...')

      // 创建规范化后的图表对象
      const updatedChart = {
        id: chartId,
        title: currentChart.title,
        mermaidCode: code,
        createdAt: currentChart.createdAt,
        updatedAt: new Date()
      }

      console.log('保存到本地，图表ID:', chartId, '代码长度:', code.length)
      console.log('保存前的图表数据:', currentChart)
      console.log('保存后的图表数据:', updatedChart)
      console.log('保存前lastSavedCode长度:', this.lastSavedCode?.length || 0)

      // 保存到本地
      await StorageService.saveChartToLocal(updatedChart)
      this.lastSavedCode = code
      
      console.log('保存后lastSavedCode长度:', this.lastSavedCode?.length || 0)
      console.log('图表已保存到本地')
      
      // 更新保存状态为"已保存"
      this.updateSaveStatus('saved', '已保存')
    } catch (error) {
      console.error('保存到本地失败:', error)
      this.updateSaveStatus('error', '保存失败')
    }
  }

  private scheduleCloudSync(): void {
    // 清除之前的定时器
    if (this.cloudSyncTimer) {
      clearTimeout(this.cloudSyncTimer)
    }

    // 30秒后执行云端同步
    this.cloudSyncTimer = setTimeout(async () => {
      await this.syncToCloud()
    }, 30000)
  }

  // 立即同步到云端（用于测试）
  private async immediateSyncToCloud(): Promise<void> {
    if (this.cloudSyncTimer) {
      clearTimeout(this.cloudSyncTimer)
      this.cloudSyncTimer = null
    }
    await this.syncToCloud()
  }

  private async syncToCloud(): Promise<void> {
    const state = this.store.getState()
    const currentChart = state.currentChart
    const currentCode = currentChart?.mermaidCode || ''
    const lastSavedCode = this.lastSavedCode || ''
    
    console.log('同步检查:', {
      hasCurrentChart: !!currentChart,
      currentCodeLength: currentCode.length,
      lastSavedCodeLength: lastSavedCode.length,
      codesAreEqual: currentCode === lastSavedCode,
      currentChartId: currentChart?.id
    })
    
    if (!currentChart || currentCode === lastSavedCode) {
      console.log('没有更改，跳过云端同步')
      return // 没有更改，无需同步
    }

    try {
      this.updateSaveStatus('syncing', '同步到云端...')
      console.log('开始同步到云端...')

      const updatedChart = {
        ...currentChart,
        mermaidCode: currentCode,
        updatedAt: new Date()
      }

      console.log('NocoDB 配置检查:', {
        hasConfig: !!StorageService.getNocoDBConfig(),
        config: StorageService.getNocoDBConfig()
      })

      // 保存到云端
      await StorageService.saveChart(updatedChart)
      this.lastSavedCode = currentCode
      
      this.updateSaveStatus('saved', '已保存到云端')
      console.log('图表已同步到云端')
    } catch (error) {
      console.error('同步到云端失败:', error)
      this.updateSaveStatus('error', '云端同步失败')
    }
  }

  private updateSaveStatus(status: 'saved' | 'saving' | 'syncing' | 'error', text: string): void {
    if (!this.saveStatusElement) return

    const statusConfig = {
      saved: {
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
        color: 'text-green-500'
      },
      saving: {
        icon: '<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
        color: 'text-blue-500'
      },
      syncing: {
        icon: '<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
        color: 'text-purple-500'
      },
      error: {
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
        color: 'text-red-500'
      }
    }

    const config = statusConfig[status]
    this.saveStatusElement.innerHTML = `
      <span class="inline-flex items-center">
        <svg class="w-4 h-4 mr-1 ${config.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${config.icon}
        </svg>
        ${text}
      </span>
    `
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    // 创建通知元素
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${type === 'success' 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
          }
        </svg>
        <span>${message}</span>
      </div>
    `
    
    // 添加到页面
    document.body.appendChild(notification)
    
    // 动画显示
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
    }, 100)
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(full)'
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }
}