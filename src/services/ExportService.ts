export class ExportService {
  static async exportAsPNG(svgElement: SVGElement): Promise<void> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建canvas上下文');

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `mermaid-diagram-${Date.now()}.png`;
            link.click();
          }
        }, 'image/png');
        
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        throw new Error('加载SVG失败');
      };

      img.src = url;
    } catch (error) {
      console.error('导出PNG失败:', error);
      throw new Error('导出PNG失败，请重试');
    }
  }

  static exportAsSVG(svgElement: SVGElement): void {
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-diagram-${Date.now()}.svg`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出SVG失败:', error);
      throw new Error('导出SVG失败，请重试');
    }
  }

  static exportAsMermaid(mermaidCode: string): void {
    try {
      const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-diagram-${Date.now()}.mmd`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出Mermaid代码失败:', error);
      throw new Error('导出Mermaid代码失败，请重试');
    }
  }
}