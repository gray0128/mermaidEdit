import { useEffect, useState } from 'react'
import { useChartStore } from './store/chartStore'
import { Toaster } from './components/ui/toaster'
import { useToast } from './hooks/use-toast'
import { useShortcuts } from './hooks/use-shortcuts'
import { ThemeProvider } from './components/theme-provider'
import ChartList from './components/ChartList'
import CodeEditor from './components/CodeEditor'
import MermaidPreview from './components/MermaidPreview'
import ExportMenu from './components/ExportMenu'
import EditableText from './components/EditableText'
import ResizablePanel from './components/ResizablePanel'
import { ThemeToggle } from './components/theme-toggle'
import MobileChartDrawer from './components/MobileChartDrawer'
import { Button } from './components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

function App() {
  const {
    init,
    loading,
    error,
    currentChart,
    clearError,
    createNewChart,
    updateCurrentChart
  } = useChartStore()
  const { toast } = useToast()
  const [isMobileChartDrawerOpen, setIsMobileChartDrawerOpen] = useState(false)

  // 初始化应用
  useEffect(() => {
    init()
  }, [init])

  // 显示错误提示
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error,
      })
      clearError()
    }
  }, [error, toast, clearError])

  // 快捷键支持
  useShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      handler: () => {
        createNewChart()
        toast({
          description: 'New chart created',
        })
      }
    },
    {
      key: 's',
      ctrlKey: true,
      handler: () => {
        toast({
          description: 'Chart auto-saved',
        })
      }
    },
    {
      key: 'e',
      ctrlKey: true,
      handler: () => {
        if (currentChart) {
          const exportButton = document.querySelector('[data-export-menu-trigger]') as HTMLButtonElement
          if (exportButton) {
            exportButton.click()
          }
        }
      }
    }
  ])

  // 更新图表名称
  const handleNameChange = (name: string) => {
    if (currentChart) {
      updateCurrentChart({ name })
    }
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="mermaid-edit-ui-theme">
      <div className="min-h-screen bg-background text-foreground">
        {/* 顶部工具栏 */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Mermaid Edit</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentChart && (
                <>
                  <div className="text-sm text-muted-foreground hidden md:block max-w-[150px]">
                    <EditableText
                      value={currentChart.name}
                      onChange={handleNameChange}
                      placeholder="Untitled Chart"
                    />
                  </div>
                  <ExportMenu />
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="flex h-[calc(100vh-61px)]">
          {/* 左侧图表列表 */}
          <div className="w-64 border-r flex-shrink-0 hidden md:flex">
            <ChartList />
          </div>

          {/* 中间编辑器和预览区域 */}
          <div className="flex-1 flex flex-col md:flex-row">
            <ResizablePanel
              direction="horizontal"
              initialSize={50}
              minSize={30}
              maxSize={70}
              className="flex-1"
            >
              {/* 编辑器 */}
              <div className="flex-1 border-b md:border-b-0 md:border-r flex flex-col h-full">
                <div className="p-2 border-b flex items-center justify-between">
                  <h2 className="text-sm font-medium">Editor</h2>
                  {loading && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <CodeEditor className="h-full" />
                </div>
              </div>
  
              {/* 预览 */}
              <div className="flex-1 flex flex-col h-full">
                <MermaidPreview className="flex-1" />
              </div>
            </ResizablePanel>
          </div>
        </div>

        {/* 移动端图表列表按钮 */}
        <div className="md:hidden fixed bottom-4 right-4 z-10">
          <Button
            size="sm"
            className="rounded-full shadow-lg"
            onClick={() => setIsMobileChartDrawerOpen(true)}
          >
            <FileText className="h-4 w-4 mr-1" />
            Charts
          </Button>
        </div>

        {/* 移动端图表列表抽屉 */}
        <MobileChartDrawer
          isOpen={isMobileChartDrawerOpen}
          onClose={() => setIsMobileChartDrawerOpen(false)}
        />

        {/* 提示组件 */}
        <Toaster />
      </div>
    </ThemeProvider>
  )
}

export default App