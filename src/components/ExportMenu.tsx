import React, { useState } from 'react'
import { Button } from './ui/button'
import { Download, FileImage, File } from 'lucide-react'
import { useChartStore } from '../store/chartStore'
import { generateFileName, downloadFile } from '../lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

interface ExportMenuProps {
  className?: string
}

const ExportMenu: React.FC<ExportMenuProps> = ({ className }) => {
  const { currentChart } = useChartStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPNG = async () => {
    if (!currentChart) return
    
    try {
      setIsExporting(true)
      
      // 创建一个临时的 div 来渲染图表
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)
      
      // 使用 mermaid 渲染图表
      const mermaid = (await import('mermaid')).default
      const chartId = `export-${Date.now()}`
      
      await mermaid.render(chartId, currentChart.content).then((result) => {
        tempDiv.innerHTML = result.svg
        
        // 获取 SVG 元素
        const svgElement = tempDiv.querySelector('svg')
        if (!svgElement) {
          throw new Error('SVG element not found')
        }
        
        // 设置 SVG 背景为透明
        svgElement.style.backgroundColor = 'transparent'
        
        // 将 SVG 转换为 PNG
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('Canvas context not available')
        }
        
        const img = new Image()
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        
        img.onload = () => {
          // 设置 canvas 尺寸
          canvas.width = img.width
          canvas.height = img.height
          
          // 绘制图像
          ctx.drawImage(img, 0, 0)
          
          // 转换为 PNG 并下载
          canvas.toBlob((blob) => {
            if (blob) {
              const filename = generateFileName('chart')
              downloadFile(URL.createObjectURL(blob), `${filename}.png`, 'image/png')
            }
            URL.revokeObjectURL(url)
            document.body.removeChild(tempDiv)
            setIsExporting(false)
          }, 'image/png')
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(url)
          document.body.removeChild(tempDiv)
          setIsExporting(false)
          throw new Error('Failed to load SVG image')
        }
        
        img.src = url
      }).catch((error) => {
        document.body.removeChild(tempDiv)
        setIsExporting(false)
        console.error('Failed to render mermaid chart:', error)
        throw error
      })
    } catch (error) {
      setIsExporting(false)
      console.error('Failed to export PNG:', error)
      alert('Failed to export PNG. Please try again.')
    }
  }

  const handleExportSVG = async () => {
    if (!currentChart) return
    
    try {
      setIsExporting(true)
      
      // 使用 mermaid 渲染图表
      const mermaid = (await import('mermaid')).default
      const chartId = `export-${Date.now()}`
      
      await mermaid.render(chartId, currentChart.content).then((result) => {
        // 创建 SVG 内容，确保背景透明
        let svgContent = result.svg
        
        // 确保 SVG 有透明背景
        if (!svgContent.includes('background=')) {
          svgContent = svgContent.replace('<svg', '<svg style="background-color:transparent"')
        }
        
        // 下载 SVG
        const filename = generateFileName('chart')
        const blob = new Blob([svgContent], { type: 'image/svg+xml' })
        downloadFile(URL.createObjectURL(blob), `${filename}.svg`, 'image/svg+xml')
        
        setIsExporting(false)
      }).catch((error) => {
        setIsExporting(false)
        console.error('Failed to render mermaid chart:', error)
        throw error
      })
    } catch (error) {
      setIsExporting(false)
      console.error('Failed to export SVG:', error)
      alert('Failed to export SVG. Please try again.')
    }
  }

  const handleExportMermaid = () => {
    if (!currentChart) return
    
    try {
      const filename = generateFileName('chart')
      const content = currentChart.content
      downloadFile(
        `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
        `${filename}.mmd`,
        'text/plain'
      )
    } catch (error) {
      console.error('Failed to export Mermaid code:', error)
      alert('Failed to export Mermaid code. Please try again.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={!currentChart || isExporting}
          data-export-menu-trigger
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPNG}>
          <FileImage className="h-4 w-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSVG}>
          <FileImage className="h-4 w-4 mr-2" />
          Export as SVG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMermaid}>
          <File className="h-4 w-4 mr-2" />
          Export Mermaid Code
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ExportMenu