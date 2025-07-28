// components/MermaidDiagram.jsx
'use client'; // 必须在客户端组件中使用

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderDiagram = async () => {
    try {
      const { svg } = await mermaid.render('mermaid-svg', chart);
      containerRef.current!.innerHTML = svg;
    } catch (error: any) {
      console.error('Mermaid 渲染错误:', error);
      containerRef.current!.innerHTML = `<div>流程图渲染错误: ${error?.message}</div>`;
    }
  };

  useEffect(() => {
    if (!containerRef.current || !chart) return;

    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });

    // 清理容器
    containerRef.current.innerHTML = '';

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        if (svg && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error: any) {
        // 在渲染错误时显示简单文本表示
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div>流程图渲染错误: ${error?.message}</div>`;
        }
      }
    };
    renderDiagram();
  }, [chart]);

  return <div ref={containerRef} className='mermaid-container' />;
};

export default MermaidDiagram;
