import { Header } from '@/layouts/Header/Header'
import { SplitView } from '@/layouts/SplitView/SplitView'
import { ConfigModal } from '@/components/ConfigModal/ConfigModal'
import { ShareModal } from '@/components/ShareModal/ShareModal'
import { ChartList } from '@/components/ChartList/ChartList'
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

    // 加载图表列表
    try {
      const charts = await StorageService.getAllCharts();
      console.log(`成功加载 ${charts.length} 个图表`);
      charts.forEach(chart => this.store.addChart(chart));
    } catch (error) {
      console.warn('加载图表列表失败，将从空列表开始:', error);
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
    
    // 创建主容器
    const mainContainer = document.createElement('div')
    mainContainer.className = 'flex flex-1 overflow-hidden'
    
    // 创建图表列表侧边栏
    const chartList = new ChartList(this.store)
    const sidebar = document.createElement('div')
    sidebar.className = 'w-80 border-r border-gray-200 bg-gray-50 flex-shrink-0'
    sidebar.appendChild(chartList.render())
    mainContainer.appendChild(sidebar)
    
    // 创建主视图
    const mainView = new SplitView(this.store)
    const mainContent = document.createElement('div')
    mainContent.className = 'flex-1 overflow-hidden'
    mainContent.appendChild(mainView.render())
    mainContainer.appendChild(mainContent)
    
    this.container.appendChild(mainContainer)
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
      
      console.log('收到AI生成事件:', { prompt, currentCode })
      
      if (!prompt) {
        console.error('AI生成事件缺少prompt参数')
        return
      }
      
      let success = false
      try {
        const currentChart = this.store.getState().currentChart
        if (!currentChart?.id) {
          console.error('没有当前图表，无法执行AI生成')
          alert('请先创建一个图表')
          return
        }
        
        console.log('开始AI生成，设置加载状态')
        this.store.setLoading(true)
        
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
        
        console.log('调用AI服务生成代码')
        const mermaidCode = await this.aiService.generateMermaid(finalPrompt)
        
        console.log('AI生成成功，更新图表代码')
        this.store.updateChart(currentChart.id, { mermaidCode })
        
        // 触发实时渲染
        setTimeout(() => {
          console.log('触发预览更新')
          const event = new CustomEvent('mermaid-update', { detail: { code: mermaidCode } })
          document.dispatchEvent(event)
        }, 100)
        
        success = true
        console.log('AI生成完成')
        
      } catch (error) {
        console.error('AI生成失败:', error)
        const errorMessage = error instanceof Error ? error.message : 'AI生成失败'
        alert(errorMessage)
      } finally {
        console.log('清除加载状态')
        this.store.setLoading(false)
        
        // 触发AI生成完成事件
        console.log('触发AI生成完成事件:', { success })
        document.dispatchEvent(new CustomEvent('ai-generation-complete', {
          detail: { success }
        }))
      }
    })
  }
}