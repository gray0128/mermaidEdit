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
    // 确保chart有id字段，如果没有则生成一个临时ID
    if (!chart.id) {
      chart = {
        ...chart,
        id: `default-${Date.now()}`
      };
    }
    
    // 先保存到本地
    await this.saveChartToLocal(chart);

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
      const db = await this.getDB();
      if (updatedChart.id !== chart.id) {
        await db.put('charts', updatedChart);
        // 如果原来有临时ID，删除旧记录
        if (chart.id && typeof chart.id === 'string' && (chart.id.startsWith('chart-') || chart.id.startsWith('default-'))) {
          await db.delete('charts', chart.id);
        }
      }
      
      console.log('图表已成功保存到 NocoDB');
      return updatedChart;
    } catch (error) {
      console.error('保存到 NocoDB 失败:', error);
      // 加入离线队列
      const db = await this.getDB();
      await db.put('syncQueue', { chartId: chart.id, action: 'save' });
      throw new Error(`保存到 NocoDB 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  static async saveChartToLocal(chart: ChartData): Promise<ChartData> {
    // 确保chart有id字段，如果没有则生成一个临时ID
    if (!chart.id) {
      chart = {
        ...chart,
        id: `default-${Date.now()}`
      };
    }
    
    const db = await this.getDB();
    await db.put('charts', chart);
    
    return chart;
  }

  private static async syncChart(chart: ChartData): Promise<ChartData> {
    // 准备要发送的数据，排除所有可能的自动生成字段
    const { id, createdAt, updatedAt, CreatedAt, UpdatedAt, ...chartDataForSync } = chart as any;
    
    // 只保留业务数据字段
    const dataToSend = {
      ...chartDataForSync
    };

    if (chart.id && typeof chart.id === 'string' && (chart.id.startsWith('chart-') || chart.id.startsWith('default-'))) {
      // 这是一个本地生成的临时ID，需要创建新记录
      // 为了避免唯一约束冲突，为所有可能的唯一字段添加时间戳
      const timestamp = new Date().toISOString();
      const uniqueDataToSend = {
        ...dataToSend,
        title: `${dataToSend.title} (${timestamp})`,
        mermaidCode: `${dataToSend.mermaidCode}\n%% Created at ${timestamp}`
      };
      const response = await this.request('', { 
        method: 'POST',
        body: JSON.stringify(uniqueDataToSend) 
      });
      return { ...chart, id: response.Id || response.id, title: uniqueDataToSend.title, mermaidCode: uniqueDataToSend.mermaidCode };
    } else if (chart.id) {
      // 更新现有记录
      await this.request(`/${chart.id}`, { 
        method: 'PATCH',
        body: JSON.stringify(dataToSend) 
      });
      return chart;
    } else {
      // 创建新记录
      // 为了避免唯一约束冲突，为所有可能的唯一字段添加时间戳
      const timestamp = new Date().toISOString();
      const uniqueDataToSend = {
        ...dataToSend,
        title: `${dataToSend.title} (${timestamp})`,
        mermaidCode: `${dataToSend.mermaidCode}\n%% Created at ${timestamp}`
      };
      const response = await this.request('', { 
        method: 'POST',
        body: JSON.stringify(uniqueDataToSend) 
      });
      return { ...chart, id: response.Id || response.id, title: uniqueDataToSend.title, mermaidCode: uniqueDataToSend.mermaidCode };
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
      const charts = response.list || [];
      
      // 规范化所有图表的日期字段
      return charts.map((chart: any) => this.normalizeChartData(chart));
    } catch (error) {
      // 静默处理NocoDB错误
      return [];
    }
  }

  static async getChart(id: string): Promise<ChartData | null> {
    console.log('正在获取图表，ID:', id);
    
    // 如果是本地临时ID，直接从本地数据库获取
    if (typeof id === 'string' && (id.startsWith('chart-') || id.startsWith('default-'))) {
      console.log('使用本地ID，从本地数据库获取');
      try {
        const db = await this.getDB();
        const chart = await db.get('charts', id);
        console.log('从本地获取到图表:', chart);
        return chart || null;
      } catch (error) {
        console.error('从本地获取图表失败:', error);
        return null;
      }
    }
    
    try {
      console.log('尝试从NocoDB获取图表');
      const chart = await this.request(`/${id}`);
      console.log('从NocoDB获取到原始图表数据:', chart);
      
      // 处理NocoDB返回的日期字段，确保格式正确
      if (chart) {
        const normalizedChart = this.normalizeChartData(chart);
        console.log('规范化后的图表数据:', normalizedChart);
        return normalizedChart;
      }
      
      return chart;
    } catch (error) {
      console.warn('从NocoDB获取图表失败，尝试从本地获取:', error);
      // 如果从 NocoDB 获取失败，尝试从本地获取
      try {
        const db = await this.getDB();
        const localChart = await db.get('charts', id);
        console.log('从本地获取到图表:', localChart);
        return localChart || null;
      } catch (localError) {
        console.error('从本地获取图表也失败:', localError);
        return null;
      }
    }
  }

  private static normalizeChartData(chart: any): ChartData {
    // 确保日期字段格式正确
    const normalizedChart = { ...chart };
    
    // 处理createdAt字段 - 支持多种字段名
    let createdAt = chart.createdAt || chart.CreatedAt || chart.created_at;
    if (createdAt) {
      if (typeof createdAt === 'string') {
        normalizedChart.createdAt = new Date(createdAt);
      } else if (createdAt instanceof Date) {
        // 已经是Date对象，保持不变
        normalizedChart.createdAt = createdAt;
      } else {
        normalizedChart.createdAt = new Date();
      }
    } else {
      // 如果没有创建时间，使用当前时间但标记为未知
      normalizedChart.createdAt = new Date();
    }
    
    // 处理updatedAt字段 - 支持多种字段名，如果为空则使用createdAt
    let updatedAt = chart.updatedAt || chart.UpdatedAt || chart.updated_at;
    if (updatedAt) {
      if (typeof updatedAt === 'string') {
        normalizedChart.updatedAt = new Date(updatedAt);
      } else if (updatedAt instanceof Date) {
        normalizedChart.updatedAt = updatedAt;
      } else {
        // 如果updatedAt无效，使用createdAt
        normalizedChart.updatedAt = normalizedChart.createdAt;
      }
    } else {
      // 如果没有更新时间，使用创建时间
      normalizedChart.updatedAt = normalizedChart.createdAt;
    }
    
    return normalizedChart as ChartData;
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
              // 确保 chart.id 是字符串类型再调用 startsWith
              if (chart.id && typeof chart.id === 'string' && (chart.id.startsWith('chart-') || chart.id.startsWith('default-'))) {
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