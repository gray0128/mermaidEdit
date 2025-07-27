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
    content.className = 'bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] flex flex-col';

    content.innerHTML = `
      <!-- 固定头部 -->
      <div class="flex justify-between items-center p-6 pb-4 border-b flex-shrink-0">
        <h2 class="text-xl font-bold">配置设置</h2>
        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 可滚动内容区域 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="space-y-4">
        <!-- 安全提示 -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <div class="text-sm">
              <p class="font-medium text-yellow-800 mb-1">安全提示</p>
              <p class="text-yellow-700">API 密钥将存储在您的浏览器本地存储中。请确保：</p>
              <ul class="text-yellow-700 mt-1 ml-4 list-disc">
                <li>仅在可信设备上使用</li>
                <li>使用受限权限的 API 密钥</li>
                <li>定期更换密钥</li>
                <li>不在公共设备上保存配置</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div>
          <h3 class="text-lg font-semibold mb-2">AI配置</h3>
          
          <!-- 快速配置模板 -->
          <div class="mb-3">
            <label class="block text-sm font-medium mb-1">快速配置</label>
            <select id="ai-template" class="w-full border rounded px-3 py-2 text-sm">
              <option value="">选择服务商模板（可选）</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="gemini">Google Gemini</option>
              <option value="azure">Azure OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="moonshot">Moonshot (Kimi)</option>
              <option value="zhipu">智谱AI (GLM)</option>
              <option value="custom">自定义配置</option>
            </select>
          </div>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">API地址 <span class="text-red-500">*</span></label>
              <input type="text" id="ai-base-url" class="w-full border rounded px-3 py-2" placeholder="如: https://api.openai.com/v1/chat/completions" required>
              <p class="text-xs text-gray-500 mt-1">完整的API端点地址</p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">API密钥 <span class="text-red-500">*</span></label>
              <input type="password" id="ai-api-key" class="w-full border rounded px-3 py-2" placeholder="输入API密钥" required>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">模型名称 <span class="text-red-500">*</span></label>
              <input type="text" id="ai-model" class="w-full border rounded px-3 py-2" placeholder="如: gpt-3.5-turbo" required>
            </div>
            
            <!-- 高级选项 -->
            <details class="border rounded p-2">
              <summary class="text-sm font-medium cursor-pointer">高级选项</summary>
              <div class="mt-2 space-y-2">
                <div>
                  <label class="block text-sm font-medium mb-1">认证方式</label>
                  <select id="ai-auth-type" class="w-full border rounded px-3 py-2">
                    <option value="bearer">Bearer Token (默认)</option>
                    <option value="api-key">API Key Header</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">服务商标识</label>
                  <input type="text" id="ai-provider" class="w-full border rounded px-3 py-2" placeholder="如: openai, anthropic">
                  <p class="text-xs text-gray-500 mt-1">用于标识服务商，可选</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2">NocoDB配置</h3>
          <p class="text-sm text-gray-600 mb-3">配置NocoDB数据库连接，用于保存和管理图表数据</p>
          <div class="space-y-2">
            <div>
              <label class="block text-sm font-medium mb-1">Base URL</label>
              <input type="text" id="nocodb-base-url" class="w-full border rounded px-3 py-2" placeholder="https://app.nocodb.com">
              <p class="text-xs text-gray-500 mt-1">NocoDB实例的完整URL地址</p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">API Token</label>
              <input type="password" id="nocodb-api-token" class="w-full border rounded px-3 py-2" placeholder="输入API Token">
              <p class="text-xs text-gray-500 mt-1">在NocoDB中生成的API访问令牌</p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">表格ID</label>
              <input type="text" id="nocodb-table-id" class="w-full border rounded px-3 py-2" placeholder="输入表格ID">
              <p class="text-xs text-gray-500 mt-1">要存储图表数据的表格ID</p>
            </div>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <div class="text-sm">
                <p class="font-medium text-blue-800 mb-1">NocoDB 配置说明</p>
                <p class="text-blue-700">请确保您的NocoDB表包含以下字段：</p>
                <ul class="text-blue-700 mt-1 ml-4 list-disc text-xs">
                  <li><code>id</code> - 主键字段</li>
                  <li><code>title</code> - 单行文本字段</li>
                  <li><code>mermaidCode</code> - 长文本字段</li>
                  <li><code>createdAt</code> - 日期时间字段</li>
                  <li><code>updatedAt</code> - 日期时间字段</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- 固定底部 -->
      <div class="flex justify-between items-center p-6 pt-4 border-t flex-shrink-0">
        <button id="clear-config" class="text-red-600 hover:text-red-800 text-sm underline">
          清除所有配置
        </button>
        <div class="space-x-2">
          <button id="save-config" class="btn-primary px-4 py-2 rounded">
            保存配置
          </button>
        </div>
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
    const clearBtn = this.modal.querySelector('#clear-config');
    const templateSelect = this.modal.querySelector('#ai-template');

    closeBtn?.addEventListener('click', () => this.close());
    saveBtn?.addEventListener('click', () => this.saveConfig());
    clearBtn?.addEventListener('click', () => this.clearConfig());
    
    // 模板选择事件
    templateSelect?.addEventListener('change', (e) => {
      const template = (e.target as HTMLSelectElement).value;
      this.applyTemplate(template);
    });

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
      (this.modal?.querySelector('#ai-provider') as HTMLInputElement).value = aiConfig.provider || '';
      (this.modal?.querySelector('#ai-api-key') as HTMLInputElement).value = aiConfig.apiKey || '';
      (this.modal?.querySelector('#ai-model') as HTMLInputElement).value = aiConfig.model || '';
      (this.modal?.querySelector('#ai-base-url') as HTMLInputElement).value = aiConfig.baseUrl || '';
      (this.modal?.querySelector('#ai-auth-type') as HTMLSelectElement).value = aiConfig.authType || 'bearer';
    }

    if (nocodbConfig) {
      (this.modal?.querySelector('#nocodb-base-url') as HTMLInputElement).value = nocodbConfig.baseUrl || '';
      (this.modal?.querySelector('#nocodb-api-token') as HTMLInputElement).value = nocodbConfig.apiToken || '';
      (this.modal?.querySelector('#nocodb-table-id') as HTMLInputElement).value = nocodbConfig.tableId || '';
    }
  }

  private saveConfig(): void {
    if (!this.modal) return;

    // 获取AI配置
    const baseUrl = (this.modal.querySelector('#ai-base-url') as HTMLInputElement).value.trim();
    const apiKey = (this.modal.querySelector('#ai-api-key') as HTMLInputElement).value.trim();
    const model = (this.modal.querySelector('#ai-model') as HTMLInputElement).value.trim();
    const authType = (this.modal.querySelector('#ai-auth-type') as HTMLSelectElement).value as 'bearer' | 'api-key' | 'custom';
    const provider = (this.modal.querySelector('#ai-provider') as HTMLInputElement).value.trim();

    // 验证必填字段
    if (!baseUrl || !apiKey || !model) {
      alert('请填写完整的AI配置：API地址、密钥和模型名称都是必填项');
      return;
    }

    const aiConfig: AIConfig = {
      provider: provider || 'custom',
      apiKey,
      baseUrl,
      model,
      authType
    };

    // 获取NocoDB配置
    const nocoBaseUrl = (this.modal.querySelector('#nocodb-base-url') as HTMLInputElement).value.trim();
    const nocoApiToken = (this.modal.querySelector('#nocodb-api-token') as HTMLInputElement).value.trim();
    const nocoTableId = (this.modal.querySelector('#nocodb-table-id') as HTMLInputElement).value.trim();

    // 保存AI配置
    StorageService.saveAIConfig(aiConfig);

    // 保存NocoDB配置（如果填写了）
    if (nocoBaseUrl && nocoApiToken && nocoTableId) {
      const nocodbConfig: NocoDBConfig = {
        baseUrl: nocoBaseUrl,
        apiToken: nocoApiToken,
        tableId: nocoTableId
      };
      StorageService.saveNocoDBConfig(nocodbConfig);
    }
    
    this.onSave();
    this.close();
  }

  private clearConfig(): void {
    if (confirm('确定要清除所有配置吗？这将删除所有保存的 API 密钥和配置信息。')) {
      localStorage.removeItem('ai-config');
      localStorage.removeItem('nocodb-config');
      
      // 清空表单
      if (this.modal) {
        (this.modal.querySelector('#ai-template') as HTMLSelectElement).value = '';
        (this.modal.querySelector('#ai-provider') as HTMLInputElement).value = '';
        (this.modal.querySelector('#ai-api-key') as HTMLInputElement).value = '';
        (this.modal.querySelector('#ai-model') as HTMLInputElement).value = '';
        (this.modal.querySelector('#ai-base-url') as HTMLInputElement).value = '';
        (this.modal.querySelector('#ai-auth-type') as HTMLSelectElement).value = 'bearer';
        (this.modal.querySelector('#nocodb-base-url') as HTMLInputElement).value = '';
        (this.modal.querySelector('#nocodb-api-token') as HTMLInputElement).value = '';
        (this.modal.querySelector('#nocodb-table-id') as HTMLInputElement).value = '';
      }
      
      alert('配置已清除');
    }
  }

  /**
   * 应用服务商配置模板
   */
  private applyTemplate(template: string): void {
    if (!this.modal || !template) return;

    const templates = {
      openai: {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        authType: 'bearer',
        provider: 'openai'
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-haiku-20240307',
        authType: 'api-key',
        provider: 'anthropic'
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        model: 'gemini-pro',
        authType: 'bearer',
        provider: 'gemini'
      },
      azure: {
        baseUrl: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-12-01-preview',
        model: 'gpt-35-turbo',
        authType: 'api-key',
        provider: 'azure'
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        authType: 'bearer',
        provider: 'deepseek'
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-v1-8k',
        authType: 'bearer',
        provider: 'moonshot'
      },
      zhipu: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4',
        authType: 'bearer',
        provider: 'zhipu'
      }
    };

    const config = templates[template as keyof typeof templates];
    if (config) {
      (this.modal.querySelector('#ai-base-url') as HTMLInputElement).value = config.baseUrl;
      (this.modal.querySelector('#ai-model') as HTMLInputElement).value = config.model;
      (this.modal.querySelector('#ai-auth-type') as HTMLSelectElement).value = config.authType;
      (this.modal.querySelector('#ai-provider') as HTMLInputElement).value = config.provider;
    }
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