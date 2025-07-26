import { AppStore } from '@/store/AppStore'
import { Editor } from '@/components/Editor/Editor'
import { Preview } from '@/components/Preview/Preview'

export class SplitView {

  private element: HTMLElement
  private editor: Editor
  private preview: Preview

  constructor(store: AppStore) {
    this.element = document.createElement('div')
    this.element.className = 'flex-1 flex'
    
    this.editor = new Editor(store)
    this.preview = new Preview(store)
    
    this.render()
  }

  render(): HTMLElement {
    this.element.innerHTML = ''
    
    // 左侧编辑器
    const editorContainer = document.createElement('div')
    editorContainer.className = 'w-1/2 border-r border-gray-200'
    editorContainer.appendChild(this.editor.render())
    
    // 右侧预览
    const previewContainer = document.createElement('div')
    previewContainer.className = 'w-1/2 bg-gray-50'
    previewContainer.appendChild(this.preview.render())
    
    this.element.appendChild(editorContainer)
    this.element.appendChild(previewContainer)
    
    return this.element
  }
}