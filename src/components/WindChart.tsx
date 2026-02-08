// src/components/WindChart.tsx
/**
 * Hourly wind chart
 * - Continuous line for wind speed
 * - Diamond markers for gusts
 * - Max gust labeled on chart
 * - Cyan/teal color scheme
 */
import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  avg_wspd_mph: number | null;
  max_gust_mph: number | null;
}

interface WindChartProps {
  data: HourlyData[];
  darkMode?: boolean;
  showTodayOnly?: boolean;
}

export default function WindChart({
  data,
  darkMode = false,
  showTodayOnly = false,
}: WindChartProps) {
  const chartRef = useRef<ReactECharts | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        const instance = chartRef.current.getEchartsInstance();
        if (instance && !instance.isDisposed()) {
          instance.dispose();
        }
      }
    };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center', 
        color: darkMode ? '#94a3b8' : '#666' 
      }}>
        No wind data available
      </div>
    );
  }

  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => 
    new Date(a.ts_local).getTime() - new Date(b.ts_local).getTime()
  );

  // Find midnight index for divider
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let midnightIndex = -1;
  sortedData.forEach((hour, idx) => {
    const hourDate = new Date(hour.ts_local);
    if (hourDate.getHours() === 0 && hourDate.getDate() === today.getDate()) {
      midnightIndex = idx;
    }
  });

  // Find max gust for labeling
  let maxGustValue = 0;
  let maxGustIndex = -1;
  sortedData.forEach((hour, idx) => {
    if (hour.max_gust_mph && hour.max_gust_mph > maxGustValue) {
      maxGustValue = hour.max_gust_mph;
      maxGustIndex = idx;
    }
  });

  // Prepare chart data
  const chartData = sortedData.map(hour => {
    const hourDate = new Date(hour.ts_local);
    return {
      hour: hourDate,
      wind: hour.avg_wspd_mph,
      gust: hour.max_gust_mph && hour.max_gust_mph > 0 ? hour.max_gust_mph : null,
    };
  });

  // Format hour labels
  const formatHourLabel = (date: Date): string => {
    const hour = date.getHours();
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
  };

  // Determine if hour is yesterday or today
  const isYesterday = (date: Date): boolean => {
    const hourDay = new Date(date);
    hourDay.setHours(0, 0, 0, 0);
    return hourDay.getTime() < today.getTime();
  };

  // X-axis labels
  const xLabels = chartData.map(d => formatHourLabel(d.hour));

  // Colors
  const windColor = darkMode ? '#22d3ee' : '#0891b2';
  const gustColor = darkMode ? '#f97316' : '#ea580c';
  const areaColorTop = darkMode ? 'rgba(34, 211, 238, 0.3)' : 'rgba(8, 145, 178, 0.2)';
  const areaColorBottom = darkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(8, 145, 178, 0.02)';

  // Calculate y-axis max
  const allValues = [
    ...chartData.map(d => d.wind).filter((v): v is number => v !== null),
    ...chartData.map(d => d.gust).filter((v): v is number => v !== null),
  ];
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 20;
  const yAxisMax = Math.ceil(maxValue / 10) * 10 + 5;

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    
    grid: {
      top: 35,
      right: 15,
      bottom: 60,
      left: 40,
      containLabel: false
    },

    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      borderColor: darkMode ? '#475569' : '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: darkMode ? '#e2e8f0' : '#1e293b',
        fontSize: 13
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        
        const idx = params[0].dataIndex;
        const d = chartData[idx];
        const dayLabel = isYesterday(d.hour) ? 'Yesterday' : 'Today';
        const timeStr = d.hour.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        let html = `<div style="font-weight:600;margin-bottom:6px">${dayLabel}, ${timeStr}</div>`;
        
        // Wind speed
        const windParam = params.find((p: any) => p.seriesName === 'Wind Speed');
        if (windParam && windParam.value !== null && windParam.value !== undefined) {
          html += `
            <div style="display:flex;align-items:center;gap:6px;margin:3px 0">
              <span style="display:inline-block;width:10px;height:2px;background:${windColor};border-radius:1px"></span>
              <span>Wind:</span>
              <span style="font-weight:600">${Math.round(windParam.value)} mph</span>
            </div>
          `;
        }
        
        // Gust
const gustParam = params.find((p: any) => p.seriesName === 'Gusts');
if (gustParam && gustParam.value !== null && gustParam.value !== undefined && !isNaN(gustParam.value[1])) {
          html += `
            <div style="display:flex;align-items:center;gap:6px;margin:3px 0">
              <span style="display:inline-block;width:8px;height:8px;background:${gustColor};transform:rotate(45deg)"></span>
              <span>Gust:</span>
              <span style="font-weight:600">${Math.round(gustParam.value[1])} mph</span>
            </div>
          `;
        }
        
        return html;
      }
    },

    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: {
        lineStyle: {
          color: darkMode ? '#475569' : '#cbd5e1'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        fontSize: isMobile ? 9 : 11,
        color: darkMode ? '#64748b' : '#94a3b8',
        interval: isMobile ? 2 : 1,
        rotate: 0
      }
    },

    yAxis: {
      type: 'value',
      min: 0,
      max: yAxisMax,
      axisLine: {
        show: true,
        lineStyle: {
          color: darkMode ? '#475569' : '#cbd5e1'
        }
      },
      splitLine: {
        lineStyle: {
          color: darkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)',
          type: 'dashed'
        }
      },
      axisLabel: {
        formatter: '{value}',
        fontSize: isMobile ? 9 : 11,
        color: darkMode ? '#64748b' : '#94a3b8'
      }
    },

    series: [
      // Wind speed line with area
{
  name: 'Wind Speed',
  type: 'line',
  data: chartData.map(d => d.wind),
  smooth: true,
  symbol: 'circle',
  symbolSize: 6,
  showSymbol: false,
  lineStyle: {
    width: 2.5,
    color: windColor
  },
  itemStyle: {
    color: windColor
  },
  areaStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: areaColorTop },
      { offset: 1, color: areaColorBottom }
    ])
  },
  emphasis: {
    scale: true,
    lineStyle: {
      width: 3
    }
  },
        // Midnight divider
        markLine: (!showTodayOnly && midnightIndex > 0) ? {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: darkMode ? '#64748b' : '#94a3b8',
            type: 'dashed',
            width: 2
          },
          data: [
            {
              xAxis: midnightIndex - 0.5,
        label: {
        show: true,
        position: 'start',
        formatter: 'Today',
        fontSize: 11,
        fontWeight: 'bold',
        color: darkMode ? '#94a3b8' : '#64748b',
        offset: [4, 20]
        }
            }
          ]
        } : undefined
      },
      // Gusts as diamond scatter
      {
        name: 'Gusts',
        type: 'scatter',
        data: chartData.map((d, idx) => d.gust !== null ? [idx, d.gust] : null).filter(d => d !== null),
        symbol: 'diamond',
        symbolSize: isMobile ? 10 : 12,
        itemStyle: {
          color: gustColor,
          borderColor: darkMode ? '#1e293b' : '#ffffff',
          borderWidth: 1.5
        },
        emphasis: {
        //   symbolSize: isMobile ? 14 : 16
        },
        // Label max gust
        markPoint: maxGustIndex >= 0 ? {
          data: [
            {
              name: 'Max Gust',
              coord: [maxGustIndex, maxGustValue],
              value: maxGustValue,
              label: {
                show: true,
                formatter: (params: any) => `${Math.round(params.value)} mph`,
                position: 'top',
                distance: 8,
                fontSize: isMobile ? 10 : 12,
                fontWeight: 'bold',
                color: darkMode ? '#fdba74' : '#c2410c',
                backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                padding: [4, 8],
                borderRadius: 4,
                borderColor: gustColor,
                borderWidth: 1
              },
              symbolSize: 0
            }
          ]
        } : undefined,
        z: 10
      }
    ],

    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut'
  };

  return (
    <div style={{
      width: '100%',
      height: isMobile ? '240px' : '280px',
      background: darkMode ? '#1e293b' : '#ffffff',
      borderRadius: '12px',
      padding: isMobile ? '8px' : '12px',
      boxShadow: darkMode 
        ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
        : '0 2px 8px rgba(0, 0, 0, 0.08)'
    }}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}