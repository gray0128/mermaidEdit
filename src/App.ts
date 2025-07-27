import { Header } from '@/layouts/Header/Header'
import { SplitView } from '@/layouts/SplitView/SplitView'
import { ConfigModal } from '@/components/ConfigModal/ConfigModal'
import { ShareModal } from '@/components/ShareModal/ShareModal'
import { StorageService } from '@/services/StorageService'
import { AIService } from '@/services/AIService'
import { ExportService } from '@/services/ExportService'
import { AppStore } from '@/store/AppStore'

export class App {
  private container: HTMLElement
  private store: AppStore
  private aiService: AIService

  constructor(container: HTMLElement) {
    this.container = container
    this.store = new AppStore()
    this.aiService = new AIService()
    this.init()
  }

  private async init() {
    this.container.className = 'h-screen flex flex-col';
    await this.setupServices();
    this.setupUI();
    this.bindEvents();
  }

  private async setupServices(): Promise<void> {
    // 加载AI配置
    const aiConfig = StorageService.getAIConfig();
    if (aiConfig) {
      this.aiService.setConfig(aiConfig);
    }

    // 创建默认图表（如果没有当前图表）
    const state = this.store.getState();
    if (!state.currentChart) {
      const defaultChart = {
        id: 'default-' + Date.now(),
        title: '新建图表',
        mermaidCode: '', // 初始为空，让用户自己输入或使用AI生成
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.store.setCurrentChart(defaultChart);
    }

    // 同步离线数据
    await StorageService.syncOfflineQueue();
    // 定期同步
    setInterval(() => StorageService.syncOfflineQueue(), 5 * 60 * 1000); // 每5分钟同步一次
  }

  private setupUI(): void {
    // 创建头部
    const header = new Header(this.store)
    this.container.appendChild(header.render())
    
    // 创建主视图
    const mainView = new SplitView(this.store)
    this.container.appendChild(mainView.render())
  }

  private bindEvents(): void {
    // 配置按钮事件
    document.addEventListener('open-config', () => {
      const modal = new ConfigModal(() => {
        // 重新加载配置
        const aiConfig = StorageService.getAIConfig()
        if (aiConfig) {
          this.aiService.setConfig(aiConfig)
        }
      })
      modal.open()
    })

    // 分享按钮事件
    document.addEventListener('share-chart', (e: Event) => {
      const customEvent = e as CustomEvent
      const chartId = customEvent.detail?.chartId;
      if (chartId) {
        const modal = new ShareModal(chartId);
        modal.open();
      }
    })

    // 导出事件
    document.addEventListener('export-png', (e: Event) => {
      const customEvent = e as CustomEvent
      const svgElement = customEvent.detail?.svgElement
      if (svgElement) {
        ExportService.exportAsPNG(svgElement).catch(error => {
          alert(error.message)
        })
      }
    })

    document.addEventListener('export-svg', (e: Event) => {
      const customEvent = e as CustomEvent
      const svgElement = customEvent.detail?.svgElement
      if (svgElement) {
        ExportService.exportAsSVG(svgElement)
      }
    })

    document.addEventListener('export-mermaid', (e: Event) => {
      const customEvent = e as CustomEvent
      const mermaidCode = customEvent.detail?.mermaidCode
      if (mermaidCode) {
        ExportService.exportAsMermaid(mermaidCode)
      }
    })

    // AI生成事件
    document.addEventListener('generate-with-ai', async (e: Event) => {
      const customEvent = e as CustomEvent
      const prompt = customEvent.detail?.prompt
      const currentCode = customEvent.detail?.currentCode || ''
      
      if (prompt) {
        let success = false
        try {
          if (this.store.getState().currentChart?.id) {
            this.store.setLoading(true);
            
            // 根据是否有现有代码构建不同的prompt
            let finalPrompt = prompt
            if (currentCode) {
              finalPrompt = `请基于以下现有的Mermaid代码进行修改：

\`\`\`mermaid
${currentCode}
\`\`\`

用户要求：${prompt}

请返回修改后的完整Mermaid代码。`
            }
            
            const mermaidCode = await this.aiService.generateMermaid(finalPrompt);
            const currentChart = this.store.getState().currentChart;
            if (currentChart && currentChart.id) {
              this.store.updateChart(currentChart.id, { mermaidCode });
              
              // 触发实时渲染
              setTimeout(() => {
                const event = new CustomEvent('mermaid-update', { detail: { code: mermaidCode } })
                document.dispatchEvent(event)
              }, 100)
              
              success = true
            } else {
              alert('没有选中的图表，无法更新。');
            }
          } else {
            alert('请先选择一个图表');
          }
        } catch (error) {
          console.error('AI生成失败:', error)
          alert(error instanceof Error ? error.message : 'AI生成失败')
        } finally {
          this.store.setLoading(false)
          
          // 触发AI生成完成事件
          document.dispatchEvent(new CustomEvent('ai-generation-complete', {
            detail: { success }
          }))
        }
      }
    })
  }
}