import type { AIConfig } from '../types';

export class AIService {
  private config: AIConfig | null = null;

  setConfig(config: AIConfig): void {
    this.config = config;
  }

  async generateMermaid(prompt: string): Promise<string> {
    if (!this.config) {
      throw new Error('AI配置未设置');
    }

    const { provider, apiKey, model, baseUrl } = this.config;

    if (!apiKey) {
      throw new Error('API密钥未配置');
    }

    const messages = [
      {
        role: 'system',
        content: '你是一个专业的Mermaid图表生成助手。请根据用户的描述生成有效的Mermaid代码。只返回Mermaid代码，不要添加任何解释。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    let endpoint: string;
    let headers: Record<string, string>;
    let body: any;

    switch (provider) {
      case 'openai':
        endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: model || 'gpt-3.5-turbo',
          messages,
          temperature: 0.1,
          max_tokens: 2000
        };
        break;

      case 'anthropic':
        endpoint = baseUrl || 'https://api.anthropic.com/v1/messages';
        headers = {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: model || 'claude-3-haiku-20240307',
          messages,
          max_tokens: 2000,
          temperature: 0.1
        };
        break;

      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      let content: string;
      if (provider === 'openai') {
        content = data.choices[0].message.content;
      } else if (provider === 'anthropic') {
        content = data.content[0].text;
      } else {
        throw new Error('未知的响应格式');
      }

      // 清理返回的Mermaid代码
      return this.cleanMermaidCode(content);
    } catch (error) {
      console.error('AI生成失败:', error);
      throw new Error(`AI生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private cleanMermaidCode(code: string): string {
    // 移除可能的markdown代码块标记
    return code
      .replace(/^```mermaid\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }
}