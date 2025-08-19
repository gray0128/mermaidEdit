import React, { useEffect, useRef, useState } from 'react'
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { useChartStore } from '../store/chartStore'
import { debounce } from '../lib/utils'
import { validateMermaidSyntax } from '../lib/validator'
import ErrorPanel from './ErrorPanel'

interface CodeEditorProps {
  className?: string
}

const CodeEditor: React.FC<CodeEditorProps> = ({ className }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { currentChart, updateCurrentChart } = useChartStore()
  const [validation, setValidation] = useState<any>(null)
  const [showErrorPanel, setShowErrorPanel] = useState(true)

  // 防抖更新函数，避免频繁保存
  const debouncedUpdate = debounce((content: string) => {
    if (currentChart) {
      updateCurrentChart({ content })
      // 验证图表语法
      const validationResult = validateMermaidSyntax(content)
      setValidation(validationResult)
    }
  }, 500)

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString()
        debouncedUpdate(content)
      }
    })

    const extensions = [
      javascript(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, indentWithTab]),
      oneDark,
      updateListener,
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
    ]

    const state = EditorState.create({
      doc: currentChart?.content || '',
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [currentChart])

  // 当当前图表变化时，更新编辑器内容
  useEffect(() => {
    if (viewRef.current && currentChart) {
      const currentState = viewRef.current.state
      const currentContent = currentState.doc.toString()
      
      if (currentContent !== currentChart.content) {
        const transaction = currentState.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: currentChart.content,
          },
        })
        viewRef.current.dispatch(transaction)
        
        // 验证图表语法
        const validationResult = validateMermaidSyntax(currentChart.content)
        setValidation(validationResult)
      }
    }
  }, [currentChart])

  return (
    <div className="flex flex-col h-full">
      <div
        ref={editorRef}
        className={className}
        style={{ height: '100%', fontSize: '14px' }}
      />
      
      {/* 错误面板 */}
      {showErrorPanel && validation && (
        <ErrorPanel
          validation={validation}
          onClose={() => setShowErrorPanel(false)}
        />
      )}
    </div>
  )
}

export default CodeEditor