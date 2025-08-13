/* eslint-disable @typescript-eslint/no-explicit-any */
import { TrendData } from '@/api';
import { useThemeMode } from 'ct-mui';
import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';

type ECharts = ReturnType<typeof echarts.init>;
export interface PropsData {
  chartData: TrendData[];
  height: number;
  size?: 'small' | 'large';
}

const LineTrend = ({ chartData = [], height, size = 'large' }: PropsData) => {
  const { mode } = useThemeMode();
  const domWrapRef = useRef<HTMLDivElement>(null!);
  const echartRef = useRef<ECharts>(null!);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    if (domWrapRef.current) {
      echartRef.current = echarts.init(domWrapRef.current, null, {
        renderer: 'svg',
      });
    }
    setData(chartData);
  }, [chartData]);

  useEffect(() => {
    const option = {
      grid: {
        left: 0,
        right: 0,
        bottom: 10,
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        position: function (
          point: number[],
          _params: any,
          _dom: any,
          _rect: any,
          size: any,
        ) {
          return [point[0] - size.contentSize[0], point[1] + 20];
        },
        axisPointer: {
          type: 'shadow',
        },
        formatter: (
          params: { name: string; seriesName: string; value: number }[],
        ) => {
          if (params[0]) {
            const { name, seriesName, value } = params[0];
            return `<div style="font-family: G;">${name}<div>${seriesName} ${value}</div></div>`;
          }
          return '';
        },
      },
      xAxis: {
        type: 'category',
        data: data.map(it => it.name),
        splitLine: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        splitLine:
          size === 'small'
            ? false
            : {
                lineStyle: {
                  type: 'dashed',
                  color: '#F2F3F5',
                },
              },
      },
      series: {
        name: '问答次数',
        symbol: 'none',
        type: 'line',
        smooth: true,
        data: data.map(it => it.count),
        lineStyle: {
          color: {
            type: 'linear',
            x: 0, // 起点 x 坐标（0: 左侧）
            y: 0, // 起点 y 坐标（0: 顶部）
            x2: 1, // 终点 x 坐标（1: 右侧）
            y2: 1, // 终点 y 坐标（0: 保持顶部，形成水平渐变）
            colorStops: [
              { offset: 0, color: '#9E68FC' }, // 起始颜色
              { offset: 1, color: '#3248F2' }, // 结束颜色
            ],
          },
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(158,104,252,0.1)' },
              { offset: 1, color: 'rgba(50,72,242,0)' },
            ],
            global: false,
          },
        },
      },
    };
    if (domWrapRef.current && echartRef.current) {
      echartRef.current.setOption(option);
      setLoading(false);
    }

    const resize = () => {
      if (echartRef.current) {
        echartRef.current.resize();
      }
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode]);

  if (data.length === 0 && !loading)
    return <div style={{ width: '100%', height }} />;
  return <div ref={domWrapRef} style={{ width: '100%', height }} />;
};

export default LineTrend;
