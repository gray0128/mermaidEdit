import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';
import type { ChartData, NocoDBConfig } from '../types';

interface MermaidDB extends DBSchema {
  charts: {
    key: string;
    value: ChartData;
    indexes: { 'dirty': 'dirty', 'retry_count': 'retry_count' };
  };
  syncQueue: {
    key: number;
    value: { chartId: string; action: 'save' | 'delete' };
  };
}

export class StorageService {
  private static dbPromise: Promise<IDBPDatabase<MermaidDB>> | null = null;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static readonly NOCODB_CONFIG_KEY = 'mermaid_nocodb_config';

  private static getDB(): Promise<IDBPDatabase<MermaidDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<MermaidDB>('mermaid-editor-db', 2, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            db.createObjectStore('charts', { keyPath: 'id' });
            db.createObjectStore('syncQueue', { autoIncrement: true });
          }
          if (oldVersion < 2) {
            const chartsStore = db.transaction('charts', 'readwrite').objectStore('charts');
            chartsStore.createIndex('dirty', 'dirty', { unique: false });
            chartsStore.createIndex('retry_count', 'retry_count', { unique: false });
          }
        },
      });
      this.startSyncLoop();
    }
    return this.dbPromise;
  }

  private static startSyncLoop(): void {
    if (!this.syncInterval) {
      this.syncInterval = setInterval(async () => {
        await this.syncDirtyCharts();
      }, 1000);
    }
  }

  private static async syncDirtyCharts(): Promise<void> {
    const db = await this.getDB();
    const chartsStore = db.transaction('charts', 'readwrite').objectStore('charts');
    const dirtyIndex = chartsStore.index('dirty');
    const dirtyCharts = await dirtyIndex.getAll(IDBKeyRange.only(true));

    for (const chart of dirtyCharts) {
      try {
        await this.syncToCloud(chart);
        await this.markAsSynced(chart.id!);
      } catch (error) {
        await this.handleSyncFailure(chart);
      }
    }
  }

  private static getNocoDBConfig(): NocoDBConfig | null {
    const config = localStorage.getItem(this.NOCODB_CONFIG_KEY);
    return config ? JSON.parse(config) : null;
  }

  private static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getNocoDBConfig();
    if (!config) throw new Error('NocoDB configuration not set');
    
    const url = `${config.baseUrl}/api/v1/db/data/v1/${config.projectId}/${config.tableId}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'xc-token': config.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Request failed: ${response.statusText}`);
    return response.json();
  }

  private static normalizeChartData(chart: ChartData): any {
    return {
      id: chart.id,
      title: chart.title,
      mermaid_code: chart.mermaidCode,
      created_at: chart.createdAt.toISOString(),
      updated_at: chart.updatedAt.toISOString(),
      dirty: chart.dirty,
      retry_count: chart.retry_count,
    };
  }

  private static denormalizeChartData(data: any): ChartData {
    return {
      id: data.id,
      title: data.title,
      mermaidCode: data.mermaid_code,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      dirty: data.dirty || false,
      retry_count: data.retry_count || 0,
    };
  }

  private static async fetchCloudChart(id: string): Promise<ChartData | null> {
    try {
      const data = await this.request(`/${id}`);
      return data ? this.denormalizeChartData(data) : null;
    } catch (error) {
      if ((error as any).message.includes('404')) return null;
      throw error;
    }
  }

  private static async createCloudChart(chart: ChartData): Promise<ChartData> {
    const normalizedData = this.normalizeChartData(chart);
    const data = await this.request('', {
      method: 'POST',
      body: JSON.stringify(normalizedData),
    });
    return this.denormalizeChartData(data);
  }

  private static async updateCloudChart(chart: ChartData): Promise<ChartData> {
    if (!chart.id) throw new Error("Chart ID is required for update");
    
    const normalizedData = this.normalizeChartData(chart);
    const data = await this.request(`/${chart.id}`, {
      method: 'PATCH',
      body: JSON.stringify(normalizedData),
    });
    return this.denormalizeChartData(data);
  }

  private static async syncToCloud(chart: ChartData): Promise<void> {
    if (!chart.id) throw new Error("Chart ID is required for synchronization");
    
    const cloudChart = await this.fetchCloudChart(chart.id);
    const localUpdated = new Date(chart.updatedAt);

    if (cloudChart) {
      const cloudUpdated = new Date(cloudChart.updatedAt);
      
      if (localUpdated > cloudUpdated) {
        await this.updateCloudChart(chart);
      } else if (cloudUpdated > localUpdated) {
        document.dispatchEvent(new CustomEvent('sync-conflict', {
          detail: { local: chart, cloud: cloudChart }
        }));
        throw new Error('Sync conflict detected');
      }
    } else {
      await this.createCloudChart(chart);
    }
  }

  private static async markAsSynced(chartId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('charts', 'readwrite');
    const store = tx.objectStore('charts');
    const chart = await store.get(chartId);
    
    if (chart) {
      await store.put({ ...chart, dirty: false, retry_count: 0 });
    }
    await tx.done;
  }

  private static async handleSyncFailure(chart: ChartData): Promise<void> {
    if (!chart.id) throw new Error("Chart ID is required for failure handling");
    
    const db = await this.getDB();
    const tx = db.transaction('charts', 'readwrite');
    const store = tx.objectStore('charts');
    const storedChart = await store.get(chart.id);
    
    if (storedChart) {
      storedChart.retry_count = Math.min((storedChart.retry_count || 0) + 1, 3);
      storedChart.dirty = true;
      await store.put(storedChart);
    }
    await tx.done;
  }

  static async ensureTableStructure(): Promise<void> {
    const config = this.getNocoDBConfig();
    if (!config || !config.tableId) {
      throw new Error('NocoDB configuration is incomplete (missing projectId or tableId)');
    }

    try {
      await this.request('?limit=1');
    } catch (error) {
      if (error instanceof Error) {
        switch (true) {
          case error.message.includes('404'):
            throw new Error(`Table ID "${config.tableId}" not found in NocoDB project ${config.projectId}`);
          case error.message.includes('401') || error.message.includes('403'):
            throw new Error('NocoDB authentication failed. Please check your API key.');
          case error.message.includes('ENOTFOUND'):
            throw new Error('Cannot connect to NocoDB server. Please check your base URL.');
        }
      }
      throw new Error(`Table structure check failed: ${(error as Error).message}`);
    }
  }

  static async saveToLocal(chart: ChartData): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('charts', 'readwrite');
    const store = tx.objectStore('charts');
    
    await store.put({
      ...chart,
      dirty: true,
      retry_count: 0,
      updatedAt: new Date(),
    });
    await tx.done;
  }

  static async saveChart(chart: ChartData): Promise<ChartData> {
    if (!chart.id) {
      chart = { ...chart, id: `chart-${Date.now()}` };
    }

    await this.saveToLocal(chart);
    
    const config = this.getNocoDBConfig();
    if (!config || !config.baseUrl || !config.apiKey || !config.tableId) {
      return chart;
    }

    try {
      await this.ensureTableStructure();
      const cloudChart = await this.syncToCloud(chart);
      return chart;
    } catch (error) {
      console.error('Failed to sync to cloud:', error);
      return chart;
    }
  }

  static async getChart(id: string): Promise<ChartData | null> {
    const db = await this.getDB();
    const localChart = await db.get('charts', id);
    
    if (localChart && localChart.id?.startsWith('chart-')) {
      return localChart;
    }

    try {
      const cloudChart = await this.fetchCloudChart(id);
      return cloudChart ?? localChart ?? null;
    } catch (error) {
      console.warn('Failed to fetch from cloud, using local data:', error);
      return localChart ?? null;
    }
  }

  static async getAllCharts(): Promise<ChartData[]> {
    const db = await this.getDB();
    const localCharts = await db.getAll('charts');
    
    const config = this.getNocoDBConfig();
    if (!config) {
      return localCharts;
    }

    try {
      await this.ensureTableStructure();
      const cloudCharts = await this.request('');
      return cloudCharts.list.map(this.denormalizeChartData);
    } catch (error) {
      console.warn('Failed to fetch cloud charts, using local data:', error);
      return localCharts;
    }
  }

  static async deleteChart(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('charts', id);

    try {
      await this.request(`/${id}`, { method: 'DELETE' });
    } catch (error) {
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
      try {
        if (item.action === 'save') {
          const chart = await db.get('charts', item.chartId);
          if (chart) await this.syncToCloud(chart);
        } else if (item.action === 'delete') {
          await this.request(`/${item.chartId}`, { method: 'DELETE' });
        }
        await cursor.delete();
      } catch (error) {
        console.debug(`Failed to sync queue item ${item.chartId}:`, error);
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  static saveNocoDBConfig(config: NocoDBConfig): void {
    localStorage.setItem(this.NOCODB_CONFIG_KEY, JSON.stringify(config));
  }
}