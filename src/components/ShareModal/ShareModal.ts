import { StorageService } from '@/services/StorageService';

export class ShareModal {
  private modal: HTMLDivElement | null = null;
  private chartId: string;

  constructor(chartId: string) {
    this.chartId = chartId;
  }

  render(): HTMLDivElement {
    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 w-full max-w-md mx-4';

    content.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">分享图表</h2>
        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">分享链接</label>
          <div class="flex space-x-2">
            <input 
              type="text" 
              id="share-url" 
              class="flex-1 border rounded px-3 py-2 bg-gray-50" 
              value="" 
              readonly
            >
            <button id="copy-url" class="btn-primary px-4 py-2 rounded">
              生成并复制链接
            </button>
          </div>
        </div>

        <div class="text-sm text-gray-600">
          <p>• 分享链接为只读模式，其他人无法编辑</p>
          <p>• 链接有效期为30天</p>
        </div>
      </div>
    `;

    this.modal.appendChild(content);
    this.bindEvents();

    return this.modal;
  }

  private bindEvents(): void {
    if (!this.modal) return;

    const closeBtn = this.modal.querySelector('#close-modal');
    const copyBtn = this.modal.querySelector('#copy-url');

    closeBtn?.addEventListener('click', () => this.close());
    copyBtn?.addEventListener('click', () => this.generateAndCopyUrl());

    // 点击模态框外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  private async generateAndCopyUrl(): Promise<void> {
    const copyBtn = this.modal?.querySelector('#copy-url') as HTMLButtonElement;
    if (!copyBtn) return;

    try {
      copyBtn.disabled = true;
      copyBtn.textContent = '生成中...';

      const chart = await StorageService.getChart(this.chartId);
      if (!chart) {
        throw new Error('图表不存在');
      }

      // 使用URL编码压缩和编码图表数据
      const compressedData = btoa(JSON.stringify(chart));
      const shareUrl = `${window.location.origin}/share.html?data=${encodeURIComponent(compressedData)}`;

      const urlInput = this.modal?.querySelector('#share-url') as HTMLInputElement;
      urlInput.value = shareUrl;

      await navigator.clipboard.writeText(shareUrl);

      copyBtn.textContent = '已复制';
      copyBtn.classList.add('bg-green-600');
      setTimeout(() => {
        copyBtn.textContent = '生成并复制链接';
        copyBtn.classList.remove('bg-green-600');
        copyBtn.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('生成分享链接失败:', error);
      alert('生成分享链接失败');
      copyBtn.textContent = '生成并复制链接';
      copyBtn.disabled = false;
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