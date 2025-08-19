import { v4 as uuidv4 } from 'uuid'

export interface ChartData {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export function createChartData(name: string = 'Untitled Chart', content: string = ''): ChartData {
  const now = new Date()
  return {
    id: uuidv4(),
    name: name.substring(0, 20), // 限制在20个字以内
    content,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateChartData(chart: ChartData, updates: Partial<Omit<ChartData, 'id' | 'createdAt'>>): ChartData {
  return {
    ...chart,
    ...updates,
    updatedAt: new Date(),
  }
}