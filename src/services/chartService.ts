import { db } from '../lib/db'
import { ChartData, createChartData, updateChartData } from '../types'

export class ChartService {
  private static instance: ChartService
  private charts: ChartData[] = []
  private currentChart: ChartData | null = null
  private initialized = false

  static getInstance(): ChartService {
    if (!ChartService.instance) {
      ChartService.instance = new ChartService()
    }
    return ChartService.instance
  }

  async init(): Promise<void> {
    if (this.initialized) return
    
    try {
      await db.init()
      await this.loadCharts()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize chart service:', error)
      throw error
    }
  }

  private async loadCharts(): Promise<void> {
    try {
      this.charts = await db.getAllCharts()
      
      // 如果没有图表，创建一个默认图表
      if (this.charts.length === 0) {
        const defaultChart = createChartData()
        await this.saveChart(defaultChart)
        this.charts = [defaultChart]
        this.currentChart = defaultChart
      } else {
        // 默认选择最新创建的图表
        this.currentChart = this.charts[0]
      }
    } catch (error) {
      console.error('Failed to load charts:', error)
      throw error
    }
  }

  async saveChart(chart: ChartData): Promise<void> {
    try {
      await db.saveChart(chart)
      
      // 更新内存中的图表列表
      const existingIndex = this.charts.findIndex(c => c.id === chart.id)
      if (existingIndex >= 0) {
        this.charts[existingIndex] = chart
      } else {
        this.charts.unshift(chart) // 添加到开头，因为是最新的
      }
      
      // 如果保存的是当前图表，更新当前图表引用
      if (this.currentChart?.id === chart.id) {
        this.currentChart = chart
      }
    } catch (error) {
      console.error('Failed to save chart:', error)
      throw error
    }
  }

  async getChart(id: string): Promise<ChartData | null> {
    try {
      const chart = await db.getChart(id)
      return chart || null
    } catch (error) {
      console.error('Failed to get chart:', error)
      throw error
    }
  }

  async deleteChart(id: string): Promise<void> {
    try {
      await db.deleteChart(id)
      
      // 从内存中删除
      this.charts = this.charts.filter(c => c.id !== id)
      
      // 如果删除的是当前图表，切换到另一个图表
      if (this.currentChart?.id === id) {
        this.currentChart = this.charts[0] || null
        
        // 如果没有图表了，创建一个新的
        if (!this.currentChart) {
          const newChart = createChartData()
          await this.saveChart(newChart)
          this.currentChart = newChart
        }
      }
    } catch (error) {
      console.error('Failed to delete chart:', error)
      throw error
    }
  }

  async createNewChart(name: string = 'Untitled Chart', content: string = ''): Promise<ChartData> {
    const newChart = createChartData(name, content)
    await this.saveChart(newChart)
    this.currentChart = newChart
    return newChart
  }

  async updateCurrentChart(updates: Partial<Omit<ChartData, 'id' | 'createdAt'>>): Promise<void> {
    if (!this.currentChart) {
      throw new Error('No current chart selected')
    }
    
    const updatedChart = updateChartData(this.currentChart, updates)
    await this.saveChart(updatedChart)
  }

  async setCurrentChart(id: string): Promise<void> {
    const chart = await this.getChart(id)
    if (!chart) {
      throw new Error(`Chart with id ${id} not found`)
    }
    this.currentChart = chart
  }

  getCharts(): ChartData[] {
    return [...this.charts]
  }

  getCurrentChart(): ChartData | null {
    return this.currentChart
  }

  async exportChartData(): Promise<string> {
    return JSON.stringify(this.charts, null, 2)
  }

  async importChartData(jsonData: string): Promise<void> {
    try {
      const importedCharts = JSON.parse(jsonData) as ChartData[]
      
      // 验证导入的数据
      if (!Array.isArray(importedCharts)) {
        throw new Error('Invalid chart data format')
      }
      
      // 保存所有导入的图表
      for (const chart of importedCharts) {
        // 确保图表有必要的字段
        if (!chart.id || !chart.name || !chart.content) {
          console.warn('Skipping invalid chart:', chart)
          continue
        }
        
        // 为导入的图表生成新的 ID，避免冲突
        const newChart = createChartData(chart.name, chart.content)
        await this.saveChart(newChart)
      }
      
      // 重新加载图表列表
      await this.loadCharts()
    } catch (error) {
      console.error('Failed to import chart data:', error)
      throw error
    }
  }
}

export const chartService = ChartService.getInstance()