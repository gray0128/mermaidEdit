import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'

interface ResizablePanelProps {
  children: React.ReactNode
  className?: string
  direction?: 'horizontal' | 'vertical'
  initialSize?: number
  minSize?: number
  maxSize?: number
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  className,
  direction = 'horizontal',
  initialSize = 50,
  minSize = 20,
  maxSize = 80,
}) => {
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  // 计算实际大小
  const calculateSize = (clientX: number, clientY: number) => {
    if (!panelRef.current) return size

    const rect = panelRef.current.getBoundingClientRect()
    
    if (direction === 'horizontal') {
      const parentWidth = rect.width
      const newWidth = ((clientX - rect.left) / parentWidth) * 100
      return Math.max(minSize, Math.min(maxSize, newWidth))
    } else {
      const parentHeight = rect.height
      const newHeight = ((clientY - rect.top) / parentHeight) * 100
      return Math.max(minSize, Math.min(maxSize, newHeight))
    }
  }

  // 开始调整大小
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  // 调整大小中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newSize = calculateSize(e.clientX, e.clientY)
    setSize(newSize)
  }

  // 结束调整大小
  const stopResizing = () => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResizing)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing])

  return (
    <div 
      ref={panelRef}
      className={cn('relative flex', className)}
      style={{
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
      }}
    >
      {/* 第一个面板 */}
      <div 
        className="overflow-hidden"
        style={{
          width: direction === 'horizontal' ? `${size}%` : '100%',
          height: direction === 'vertical' ? `${size}%` : '100%',
        }}
      >
        {children}
      </div>

      {/* 调整大小的手柄 */}
      <div
        ref={resizeHandleRef}
        className={cn(
          'flex items-center justify-center',
          'hover:bg-primary/10 transition-colors',
          direction === 'horizontal' 
            ? 'w-2 cursor-col-resize' 
            : 'h-2 cursor-row-resize'
        )}
        onMouseDown={startResizing}
      >
        <div 
          className={cn(
            'bg-border rounded-full',
            direction === 'horizontal' 
              ? 'w-1 h-6' 
              : 'h-1 w-6'
          )}
        />
      </div>

      {/* 第二个面板 */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          width: direction === 'horizontal' ? `${100 - size}%` : '100%',
          height: direction === 'vertical' ? `${100 - size}%` : '100%',
        }}
      >
        {/* 这里可以放置第二个面板的内容，但现在我们只使用一个面板 */}
      </div>
    </div>
  )
}

export default ResizablePanel