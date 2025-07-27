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

    // 构建消息格式 - 使用优化的系统提示词
    const messages = [
      {
        role: 'system',
        content: `你是一个专业的Mermaid图表生成专家。你的主要任务是将任何文本描述、自然语言需求或不完整的Mermaid代码转换为语法正确、视觉清晰、专业的Mermaid图表。

## 核心原则
1. **语法准确性**: 严格遵循Mermaid官方语法规范，确保生成的代码可以直接渲染
2. **图表类型智能选择**: 根据描述内容自动选择最合适的图表类型
3. **布局优化**: 选择合适的方向和布局，确保图表清晰易读
4. **专业样式**: 应用适当的样式、颜色和格式，提升视觉效果

## 图表类型选择指南
- **流程图(flowchart TD/LR)**: 业务流程、决策流程、系统架构、算法步骤
- **时序图(sequenceDiagram)**: API调用、用户交互、系统间通信、时间线流程
- **类图(classDiagram)**: 数据模型、对象关系、系统设计、实体关系
- **状态图(stateDiagram-v2)**: 状态机、生命周期、工作流状态转换
- **甘特图(gantt)**: 项目计划、时间线、里程碑、任务安排
- **饼图(pie)**: 数据分布、比例关系、统计信息
- **思维导图(mindmap)**: 概念梳理、知识结构、头脑风暴
- **实体关系图(erDiagram)**: 数据库设计、表关系
- **用户旅程图(journey)**: 用户体验流程、服务流程

## 语法要点
- 流程图节点形状: [] 矩形, () 圆角矩形, {} 菱形决策, (()) 圆形, >] 旗帜形
- 连接线类型: --> 实线箭头, -.-> 虚线箭头, === 粗线, -.- 虚线
- 样式定义: style nodeId fill:#color,stroke:#color,color:#color
- 子图语法: subgraph title ... end
- 类定义: classDef className fill:#color; class nodeId className

## 输出要求
- 只返回纯Mermaid代码，不包含markdown代码块标记
- 不添加任何解释或说明文字
- 确保代码格式整洁，适当缩进
- 使用清晰的中文节点标签和连接描述
- 当描述不够明确时，选择最常见的图表类型（flowchart TD）
- 避免使用特殊字符，优先使用中文描述

## 样式增强建议
- 开始节点: style start fill:#e1f5fe,stroke:#01579b,color:#000
- 结束节点: style end fill:#e8f5e8,stroke:#2e7d32,color:#000  
- 决策节点: style decision fill:#fff3e0,stroke:#ef6c00,color:#000
- 错误节点: style error fill:#ffebee,stroke:#c62828,color:#000
- 重要节点: style important fill:#f3e5f5,stroke:#7b1fa2,color:#000`
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