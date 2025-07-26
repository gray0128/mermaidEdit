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
      if (prompt) {
        try {
          if (this.store.getState().currentChart?.id) {
            this.store.setLoading(true);
            const mermaidCode = await this.aiService.generateMermaid(prompt);
            const currentChart = this.store.getState().currentChart;
            if (currentChart && currentChart.id) {
              this.store.updateChart(currentChart.id, { mermaidCode });
            } else {
              alert('没有选中的图表，无法更新。');
            }
          } else {
            alert('请先选择一个图表');
          }
        } catch (error) {
          alert(error instanceof Error ? error.message : 'AI生成失败')
        } finally {
          this.store.setLoading(false)
        }
      }
    })
  }
}