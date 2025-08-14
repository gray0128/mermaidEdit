import { AppState, ChartData } from '@/types'
import { StorageService } from '@/services/StorageService'

export class AppStore {
  private state: AppState
  private listeners: Set<() => void>

  constructor() {
    this.state = {
      currentChart: null,
      charts: [],
      isLoading: false,
      error: null
    }
    this.listeners = new Set()
  }

  getState(): AppState {
    return { ...this.state }
  }

  setState(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }

  // 图表相关操作
  setCurrentChart(chart: ChartData | null) {
    this.setState({ currentChart: chart })
  }

  addChart(chart: ChartData) {
    this.setState({ 
      charts: [...this.state.charts, chart],
      currentChart: chart 
    })
  }

  async updateChart(id: string, updates: Partial<ChartData>) {
    const charts = this.state.charts.map(chart =>
      chart.id === id ? { ...chart, ...updates, updatedAt: new Date() } : chart
    )
    const currentChart = this.state.currentChart?.id === id
      ? { ...this.state.currentChart, ...updates, updatedAt: new Date() }
      : this.state.currentChart
    
    this.setState({ charts, currentChart })
    
    const updatedChart = charts.find(chart => chart.id === id);
    if (updatedChart) {
      await StorageService.saveToLocal(updatedChart);
    }
  }

  deleteChart(id: string) {
    const charts = this.state.charts.filter(chart => chart.id !== id)
    const currentChart = this.state.currentChart?.id === id ? null : this.state.currentChart
    this.setState({ charts, currentChart })
  }

  setLoading(loading: boolean) {
    this.setState({ isLoading: loading })
  }

  setError(error: string | null) {
    this.setState({ error })
  }
}