import { AppStore } from '@/store/AppStore'
import { Editor } from '@/components/Editor/Editor'
import { Preview } from '@/components/Preview/Preview'

export class SplitView {

  private element: HTMLElement
  private editor: Editor
  private preview: Preview

  constructor(store: AppStore) {
    this.element = document.createElement('div')
    this.element.className = 'flex-1 flex h-full'
    
    this.editor = new Editor(store)
    this.preview = new Preview(store)
    
    this.render()
  }

  render(): HTMLElement {
    this.element.innerHTML = ''
    
    // 左侧编辑器（40%宽度）
    const editorContainer = document.createElement('div')
    editorContainer.className = 'w-2/5 h-full border-r border-gray-200'
    editorContainer.appendChild(this.editor.render())
    
    // 右侧预览（60%宽度）
    const previewContainer = document.createElement('div')
    previewContainer.className = 'w-3/5 h-full bg-gray-50'
    previewContainer.appendChild(this.preview.render())
    
    this.element.appendChild(editorContainer)
    this.element.appendChild(previewContainer)
    
    return this.element
  }
}