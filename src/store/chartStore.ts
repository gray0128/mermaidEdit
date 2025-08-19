import { create } from 'zustand'
import { ChartData } from '../types'
import { chartService } from '../services/chartService'

interface ChartState {
  charts: ChartData[]
  currentChart: ChartData | null
  loading: boolean
  error: string | null
  
  // Actions
  init: () => Promise<void>
  createNewChart: (name?: string, content?: string) => Promise<void>
  saveChart: (chart: ChartData) => Promise<void>
  deleteChart: (id: string) => Promise<void>
  setCurrentChart: (id: string) => Promise<void>
  updateCurrentChart: (updates: Partial<Omit<ChartData, 'id' | 'createdAt'>>) => Promise<void>
  refreshCharts: () => Promise<void>
  clearError: () => void
}

export const useChartStore = create<ChartState>((set, get) => ({
  charts: [],
  currentChart: null,
  loading: false,
  error: null,

  init: async () => {
    try {
      set({ loading: true, error: null })
      await chartService.init()
      const charts = chartService.getCharts()
      const currentChart = chartService.getCurrentChart()
      set({ charts, currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize', 
        loading: false 
      })
    }
  },

  createNewChart: async (name?: string, content?: string) => {
    try {
      set({ loading: true, error: null })
      await chartService.createNewChart(name, content)
      const charts = chartService.getCharts()
      const currentChart = chartService.getCurrentChart()
      set({ charts, currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create chart', 
        loading: false 
      })
    }
  },

  saveChart: async (chart: ChartData) => {
    try {
      set({ loading: true, error: null })
      await chartService.saveChart(chart)
      const charts = chartService.getCharts()
      const currentChart = chartService.getCurrentChart()
      set({ charts, currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save chart', 
        loading: false 
      })
    }
  },

  deleteChart: async (id: string) => {
    try {
      set({ loading: true, error: null })
      await chartService.deleteChart(id)
      const charts = chartService.getCharts()
      const currentChart = chartService.getCurrentChart()
      set({ charts, currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete chart', 
        loading: false 
      })
    }
  },

  setCurrentChart: async (id: string) => {
    try {
      set({ loading: true, error: null })
      await chartService.setCurrentChart(id)
      const currentChart = chartService.getCurrentChart()
      set({ currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to set current chart', 
        loading: false 
      })
    }
  },

  updateCurrentChart: async (updates: Partial<Omit<ChartData, 'id' | 'createdAt'>>) => {
    try {
      const { currentChart } = get()
      if (!currentChart) {
        set({ error: 'No current chart selected' })
        return
      }

      set({ loading: true, error: null })
      await chartService.updateCurrentChart(updates)
      const charts = chartService.getCharts()
      const updatedCurrentChart = chartService.getCurrentChart()
      set({ charts, currentChart: updatedCurrentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update chart', 
        loading: false 
      })
    }
  },

  refreshCharts: async () => {
    try {
      set({ loading: true, error: null })
      // 重新加载图表列表
      await chartService.init()
      const charts = chartService.getCharts()
      const currentChart = chartService.getCurrentChart()
      set({ charts, currentChart, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh charts', 
        loading: false 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))