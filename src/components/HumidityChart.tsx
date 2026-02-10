// src/components/HumidityChart.tsx
/**
 * Hourly humidity chart
 * - Smooth line for relative humidity
 * - Blue/purple color scheme
 * - Comfort zone shading
 */
import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface HourlyData {
  ts_local: string;
  relh_pct: number | null;
}

interface HumidityChartProps {
  data: HourlyData[];
  darkMode?: boolean;
  showTodayOnly?: boolean;
}

export default function HumidityChart({
  data,
  darkMode = false,
  showTodayOnly = false,
}: HumidityChartProps) {
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
        No humidity data available
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

  // Prepare chart data
  const chartData = sortedData.map(hour => {
    const hourDate = new Date(hour.ts_local);
    return {
      hour: hourDate,
      humidity: hour.relh_pct,
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

  // Colors - blue/purple theme
  const lineColor = darkMode ? '#a78bfa' : '#8b5cf6';
  const areaColorTop = darkMode ? 'rgba(167, 139, 250, 0.3)' : 'rgba(139, 92, 246, 0.2)';
  const areaColorBottom = darkMode ? 'rgba(167, 139, 250, 0.05)' : 'rgba(139, 92, 246, 0.02)';

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
        
        const humidity = params[0].value;
        let comfortLabel = 'Dry';
        let comfortColor = '#f59e0b';
        if (humidity >= 30 && humidity < 50) { comfortLabel = 'Comfortable'; comfortColor = '#22c55e'; }
        else if (humidity >= 50 && humidity < 70) { comfortLabel = 'Moderate'; comfortColor = '#3b82f6'; }
        else if (humidity >= 70) { comfortLabel = 'Humid'; comfortColor = '#8b5cf6'; }
        
        return `
          <div style="font-weight:600;margin-bottom:6px">${dayLabel}, ${timeStr}</div>
          <div style="display:flex;align-items:center;gap:6px;margin:3px 0">
            <span style="display:inline-block;width:10px;height:2px;background:${lineColor};border-radius:1px"></span>
            <span>Humidity:</span>
            <span style="font-weight:600">${humidity !== null ? Math.round(humidity) : '--'}%</span>
          </div>
          <div style="color:${comfortColor};font-size:12px;margin-top:2px">${comfortLabel}</div>
        `;
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
      max: 100,
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
        formatter: '{value}%',
        fontSize: isMobile ? 9 : 11,
        color: darkMode ? '#64748b' : '#94a3b8'
      }
    },

series: [
  {
    name: 'Humidity',
    type: 'line' as const,
    data: chartData.map(d => d.humidity),
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: false,
    lineStyle: {
      width: 2.5,
      color: lineColor
    },
    itemStyle: {
      color: lineColor
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
            position: 'insideStartBottom',
            formatter: 'Today',
            fontSize: 11,
            fontWeight: 'bold',
            color: darkMode ? '#94a3b8' : '#64748b',
            offset: [4, 20]
          }
        }
      ]
    } : undefined,
    markArea: {
      silent: true,
      data: [
        [{
          yAxis: 30,
          itemStyle: {
            color: darkMode ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)'
          }
        }, {
          yAxis: 50
        }]
      ]
    },
    markPoint: {
      symbol: 'circle',
      symbolSize: 8,
      label: {
        show: true,
        fontSize: isMobile ? 9 : 11,
        fontWeight: 'bold' as const,
        formatter: (params: any) => `${Math.round(params.value)}%`
      },
      data: [
        {
          type: 'max' as const,
          name: 'Max',
          label: {
            position: 'top' as const,
            color: darkMode ? '#c4b5fd' : '#7c3aed',
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            padding: [4, 6],
            borderRadius: 4
          },
          itemStyle: {
            color: darkMode ? '#a78bfa' : '#8b5cf6'
          }
        },
        {
          type: 'min' as const,
          name: 'Min',
          label: {
            position: 'bottom' as const,
            color: darkMode ? '#93c5fd' : '#3b82f6',
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            padding: [4, 6],
            borderRadius: 4
          },
          itemStyle: {
            color: darkMode ? '#60a5fa' : '#3b82f6'
          }
        }
      ]
    }
  } as any
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