import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ChartData, NocoDBConfig } from '../types';

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

  static async saveChart(chart: ChartData): Promise<void> {
    const db = await this.getDB();
    await db.put('charts', chart);

    try {
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

  static saveAIConfig(config: any): void {
    localStorage.setItem(this.AI_CONFIG_KEY, JSON.stringify(config));
  }

  static getAIConfig(): any {
    const data = localStorage.getItem(this.AI_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  }

  static saveNocoDBConfig(config: any): void {
    localStorage.setItem(this.NOCODB_CONFIG_KEY, JSON.stringify(config));
  }


}