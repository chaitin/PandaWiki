import { TrendData } from '@/api';
import { Box, useTheme } from '@mui/material';
import type { ECharts } from 'echarts';
import { useEffect, useRef, useState } from 'react';

interface Props {
  map: 'china' | 'world' | string;
  data: TrendData[];
  tooltipText: string;
}

const MapChart = ({ map, data: chartData, tooltipText }: Props) => {
  const theme = useTheme();
  const domWrapRef = useRef<HTMLDivElement>(null);
  const echartRef = useRef<ECharts>(null!);
  const [loading, setLoading] = useState(true);
  const [max, setMax] = useState(0);
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    setMax(Math.max(1, ...chartData.map(i => i.count)));
    setData(chartData.map(it => ({ name: it.name, value: it.count })));
    if (domWrapRef.current && !echartRef.current) {
      echartRef.current = (window as any).echarts.init(domWrapRef.current);
    }
  }, [chartData]);

  useEffect(() => {
    if (!echartRef.current) return;

    const option = {
      grid: {
        top: 0,
        bottom: 0,
        right: 0,
        left: 0,
      },
      tooltip: {
        formatter: (params: any) => {
          return `${params.name}<br />${tooltipText}: <span style='font-family: 'Gbold'>${params.value || 0}</span>`;
        },
      },
      visualMap: [
        {
          show: true,
          orient: 'horizontal',
          left: 8,
          bottom: 8,
          itemWidth: 10,
          color: ['#3082FF', '#EBF3FF'],
          max,
          textStyle: {
            color: theme.palette.primary.main,
          },
        },
      ],
      series: [
        {
          type: 'map',
          map,
          data: data,
          itemStyle: {
            borderColor: theme.palette.divider,
            areaColor: '#DDE4F0',
            emphasis: {
              show: true,
              areaColor: '#A9C0E3',
            },
          },
        },
      ],
    };

    echartRef.current.setOption(option, true);
    setLoading(false);

    const resize = () => {
      if (echartRef.current) {
        echartRef.current.resize();
      }
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [map, data]);

  // if (!loading) return <div style={{ width: '100%', height: 292 }} />
  return (
    <Box
      sx={{ width: '100%', height: 292, pr: '200px' }}
      ref={domWrapRef}
    ></Box>
  );
};

export default MapChart;
