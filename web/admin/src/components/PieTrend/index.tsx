import { TrendData } from '@/api';
import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';

type ECharts = ReturnType<typeof echarts.init>;
export interface PropsData {
  height: number;
  text: string;
  chartData: TrendData[];
}
const PieTrend = ({ chartData, height, text }: PropsData) => {
  const domWrapRef = useRef<HTMLDivElement>(null!);
  const echartRef = useRef<ECharts>(null!);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrendData[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (domWrapRef.current && !echartRef.current && chartData.length > 0) {
      echartRef.current = echarts.init(domWrapRef.current, null, {
        renderer: 'svg',
      });
    }
    const t = chartData.reduce((acc, cur) => acc + cur.count, 0);
    setTotal(t);
    setData(chartData);
  }, [chartData]);

  useEffect(() => {
    const option = {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: { name: string; value: number }) => {
          const { name, value } = params;
          return `<div style="font-family: G;color: #21222D;display: flex;gap: 16px; min-width: 100px">
          <div style='color: rgba(33,34,35,0.5);flex-grow: 1;'>${name || '-'}</div>
          <div style='font-family: Gbold;flex-shrink: 0'>${value || 0}</div>
          </div>`;
        },
      },
      series: {
        name: text,
        type: 'pie',
        radius: [54, 60],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: data.map(it => ({
          name: it.name,
          value: it.count,
          itemStyle: {
            color: it.color,
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
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <div ref={domWrapRef} style={{ width: '100%', height }} />
      {total > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '20px',
            fontFamily: 'Gbold',
            color: '#21222D',
          }}
        >
          {total}
        </div>
      )}
    </div>
  );
};

export default PieTrend;
