import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ChartData, NocoDBConfig, AIConfig } from '../types';

interface MermaidDB extends DBSchema {
  charts: {
    key: string;
    value: ChartData;
  };
  syncQueue: {
    key: number;
    value: { chartId: string; action: 'save' | 'delete' };
  };
}

export class StorageService {
  private static dbPromise: Promise<IDBPDatabase<MermaidDB>> | null = null;

  private static getDB(): Promise<IDBPDatabase<MermaidDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<MermaidDB>('mermaid-editor-db', 1, {
        upgrade(db: IDBPDatabase<MermaidDB>) {
          db.createObjectStore('charts', { keyPath: 'id' });
          db.createObjectStore('syncQueue', { autoIncrement: true });
        },
      });
    }
    return this.dbPromise;
  }
  private static readonly AI_CONFIG_KEY = 'mermaid_ai_config';
  private static readonly NOCODB_CONFIG_KEY = 'mermaid_nocodb_config';

  static getNocoDBConfig(): NocoDBConfig | null {
    const data = localStorage.getItem(this.NOCODB_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  }

  private static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getNocoDBConfig();
    if (!config || !config.baseUrl || !config.apiToken || !config.tableId) {
      throw new Error('NocoDB配置不完整');
    }

    const url = `${config.baseUrl}/api/v2/tables/${config.tableId}/records${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'xc-token': config.apiToken,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'NocoDB请求失败');
    }

    return response.json();
  }



  // 检查并创建必要的表字段
  static async ensureTableStructure(): Promise<void> {
    const config = this.getNocoDBConfig();
    if (!config || !config.tableId) {
      throw new Error('NocoDB配置不完整');
    }

    try {
      // 首先尝试简单的数据查询来验证表是否存在和可访问
      await this.request('?limit=1');
      console.log('表访问验证成功，跳过字段检查');
      return;
    } catch (error) {
      console.error('表结构检查失败:', error);
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(`表ID "${config.tableId}" 不存在，请检查NocoDB配置中的表ID是否正确`);
        } else if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error('API Token无效或权限不足，请检查NocoDB配置中的API Token');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
          throw new Error('无法连接到NocoDB服务器，请检查Base URL是否正确');
        }
      }
      throw new Error(`表结构检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  static async saveChart(chart: ChartData): Promise<ChartData> {
    const db = await this.getDB();
    await db.put('charts', chart);

    // 检查是否配置了 NocoDB
    const config = this.getNocoDBConfig();
    if (!config || !config.baseUrl || !config.apiToken || !config.tableId) {
      console.log('NocoDB 未配置，仅保存到本地');
      return chart;
    }

    try {
      // 确保表结构正确
      await this.ensureTableStructure();
      const updatedChart = await this.syncChart(chart);
      
      // 如果 ID 发生了变化，更新本地数据库
      if (updatedChart.id !== chart.id) {
        await db.put('charts', updatedChart);
        // 如果原来有临时ID，删除旧记录
        if (chart.id && chart.id.startsWith('chart-')) {
          await db.delete('charts', chart.id);
        }
      }
      
      console.log('图表已成功保存到 NocoDB');
      return updatedChart;
    } catch (error) {
      console.error('保存到 NocoDB 失败:', error);
      // 加入离线队列
      await db.put('syncQueue', { chartId: chart.id, action: 'save' });
      throw new Error(`保存到 NocoDB 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private static async syncChart(chart: ChartData): Promise<ChartData> {
    // 准备要发送的数据，确保日期格式正确
    const chartData = {
      ...chart,
      createdAt: chart.createdAt instanceof Date ? chart.createdAt.toISOString() : chart.createdAt,
      updatedAt: chart.updatedAt instanceof Date ? chart.updatedAt.toISOString() : chart.updatedAt
    };

    if (chart.id && chart.id.startsWith('chart-')) {
      // 这是一个本地生成的临时ID，需要创建新记录
      const response = await this.request('', { 
        method: 'POST',
        body: JSON.stringify(chartData) 
      });
      return { ...chart, id: response.Id || response.id };
    } else if (chart.id) {
      // 更新现有记录
      await this.request(`/${chart.id}`, { 
        method: 'PATCH',
        body: JSON.stringify(chartData) 
      });
      return chart;
    } else {
      // 创建新记录
      const response = await this.request('', { 
        method: 'POST',
        body: JSON.stringify(chartData) 
      });
      return { ...chart, id: response.Id || response.id };
    }
  }

  static async getAllCharts(): Promise<ChartData[]> {
    try {
      // 首先尝试从NocoDB获取
      const data = await this.request('');
      return data.list || [];
    } catch (error) {
      // 静默处理NocoDB错误，降级到本地IndexedDB
      try {
        const db = await this.getDB();
        const tx = db.transaction('charts', 'readonly');
        const store = tx.objectStore('charts');
        const charts = await store.getAll();
        await tx.done;
        return charts || [];
      } catch (localError) {
        console.error('从本地数据库获取图表失败:', localError);
        return [];
      }
    }
  }

  static async getChartsFromNocoDB(): Promise<ChartData[]> {
    try {
      // 确保表结构正确
      await this.ensureTableStructure();
      const response = await this.request('');
      return response.list || [];
    } catch (error) {
      // 静默处理NocoDB错误
      return [];
    }
  }

  static async getChart(id: string): Promise<ChartData | null> {
    // 如果是本地临时ID，直接从本地数据库获取
    if (id.startsWith('chart-') || id.startsWith('default-')) {
      const db = await this.getDB();
      return await db.get('charts', id) || null;
    }
    
    try {
      return await this.request(`/${id}`);
    } catch (error) {
      // 如果从 NocoDB 获取失败，尝试从本地获取
      const db = await this.getDB();
      return await db.get('charts', id) || null;
    }
  }

  static async deleteChart(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('charts', id);

    try {
      await this.request(`/${id}`, { method: 'DELETE' });
    } catch (error) {
      // 静默处理删除错误，加入离线队列
      await db.put('syncQueue', { chartId: id, action: 'delete' });
    }
  }

  static async syncOfflineQueue(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    let cursor = await store.openCursor();

    while (cursor) {
      const item = cursor.value;
      const key = cursor.key;
      try {
        if (item.action === 'save') {
          const chart = await db.get('charts', item.chartId);
          if (chart) {
            const updatedChart = await this.syncChart(chart);
            // 如果 ID 发生了变化，更新本地数据库
            if (updatedChart.id !== chart.id) {
              await db.put('charts', updatedChart);
              if (chart.id && chart.id.startsWith('chart-')) {
                await db.delete('charts', chart.id);
              }
            }
          }
        } else if (item.action === 'delete') {
          await this.request(`/${item.chartId}`, { method: 'DELETE' });
        }
        await cursor.delete();
      } catch (error) {
        // 静默处理同步错误，避免控制台噪音
        console.debug(`同步操作失败: key=${String(key)}, item=`, item, 'error=', error);
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  static saveAIConfig(config: AIConfig): void {
    localStorage.setItem(this.AI_CONFIG_KEY, JSON.stringify(config));
  }

  static getAIConfig(): AIConfig | null {
    const data = localStorage.getItem(this.AI_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  }

  static saveNocoDBConfig(config: NocoDBConfig): void {
    localStorage.setItem(this.NOCODB_CONFIG_KEY, JSON.stringify(config));
  }


}