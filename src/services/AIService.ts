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

    const { apiKey, model, baseUrl, authType = 'bearer', customHeaders = {} } = this.config;

    if (!apiKey || !model || !baseUrl) {
      throw new Error('请完整填写API地址、密钥和模型名称');
    }

    // 构建消息格式
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

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    // 根据认证类型设置认证头
    switch (authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'api-key':
        headers['x-api-key'] = apiKey;
        break;
      case 'custom':
        // 自定义认证方式通过customHeaders传入
        break;
    }

    // 构建请求体 - 使用OpenAI兼容格式
    const body = {
      model,
      messages,
      temperature: 0.1,
      max_tokens: 2000
    };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // 智能解析响应内容
      const content = this.extractContent(data);
      
      if (!content) {
        throw new Error('无法从API响应中提取内容');
      }

      // 清理返回的Mermaid代码
      return this.cleanMermaidCode(content);
    } catch (error) {
      console.error('AI生成失败:', error);
      throw new Error(`AI生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 智能提取API响应中的内容
   * 支持多种常见的API响应格式
   */
  private extractContent(data: any): string | null {
    // OpenAI格式: data.choices[0].message.content
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    }

    // Anthropic格式: data.content[0].text
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }

    // Google Gemini格式: data.candidates[0].content.parts[0].text
    if (data.candidates && data.candidates[0] && data.candidates[0].content && 
        data.candidates[0].content.parts && data.candidates[0].content.parts[0] && 
        data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    }

    // 直接返回text字段
    if (data.text) {
      return data.text;
    }

    // 直接返回content字段
    if (data.content) {
      return data.content;
    }

    // 如果是字符串，直接返回
    if (typeof data === 'string') {
      return data;
    }

    return null;
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