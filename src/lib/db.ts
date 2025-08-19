import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { ChartData } from '../types'

interface MermaidEditDB extends DBSchema {
  charts: {
    key: string
    value: ChartData
    indexes: {
      'by-createdAt': Date
    }
  }
}

const DB_NAME = 'mermaid-edit-db'
const DB_VERSION = 1
const CHARTS_STORE = 'charts'

class Database {
  private db: IDBPDatabase<MermaidEditDB> | null = null

  async init(): Promise<void> {
    try {
      this.db = await openDB<MermaidEditDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const chartsStore = db.createObjectStore(CHARTS_STORE, {
            keyPath: 'id',
          })
          
          // 创建按创建时间索引，用于排序
          chartsStore.createIndex('by-createdAt', 'createdAt')
        },
      })
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<MermaidEditDB>> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  async saveChart(chart: ChartData): Promise<void> {
    try {
      const db = await this.ensureDB()
      await db.put(CHARTS_STORE, chart)
    } catch (error) {
      console.error('Failed to save chart:', error)
      throw error
    }
  }

  async getChart(id: string): Promise<ChartData | undefined> {
    try {
      const db = await this.ensureDB()
      return db.get(CHARTS_STORE, id)
    } catch (error) {
      console.error('Failed to get chart:', error)
      throw error
    }
  }

  async getAllCharts(): Promise<ChartData[]> {
    try {
      const db = await this.ensureDB()
      // 获取所有图表，然后在内存中按创建时间倒序排序
      const charts = await db.getAll(CHARTS_STORE)
      return charts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error('Failed to get all charts:', error)
      throw error
    }
  }

  async deleteChart(id: string): Promise<void> {
    try {
      const db = await this.ensureDB()
      await db.delete(CHARTS_STORE, id)
    } catch (error) {
      console.error('Failed to delete chart:', error)
      throw error
    }
  }

  async clearAllCharts(): Promise<void> {
    try {
      const db = await this.ensureDB()
      await db.clear(CHARTS_STORE)
    } catch (error) {
      console.error('Failed to clear all charts:', error)
      throw error
    }
  }
}

export const db = new Database()