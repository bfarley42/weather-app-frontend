// src/components/CloudCoverChart.tsx
/**
 * Hourly cloud cover bar chart
 * - Bars colored by cloud coverage (light = clear, dark = overcast)
 * - Vertical divider between yesterday and today
 * - Grayish-blue color scheme
 */
import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
}

interface CloudCoverChartProps {
  data: HourlyData[];
  darkMode?: boolean;
  showTodayOnly?: boolean;
}

export default function CloudCoverChart({
  data,
  darkMode = false,
  showTodayOnly = false,
}: CloudCoverChartProps) {
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
        No cloud data available
      </div>
    );
  }

  // Sky code to cloud cover percentage
  const skyToCloudPct = (skyCode: string | null): number => {
    if (!skyCode) return 50;
    const code = skyCode.toUpperCase();
    switch (code) {
      case 'CLR':
      case 'SKC': return 0;
      case 'FEW': return 18;
      case 'SCT': return 44;
      case 'BKN': return 75;
      case 'OVC': return 100;
      default: return 50;
    }
  };

  const getConditionLabel = (skyCode: string | null): string => {
    if (!skyCode) return 'Unknown';
    const code = skyCode.toUpperCase();
    switch (code) {
      case 'CLR':
      case 'SKC': return 'Clear';
      case 'FEW': return 'Mostly Clear';
      case 'SCT': return 'Partly Cloudy';
      case 'BKN': return 'Mostly Cloudy';
      case 'OVC': return 'Overcast';
      default: return 'Unknown';
    }
  };

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
    const cloudPct = skyToCloudPct(hour.skyc1);

    return {
      hour: hourDate,
      value: cloudPct,
      condition: getConditionLabel(hour.skyc1),
      skyCode: hour.skyc1,
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

  // Bar colors based on cloud coverage - grayish blue palette
  const getBarColor = (cloudPct: number): string => {
    if (cloudPct <= 10) {
      return darkMode ? '#93c5fd' : '#bfdbfe'; // Very light blue - clear
    }
    if (cloudPct <= 30) {
      return darkMode ? '#7dd3fc' : '#93c5fd'; // Light blue - mostly clear
    }
    if (cloudPct <= 50) {
      return darkMode ? '#94a3b8' : '#cbd5e1'; // Gray-blue - partly cloudy
    }
    if (cloudPct <= 80) {
      return darkMode ? '#64748b' : '#94a3b8'; // Medium gray - mostly cloudy
    }
    return darkMode ? '#475569' : '#64748b'; // Dark gray - overcast
  };

  const barColors = chartData.map(d => getBarColor(d.value));

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    
    grid: {
      top: 30,
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
        
        return `
          <div style="font-weight:600;margin-bottom:4px">${dayLabel}, ${timeStr}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span>☁️</span>
            <span style="font-weight:600">${d.value}% cloud cover</span>
          </div>
          <div style="color:${darkMode ? '#94a3b8' : '#64748b'};margin-top:2px;font-size:12px">
            ${d.condition}
          </div>
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
        name: 'Cloud Cover',
        type: 'bar',
        data: chartData.map((d, i) => ({
          value: d.value,
          itemStyle: {
            color: barColors[i],
            borderRadius: [3, 3, 0, 0]
          }
        })),
        barWidth: '70%',
        emphasis: {
          itemStyle: {
            opacity: 0.8
          }
        },
        // Mark line for midnight divider
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
                padding: [0, 0, 0, 4]
              }
            }
          ]
        } : undefined
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