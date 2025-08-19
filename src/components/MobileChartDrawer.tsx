import React, { useEffect, useRef } from 'react'
import { useChartStore } from '../store/chartStore'
import { Button } from './ui/button'
import { Plus, Trash2, FileText, X } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'

interface MobileChartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const MobileChartDrawer: React.FC<MobileChartDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    charts, 
    currentChart, 
    createNewChart, 
    setCurrentChart, 
    deleteChart, 
    loading 
  } = useChartStore()
  
  const drawerRef = useRef<HTMLDivElement>(null)
  
  // 点击抽屉外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // 恢复背景滚动
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleCreateNewChart = async () => {
    try {
      await createNewChart()
      onClose() // 创建后关闭抽屉
    } catch (error) {
      console.error('Failed to create new chart:', error)
    }
  }

  const handleSelectChart = async (id: string) => {
    try {
      await setCurrentChart(id)
      onClose() // 选择后关闭抽屉
    } catch (error) {
      console.error('Failed to select chart:', error)
    }
  }

  const handleDeleteChart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteChart(id)
    } catch (error) {
      console.error('Failed to delete chart:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
      <div 
        ref={drawerRef}
        className="absolute inset-y-0 left-0 w-3/4 max-w-sm bg-background shadow-lg"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Charts</h2>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 新建按钮 */}
        <div className="p-4 border-b">
          <Button 
            onClick={handleCreateNewChart} 
            className="w-full"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chart
          </Button>
        </div>
        
        {/* 图表列表 */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-120px)]">
          {charts.length === 0 ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No charts yet</p>
                <p className="text-sm">Create your first chart to get started</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {charts.map((chart) => (
                <div
                  key={chart.id}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                    currentChart?.id === chart.id && 'bg-muted'
                  )}
                  onClick={() => handleSelectChart(chart.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-medium truncate">{chart.name}</h3>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 ml-6">
                        <div>Created: {formatDate(chart.createdAt)}</div>
                        {chart.updatedAt.getTime() !== chart.createdAt.getTime() && (
                          <div>Updated: {formatDate(chart.updatedAt)}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 flex-shrink-0"
                      onClick={(e) => handleDeleteChart(chart.id, e)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 底部状态栏 */}
        <div className="p-2 border-t text-xs text-muted-foreground">
          {charts.length} chart{charts.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

export default MobileChartDrawer