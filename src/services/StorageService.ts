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
      'xc-auth': config.apiToken,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'NocoDB请求失败');
    }

    return response.json();
  }

  // NocoDB API 请求（用于表结构操作）
  private static async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getNocoDBConfig();
    if (!config || !config.baseUrl || !config.apiToken) {
      throw new Error('NocoDB配置不完整');
    }

    const url = `${config.baseUrl}/api/v2${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'xc-auth': config.apiToken,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'NocoDB API请求失败');
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
      // 获取表的字段信息
      const tableInfo = await this.apiRequest(`/tables/${config.tableId}`);
      const existingColumns = tableInfo.columns || [];
      
      // 定义需要的字段
      const requiredColumns = [
        {
          column_name: 'id',
          title: 'ID',
          uidt: 'ID', // 主键类型
          pk: true
        },
        {
          column_name: 'title',
          title: '标题',
          uidt: 'SingleLineText', // 单行文本
          rqd: false // 非必填
        },
        {
          column_name: 'mermaidCode',
          title: 'Mermaid代码',
          uidt: 'LongText', // 长文本
          rqd: false
        },
        {
          column_name: 'createdAt',
          title: '创建时间',
          uidt: 'DateTime', // 日期时间
          rqd: false
        },
        {
          column_name: 'updatedAt',
          title: '更新时间',
          uidt: 'DateTime',
          rqd: false
        }
      ];

      // 检查并创建缺失的字段
      for (const requiredCol of requiredColumns) {
        const existingCol = existingColumns.find(
          (col: any) => col.column_name === requiredCol.column_name
        );
        
        if (!existingCol) {
          console.log(`创建字段: ${requiredCol.column_name}`);
          await this.apiRequest(`/tables/${config.tableId}/columns`, {
            method: 'POST',
            body: JSON.stringify(requiredCol)
          });
        }
      }
      
      console.log('表结构检查完成');
    } catch (error) {
      console.error('表结构检查失败:', error);
      throw new Error(`表结构检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  static async saveChart(chart: ChartData): Promise<void> {
    const db = await this.getDB();
    await db.put('charts', chart);

    try {
      // 确保表结构正确
      await this.ensureTableStructure();
      await this.syncChart(chart);
    } catch (error) {
      console.error('在线同步失败，已加入离线队列:', error);
      await db.put('syncQueue', { chartId: chart.id, action: 'save' });
    }
  }

  private static async syncChart(chart: ChartData): Promise<void> {
    if (chart.id) {
      await this.request(`/${chart.id}`, { 
        method: 'PATCH',
        body: JSON.stringify(chart) 
      });
    } else {
      const newChart = await this.request('', { 
        method: 'POST',
        body: JSON.stringify(chart) 
      });
      chart.id = newChart.id;
    }
  }

  static async getAllCharts(): Promise<ChartData[]> {
    const data = await this.request('');
    return data.list;
  }

  static async getChartsFromNocoDB(): Promise<ChartData[]> {
    try {
      // 确保表结构正确
      await this.ensureTableStructure();
      const response = await this.request('');
      return response.list || [];
    } catch (error) {
      console.error('从NocoDB获取图表失败:', error);
      return [];
    }
  }

  static async getChart(id: string): Promise<ChartData | null> {
    return this.request(`/${id}`);
  }

  static async deleteChart(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('charts', id);

    try {
      await this.request(`/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('在线删除失败，已加入离线队列:', error);
      await db.put('syncQueue', { chartId: id, action: 'delete' });
    }
  }

  static async syncOfflineQueue(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    let cursor = await store.openCursor();

    if (cursor) {
      console.log('开始同步离线操作...');
    }

    while (cursor) {
      const item = cursor.value;
      const key = cursor.key;
      try {
        if (item.action === 'save') {
          const chart = await db.get('charts', item.chartId);
          if (chart) {
            await this.syncChart(chart);
          }
        } else if (item.action === 'delete') {
          await this.request(`/${item.chartId}`, { method: 'DELETE' });
        }
        await cursor.delete();
      } catch (error) {
        console.error(`同步操作失败: key=${String(key)}, item=`, item, 'error=', error);
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