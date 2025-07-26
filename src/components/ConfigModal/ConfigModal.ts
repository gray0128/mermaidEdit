import { StorageService } from '../../services/StorageService';
import type { AIConfig, NocoDBConfig } from '../../types';

export class ConfigModal {
  private modal: HTMLDivElement | null = null;
  private onSave: () => void;

  constructor(onSave: () => void) {
    this.onSave = onSave;
  }

  render(): HTMLDivElement {
    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 w-full max-w-md mx-4';

    content.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">配置设置</h2>
        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold mb-2">AI配置</h3>
          <div class="space-y-2">
            <div>
              <label class="block text-sm font-medium mb-1">提供商</label>
              <select id="ai-provider" class="w-full border rounded px-3 py-2">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">API密钥</label>
              <input type="password" id="ai-api-key" class="w-full border rounded px-3 py-2" placeholder="输入API密钥">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">模型</label>
              <input type="text" id="ai-model" class="w-full border rounded px-3 py-2" placeholder="可选，如gpt-3.5-turbo">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">自定义API地址</label>
              <input type="text" id="ai-base-url" class="w-full border rounded px-3 py-2" placeholder="可选，如https://api.openai.com/v1">
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">NocoDB配置</h3>
          <div class="space-y-2">
            <div>
              <label class="block text-sm font-medium mb-1">Base URL</label>
              <input type="text" id="nocodb-base-url" class="w-full border rounded px-3 py-2" placeholder="https://app.nocodb.com">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">API Token</label>
              <input type="password" id="nocodb-api-token" class="w-full border rounded px-3 py-2" placeholder="输入API Token">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">项目ID</label>
              <input type="text" id="nocodb-project-id" class="w-full border rounded px-3 py-2" placeholder="可选">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">表格名称</label>
              <input type="text" id="nocodb-table-name" class="w-full border rounded px-3 py-2" placeholder="可选，默认为charts">
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-2 mt-6">
        <button id="save-config" class="btn-primary px-4 py-2 rounded">
          保存配置
        </button>
      </div>
    `;

    this.modal.appendChild(content);
    this.bindEvents();
    this.loadConfig();

    return this.modal;
  }

  private bindEvents(): void {
    if (!this.modal) return;

    const closeBtn = this.modal.querySelector('#close-modal');
    const saveBtn = this.modal.querySelector('#save-config');

    closeBtn?.addEventListener('click', () => this.close());
    saveBtn?.addEventListener('click', () => this.saveConfig());

    // 点击模态框外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  private loadConfig(): void {
    const aiConfig = StorageService.getAIConfig();
    const nocodbConfig = StorageService.getNocoDBConfig();

    if (aiConfig) {
      (this.modal?.querySelector('#ai-provider') as HTMLSelectElement).value = aiConfig.provider || 'openai';
      (this.modal?.querySelector('#ai-api-key') as HTMLInputElement).value = aiConfig.apiKey || '';
      (this.modal?.querySelector('#ai-model') as HTMLInputElement).value = aiConfig.model || '';
      (this.modal?.querySelector('#ai-base-url') as HTMLInputElement).value = aiConfig.baseUrl || '';
    }

    if (nocodbConfig) {
      (this.modal?.querySelector('#nocodb-base-url') as HTMLInputElement).value = nocodbConfig.baseUrl || '';
      (this.modal?.querySelector('#nocodb-api-token') as HTMLInputElement).value = nocodbConfig.apiToken || '';
      (this.modal?.querySelector('#nocodb-project-id') as HTMLInputElement).value = nocodbConfig.projectId || '';
      (this.modal?.querySelector('#nocodb-table-name') as HTMLInputElement).value = nocodbConfig.tableId || '';
    }
  }

  private saveConfig(): void {
    const aiConfig: AIConfig = {
      provider: (this.modal?.querySelector('#ai-provider') as HTMLSelectElement).value as 'openai' | 'anthropic',
      apiKey: (this.modal?.querySelector('#ai-api-key') as HTMLInputElement).value,
      model: (this.modal?.querySelector('#ai-model') as HTMLInputElement).value || '',
      baseUrl: (this.modal?.querySelector('#ai-base-url') as HTMLInputElement).value || ''
    };

    const nocodbConfig: NocoDBConfig = {
      baseUrl: (this.modal?.querySelector('#nocodb-base-url') as HTMLInputElement).value,
      apiToken: (this.modal?.querySelector('#nocodb-api-token') as HTMLInputElement).value,
      projectId: (this.modal?.querySelector('#nocodb-project-id') as HTMLInputElement).value || '',
      tableId: (this.modal?.querySelector('#nocodb-table-name') as HTMLInputElement).value || 'charts'
    };

    StorageService.saveAIConfig(aiConfig);
    StorageService.saveNocoDBConfig(nocodbConfig);
    
    this.onSave();
    this.close();
  }

  open(): void {
    if (!this.modal) {
      document.body.appendChild(this.render());
    }
  }

  close(): void {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
  }
}