import { TrendData } from '@/api';
import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';

type ECharts = ReturnType<typeof echarts.init>;
export interface PropsData {
  height: number;
  text: string;
  chartData: TrendData[];
}
const BarTrend = ({ chartData, height, text }: PropsData) => {
  const domWrapRef = useRef<HTMLDivElement>(null!);
  const echartRef = useRef<ECharts>(null!);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrendData[]>([]);

  useEffect(() => {
    if (domWrapRef.current && !echartRef.current && chartData.length > 0) {
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
        axisPointer: {
          type: 'shadow',
        },
        formatter: (
          params: { seriesName: string; name: string; value: number }[],
        ) => {
          if (params[0]) {
            const { name, seriesName, value } = params[0];
            return `<div style="font-family: G;min-width: 80px">
              ${name || '-'}
              <div>${seriesName} <span style='font-family: Gbold'>${value || 0}</span></div>
            </div>`;
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
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#F2F3F5',
          },
        },
      },
      series: {
        name: text,
        type: 'bar',
        barGap: 0,
        barMinHeight: 4,
        data: data.map(it => ({
          value: it.count,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#3248F2' },
                { offset: 1, color: '#9E68FC' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        })),
      },
    };
    if (domWrapRef.current && echartRef.current && data.length > 0) {
      echartRef.current.setOption(option);
      setLoading(false);
    }
    const resize = () => {
      if (echartRef.current) {
        echartRef.current.resize();
      }
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [data]);

  if (data.length === 0 && !loading)
    return <div style={{ width: '100%', height }} />;
  return <div ref={domWrapRef} style={{ width: '100%', height }} />;
};

export default BarTrend;
