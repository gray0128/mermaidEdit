import { isValidMermaidSyntax } from './utils'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateMermaidSyntax(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  // 检查内容是否为空
  if (!content || content.trim() === '') {
    result.isValid = false
    result.errors.push('Chart content cannot be empty')
    return result
  }

  // 检查基本的 mermaid 语法
  if (!isValidMermaidSyntax(content)) {
    result.isValid = false
    result.errors.push('Invalid Mermaid syntax. Please check your chart definition.')
    return result
  }

  // 检查常见的语法错误
  const lines = content.split('\n')
  
  // 检查括号匹配
  const bracketPairs: { [key: string]: string } = {
    '(': ')',
    '[': ']',
    '{': '}',
  }
  
  const stack: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 跳过注释和空行
    if (line.startsWith('%%') || line === '') {
      continue
    }
    
    // 检查括号匹配
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (bracketPairs[char]) {
        stack.push(char)
      } else if (Object.values(bracketPairs).includes(char)) {
        if (stack.length === 0) {
          result.isValid = false
          result.errors.push(`Unmatched closing bracket '${char}' at line ${i + 1}`)
        } else {
          const lastOpening = stack.pop()
          if (bracketPairs[lastOpening as keyof typeof bracketPairs] !== char) {
            result.isValid = false
            result.errors.push(`Mismatched brackets at line ${i + 1}. Expected '${bracketPairs[lastOpening as keyof typeof bracketPairs]}' but found '${char}'`)
          }
        }
      }
    }
  }
  
  // 检查未闭合的括号
  while (stack.length > 0) {
    const unclosed = stack.pop()
    result.isValid = false
    result.errors.push(`Unclosed bracket '${unclosed}'`)
  }

  // 检查箭头语法
  const arrowPattern = /-->|<-|<->|-->/g
  let arrowMatch
  while ((arrowMatch = arrowPattern.exec(content)) !== null) {
    const arrow = arrowMatch[0]
    
    // 检查箭头前后是否有空格
    const beforeArrow = content[arrowMatch.index - 1]
    const afterArrow = content[arrowMatch.index + arrow.length]
    
    if (beforeArrow !== ' ' && beforeArrow !== undefined && beforeArrow !== '\n') {
      result.warnings.push(`Missing space before arrow '${arrow}'`)
    }
    
    if (afterArrow !== ' ' && afterArrow !== undefined && afterArrow !== '\n') {
      result.warnings.push(`Missing space after arrow '${arrow}'`)
    }
  }

  // 检查节点ID格式
  const nodeIdPattern = /\b([A-Za-z0-9_]+)\b/g
  let nodeIdMatch
  const nodeIds = new Set<string>()
  
  while ((nodeIdMatch = nodeIdPattern.exec(content)) !== null) {
    const nodeId = nodeIdMatch[1]
    
    // 跳过 Mermaid 关键字
    const keywords = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 
      'gitgraph', 'C4Context', 'mindmap', 'timeline',
      'style', 'linkStyle', 'classDef', 'click', 'callback',
      'end', 'subgraph', 'activate', 'deactivate'
    ]
    
    if (!keywords.includes(nodeId) && nodeId.length > 0) {
      if (nodeIds.has(nodeId)) {
        result.warnings.push(`Duplicate node ID '${nodeId}'`)
      } else {
        nodeIds.add(nodeId)
      }
    }
  }

  return result
}