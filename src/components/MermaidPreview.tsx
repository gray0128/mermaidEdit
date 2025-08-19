import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useChartStore } from '../store/chartStore'
import { Button } from './ui/button'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '../lib/utils'

interface MermaidPreviewProps {
  className?: string
}

const MermaidPreview: React.FC<MermaidPreviewProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { currentChart } = useChartStore()
  const [scale, setScale] = useState<number>(1)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)

  // 初始化 Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#1d4ed8',
        lineColor: '#64748b',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#fff',
      },
    })
  }, [])

  // 渲染图表
  useEffect(() => {
    if (!containerRef.current || !currentChart?.content) return

    try {
      setError(null)
      
      // 清空容器
      containerRef.current.innerHTML = ''
      
      // 创建唯一的图表 ID
      const chartId = `mermaid-${Date.now()}`
      
      // 创建渲染容器
      const renderContainer = document.createElement('div')
      renderContainer.id = chartId
      containerRef.current.appendChild(renderContainer)
      
      // 渲染图表
      mermaid.render(chartId, currentChart.content).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg
        }
      }).catch((err) => {
        console.error('Mermaid rendering error:', err)
        setError(err.message || 'Failed to render diagram')
      })
    } catch (err) {
      console.error('Mermaid error:', err)
      setError(err instanceof Error ? err.message : 'Failed to render diagram')
    }
  }, [currentChart?.content])

  // 缩放功能
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // 拖拽功能
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 控制栏 */}
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">Preview</h3>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* 预览区域 */}
      <div 
        className="flex-1 overflow-auto bg-muted/20 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="text-destructive font-medium mb-2">Rendering Error</div>
              <div className="text-sm text-muted-foreground">{error}</div>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="flex items-center justify-center min-w-full min-h-full p-4"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          />
        )}
      </div>
    </div>
  )
}

export default MermaidPreview