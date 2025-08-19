import { renderHook, act } from '@testing-library/react'
import { useChartStore } from '../store/chartStore'
import { vi } from 'vitest'

// 模拟 chartService
vi.mock('../services/chartService', () => ({
  ChartService: {
    getInstance: vi.fn(() => ({
      init: vi.fn(),
      getCharts: vi.fn(),
      createNewChart: vi.fn(),
      saveChart: vi.fn(),
      deleteChart: vi.fn(),
      getChart: vi.fn(),
      setCurrentChart: vi.fn(),
    })),
  },
}))

describe('useChartStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置存储状态
    useChartStore.setState({
      charts: [],
      currentChart: null,
      loading: false,
      error: null,
    })
  })

  it('应该初始化存储', async () => {
    const mockCharts = [
      {
        id: '1',
        name: 'Test Chart 1',
        content: 'graph TD\nA-->B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 导入模拟的 chartService
    const { ChartService } = await import('../services/chartService')
    const mockServiceInstance = ChartService.getInstance()

    // 模拟 getAllCharts 返回图表列表
    vi.mocked(mockServiceInstance.getCharts).mockResolvedValue(mockCharts)

    const { result } = renderHook(() => useChartStore())

    // 调用 init 方法
    await act(async () => {
      await result.current.init()
    })

    // 验证 getAllCharts 被调用
    expect(mockServiceInstance.getCharts).toHaveBeenCalled()

    // 验证图表列表已设置
    expect(result.current.charts).toEqual(mockCharts)
  })

  it('应该创建新图表', async () => {
    // 导入模拟的 chartService
    const { ChartService } = await import('../services/chartService')
    const mockServiceInstance = ChartService.getInstance()

    // 模拟 createNewChart 返回新图表
    const newChart = {
      id: '2',
      name: 'New Chart',
      content: 'graph TD\nA-->B',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(mockServiceInstance.createNewChart).mockResolvedValue(newChart)

    const { result } = renderHook(() => useChartStore())

    // 调用 createNewChart 方法
    await act(async () => {
      await result.current.createNewChart()
    })

    // 验证 createNewChart 被调用
    expect(mockServiceInstance.createNewChart).toHaveBeenCalled()

    // 验证当前图表已设置
    expect(result.current.currentChart).toBeTruthy()
    expect(result.current.currentChart?.name).toContain('New Chart')
  })

  it('应该更新当前图表', async () => {
    // 导入模拟的 chartService
    const { ChartService } = await import('../services/chartService')
    const mockServiceInstance = ChartService.getInstance()

    const { result } = renderHook(() => useChartStore())

    // 设置当前图表
    await act(async () => {
      useChartStore.setState({
        currentChart: {
          id: '1',
          name: 'Test Chart',
          content: 'graph TD\nA-->B',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    })

    // 模拟 updateChart 返回成功
    vi.mocked(mockServiceInstance.saveChart).mockResolvedValue()

    // 调用 updateCurrentChart 方法
    await act(async () => {
      await result.current.updateCurrentChart({ content: 'graph TD\nA-->C' })
    })

    // 验证 updateChart 被调用
    expect(mockServiceInstance.saveChart).toHaveBeenCalled()

    // 验证当前图表内容已更新
    expect(result.current.currentChart?.content).toBe('graph TD\nA-->C')
  })

  it('应该删除图表', async () => {
    // 导入模拟的 chartService
    const { ChartService } = await import('../services/chartService')
    const mockServiceInstance = ChartService.getInstance()

    const mockCharts = [
      {
        id: '1',
        name: 'Test Chart 1',
        content: 'graph TD\nA-->B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Test Chart 2',
        content: 'graph TD\nB-->C',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 设置图表列表和当前图表
    await act(async () => {
      useChartStore.setState({
        charts: mockCharts,
        currentChart: mockCharts[0],
      })
    })

    // 模拟 deleteChart 返回成功
    vi.mocked(mockServiceInstance.deleteChart).mockResolvedValue()

    const { result } = renderHook(() => useChartStore())

    // 调用 deleteChart 方法
    await act(async () => {
      await result.current.deleteChart('1')
    })

    // 验证 deleteChart 被调用
    expect(mockServiceInstance.deleteChart).toHaveBeenCalledWith('1')

    // 验证图表列表已更新
    expect(result.current.charts).toHaveLength(1)
    expect(result.current.charts[0].id).toBe('2')
  })

  it('应该设置当前图表', async () => {
    // 导入模拟的 chartService
    const { ChartService } = await import('../services/chartService')
    const mockServiceInstance = ChartService.getInstance()

    const mockCharts = [
      {
        id: '1',
        name: 'Test Chart 1',
        content: 'graph TD\nA-->B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Test Chart 2',
        content: 'graph TD\nB-->C',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 设置图表列表
    await act(async () => {
      useChartStore.setState({
        charts: mockCharts,
      })
    })

    // 模拟 getChart 返回图表
    vi.mocked(mockServiceInstance.getChart).mockResolvedValue(mockCharts[1])

    const { result } = renderHook(() => useChartStore())

    // 调用 setCurrentChart 方法
    await act(async () => {
      await result.current.setCurrentChart('2')
    })

    // 验证当前图表已设置
    expect(result.current.currentChart?.id).toBe('2')
    expect(result.current.currentChart?.name).toBe('Test Chart 2')
  })
})