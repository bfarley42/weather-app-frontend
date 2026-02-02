// src/components/HourlyChartSimple.tsx
/**
 * Simplified hourly weather chart for modal display
 * - No date slider
 * - Only 1D, 3D, 7D buttons
 * - Defaults to 1D
 * - Original purple gradient color scheme
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null;
}

interface HourlyChartSimpleProps {
  data: HourlyWeather[];
  stationName: string;
  darkMode?: boolean;
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: string) => void;
  initialRange?: string;
}

export default function HourlyChartSimple({
  data,
  stationName,
  darkMode = false,
  startDate,
  endDate,
  onDateRangeChange,
  initialRange = '1D',
}: HourlyChartSimpleProps) {
  const [activeRange, setActiveRange] = useState<string>(initialRange);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const chartRef = useRef<ReactECharts | null>(null);
  const isUnmounting = useRef(false);
  const [showFeelsLike, setShowFeelsLike] = useState(false);  // ADD THIS

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mark component as unmounting to prevent echarts errors
  useEffect(() => {
    isUnmounting.current = false;
    return () => {
      isUnmounting.current = true;
    };
  }, []);

  const handleRangeClick = useCallback((range: string) => {
    if (isUnmounting.current) return;
    setActiveRange(range);
    onDateRangeChange(range);
  }, [onDateRangeChange]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: '60px 20px', 
        textAlign: 'center', 
        color: darkMode ? '#94a3b8' : '#666' 
      }}>
        No hourly data available
      </div>
    );
  }

  // Prepare data - keep as strings for echarts
  const timestamps = data.map(d => d.ts_local);
  const temps = data.map(d => d.tmpf);
  const precip = data.map(d => d.precip_in || 0);
  const feelsLike = data.map(d => d.feelslike_f);

  // Format timestamp for tooltip
  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${month} ${day}, ${displayHour} ${ampm}`;
  };

  // Format axis labels based on range
  const formatAxisLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const hour = date.getHours();
    
    if (hour === 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `{date|${month} ${day}}`;
    }
    
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'pm' : 'am';
      const displayHour = h % 12 || 12;
      return `${displayHour}${ampm}`;
    };
    
    if (activeRange === '7D') {
      return hour === 12 ? `{small|${formatHour(hour)}}` : '';
    }
    
    if (activeRange === '3D') {
      return [6, 12, 18].includes(hour) ? `{small|${formatHour(hour)}}` : '';
    }
    
    if (activeRange === '1D') {
      return hour % 3 === 0 && hour !== 0 ? `{small|${formatHour(hour)}}` : '';
    }
    
    return '';
  };

  // Format display date for title
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Shorten long station names
  const shortenStationName = (name: string): string => {
    if (!name) return '';
    if (name.length > 40) {
      return name
        .replace(/INTERNATIONAL/g, 'INTL')
        .replace(/AIRPORT/g, 'AP')
        .replace(/CENTER/g, 'CTR');
    }
    return name;
  };

  // Calculate temp range for y-axis
  const validTemps = temps.filter((t): t is number => t !== null);
  const tempMin = validTemps.length > 0 ? Math.floor(Math.min(...validTemps) / 5) * 5 - 5 : 0;
  const tempMax = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps) / 5) * 5 + 5 : 100;

  // Calculate precip max
  const maxPrecip = Math.max(...precip, 0.1);
  const precipMax = Math.ceil(maxPrecip * 10) / 10 + 0.05;
 

  // Find last valid temp for endpoint label
  const findLastValidIndex = (arr: (number | null)[]): { index: number; value: number } | null => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== null && arr[i] !== undefined) {
        return { index: i, value: arr[i] as number };
      }
    }
    return null;
  };
  const lastTemp = findLastValidIndex(temps);
  const lastFeelsLike = findLastValidIndex(feelsLike);

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: {
      text: shortenStationName(stationName),
      subtext: `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`,
      left: 'center',
      top: 8,
      itemGap: 4,
      textStyle: {
        fontSize: isMobile ? 15 : 20,
        fontWeight: 700,
        color: darkMode ? '#ecf0f1' : '#2c3e50',
      },
      subtextStyle: {
        fontSize: isMobile ? 12 : 14,
        fontWeight: 500,
        color: darkMode ? '#95a5a6' : '#7f8c8d',
      }
    },
    
    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? 'rgba(30, 38, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: 15,
      textStyle: {
        color: darkMode ? '#e3eef5' : '#333',
        fontSize: isMobile ? 13 : 14
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: darkMode ? '#7f8c8d' : '#999',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        const dateIdx = params[0].dataIndex;
        const timestamp = formatTimestamp(timestamps[dateIdx]);
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${timestamp}</div>`;
        
        params.forEach((param: any) => {
          const value = param.value;
          if (value === null || value === undefined) return;
          
          let displayValue: string;
          let unit: string;
          
          if (param.seriesName === 'Temperature') {
            displayValue = Math.round(value).toString();
            unit = '°F';
          } else {
            displayValue = value.toFixed(2);
            unit = '"';
          }
          
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="color: ${darkMode ? '#bdc3c7' : '#666'};">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 12px; color: ${darkMode ? '#ecf0f1' : '#333'};">${displayValue}${unit}</span>
            </div>
          `;
        });
        
        return html;
      }
    },
    
    legend: {
      data: ['Temperature', 'Precipitation'],
      top: isMobile ? 50 : 55,
      left: 'center',
      itemGap: isMobile ? 12 : 20,
      itemWidth: isMobile ? 15 : 20,
      itemHeight: isMobile ? 8 : 12,
      textStyle: {
        fontSize: isMobile ? 11 : 13,
        color: darkMode ? '#bdc3c7' : '#555'
      }
    },
    
    grid: {
      left: isMobile ? 50 : 60,
      right: isMobile ? 50 : 60,
      top: isMobile ? 90 : 100,
      bottom: isMobile ? 50 : 60
    },
    
    // Only inside zoom (pinch/scroll), no slider
    dataZoom: [{
      type: 'inside',
      start: 0,
      end: 100
    }],
    
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: { color: darkMode ? '#34495e' : '#bdc3c7' }
      },
      axisTick: {
        lineStyle: { color: darkMode ? '#34495e' : '#bdc3c7' }
      },
      axisLabel: {
        formatter: (value: string) => formatAxisLabel(value),
        rich: {
          date: {
            fontSize: isMobile ? 11 : 12,
            fontWeight: 600,
            color: darkMode ? '#ecf0f1' : '#2c3e50',
            padding: [8, 0, 0, 0]
          },
          small: {
            fontSize: isMobile ? 10 : 11,
            color: darkMode ? '#95a5a6' : '#7f8c8d'
          }
        },
        interval: 0,
        rotate: 0
      }
    },
    
    yAxis: [
      // Temperature axis (left) - orange/red theme
      {
        type: 'value',
        name: '°F',
        nameLocation: 'end',
        nameTextStyle: {
          fontSize: 11,
          color: darkMode ? '#e74c3c' : '#e74c3c',
          padding: [0, 0, 0, -20]
        },
        min: tempMin,
        max: tempMax,
        splitLine: {
          lineStyle: {
            color: darkMode ? 'rgba(52, 73, 94, 0.5)' : 'rgba(189, 195, 199, 0.5)',
            type: 'dashed'
          }
        },
        axisLine: {
          show: true,
          lineStyle: { color: darkMode ? '#e74c3c' : '#e74c3c' }
        },
        axisLabel: {
          formatter: '{value}°',
          fontSize: isMobile ? 10 : 11,
          color: darkMode ? '#e74c3c' : '#c0392b'
        }
      },
      // Precipitation axis (right) - blue theme
      {
        type: 'value',
        name: 'in',
        nameLocation: 'end',
        nameTextStyle: {
          fontSize: 11,
          color: darkMode ? '#3498db' : '#2980b9',
          padding: [0, -20, 0, 0]
        },
        min: 0,
        max: precipMax,
        splitLine: { show: false },
        axisLine: {
          show: true,
          lineStyle: { color: darkMode ? '#3498db' : '#2980b9' }
        },
        axisLabel: {
          formatter: (val: number) => val.toFixed(2),
          fontSize: isMobile ? 10 : 11,
          color: darkMode ? '#3498db' : '#2980b9'
        }
      }
    ],
    
    series: [
      // Temperature line with gradient - ORIGINAL COLOR SCHEME
    {
      name: 'Temperature',
      type: 'line',
      data: temps,
      smooth: true,
      symbolSize: 4,
      showSymbol: false,
        itemStyle: {
        color: darkMode ? '#18a32fff' : '#bd0b0bd5',
        borderColor: darkMode ? '#1a1a2e' : '#fff',
        borderWidth: 2
      },
      lineStyle: {
        width: 2.0,
        opacity: showFeelsLike ? 0.5 : 1,  // ADD THIS - fade when feels like shown
        color: showFeelsLike ? 
        new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: darkMode ? '#b6bdbae0' : '#aca6a4f1' },
          { offset: 1, color: darkMode ? '#848f8cff' : '#867777b6' }
        ])        
        :
        new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: darkMode ? '#0fc076c2' : '#a52b06f1' },
          { offset: 1, color: darkMode ? '#119675ff' : '#910404b6' }
        ])


      },
markPoint: showFeelsLike ? undefined : (lastTemp ? {
  data: [
    {
      type: 'max',
      name: 'High',
      label: {
        show: true,
        formatter: (params: any) => `${Math.round(params.value)}°`,
        position: 'top',
        color: darkMode ? '#fff' : '#fff',
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(190, 0, 16, 0.8)' : 'rgba(190, 0, 16, 0.7)',
        padding: [2.5, 7],
        borderRadius: 6
      },
      symbolSize: 0
    },
    {
      type: 'min',
      name: 'Low',
      label: {
        show: true,
        formatter: (params: any) => `${Math.round(params.value)}°`,
        position: 'bottom',
        color: darkMode ? '#fff' : '#fff',
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(0, 190, 174, 0.8)' : 'rgba(11, 116, 202, 0.66)',
        padding: [2.5, 7],
        borderRadius: 4
      },
      symbolSize: 0
    },
    {
      coord: [lastTemp.index, lastTemp.value],
      label: {
        show: true,
        formatter: `${Math.round(lastTemp.value)}°`,
        position: 'right',
        color: darkMode ? '#fff' : '#fff',
        fontSize: isMobile ? 10 : 12,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(150, 150, 150, 0.7)' : 'rgba(117, 117, 117, 0.6)',
        padding: [2, 6],
        borderRadius: 4
      },
      symbolSize: 0
    }
  ]
} : undefined),
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: darkMode ? 'rgba(255, 150, 150, 0.5)' : 'rgba(255, 107, 107, 0.5)'
        }
      },
      yAxisIndex: 0,
      z: showFeelsLike ? 1 : 2  // Lower z-index when feels like active
    },
...(showFeelsLike ? [{
  name: 'Feels Like',
  type: 'line',
  data: feelsLike,
  smooth: true,
  symbol: 'none',
  lineStyle: {
    width: 2,  // Make it prominent
    color: darkMode ? '#e74b0eff' : '#e25614ff'
  },
    itemStyle: {
        color: darkMode ? '#e74b0eff': '#e25614ff', // 👈 match line
        opacity: darkMode ? 0.8: 0.5,
      },
markPoint: lastFeelsLike ? {
  data: [
    {
      type: 'max',
      name: 'High',
      label: {
        show: true,
        formatter: (params: any) => `${Math.round(params.value)}°`,
        position: 'top',
        color: darkMode ? '#fff' : '#2c3e50',
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(255, 160, 122, 0.8)' : 'rgba(255, 140, 105, 0.9)',
        padding: [3, 7],
        borderRadius: 4
      },
      symbolSize: 0
    },
    {
      type: 'min',
      name: 'Low',
      label: {
        show: true,
        formatter: (params: any) => `${Math.round(params.value)}°`,
        position: 'bottom',
        color: darkMode ? '#fff' : '#fff',
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(0, 190, 174, 0.8)' : 'rgba(11, 116, 202, 0.66)',
        padding: [3, 7],
        borderRadius: 4
      },
      symbolSize: 0
    },
    {
      coord: [lastFeelsLike.index, lastFeelsLike.value],
      label: {
        show: true,
        formatter: `${Math.round(lastFeelsLike.value)}°`,
        position: 'right',
        color: darkMode ? '#fff' : '#ffffffff',
        fontSize: isMobile ? 10 : 12,
        fontWeight: 'semibold',
        backgroundColor: darkMode ? 'rgba(150, 150, 150, 0.7)' : 'rgba(117, 117, 117, 0.6)',
        padding: [2, 6],
        borderRadius: 4
      },
      symbolSize: 0
    }
  ]
} : undefined,
  emphasis: {
    focus: 'series',
    lineStyle: {
      width: 3
    }
  },
  yAxisIndex: 0,
  z: 2
}] : []),  

      // Precipitation bars - ORIGINAL COLOR SCHEME
      {
        name: 'Precipitation',
        type: 'bar',
        data: precip,
        barWidth: isMobile ? '40%' : '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: darkMode ? '#3498db' : '#3498db' },
            { offset: 1, color: darkMode ? '#2980b9' : '#1a5276' }
          ]),
          borderRadius: [3, 3, 0, 0]
        },
        yAxisIndex: 1,
        z: 1
      }
    ],
    
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  };

  return (
    <div style={{ width: '100%', padding: isMobile ? '8px' : '16px' }}>
      {/* Date Range Buttons - ORIGINAL PURPLE GRADIENT STYLE */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? '8px' : '10px',
        marginBottom: '16px'
      }}>
        {['1D', '3D', '7D'].map(range => (
          <button
            key={range}
            onClick={() => handleRangeClick(range)}
            style={{
              padding: isMobile ? '8px 18px' : '10px 24px',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: activeRange === range ? 700 : 500,
              color: activeRange === range ? '#fff' : (darkMode ? '#95a5a6' : '#666'),
              background: activeRange === range
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : (darkMode ? 'rgba(52, 73, 94, 0.3)' : 'rgba(0, 0, 0, 0.04)'),
              border: activeRange === range
                ? 'none'
                : `1px solid ${darkMode ? 'rgba(149, 165, 166, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeRange === range
                ? '0 2px 8px rgba(102, 126, 234, 0.3)'
                : 'none'
            }}
          >
            {range}
          </button>
        ))}
      </div>
      {/* Feels Like toggle (Apple-style) */}
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    margin: isMobile ? '6px 0 10px' : '8px 0 12px',
    userSelect: 'none'
  }}
>
  <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#cbd5e1' : '#334155' }}>
    Feels Like
  </span>

  <div
    onClick={() => setShowFeelsLike(v => !v)}
    style={{
      width: 42,
      height: 24,
      borderRadius: 999,
      background: showFeelsLike
        ? (darkMode ? 'rgba(96,165,250,0.85)' : 'rgba(59,130,246,0.85)')
        : (darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'),
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 180ms ease'
    }}
    role="switch"
    aria-checked={showFeelsLike}
    title="Toggle feels-like temperature"
  >
    <div
      style={{
        position: 'absolute',
        top: 3,
        left: 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transform: showFeelsLike ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 180ms ease'
      }}
    />
  </div>
</div>


      {/* Chart */}
      <div style={{
        width: '100%',
        height: isMobile ? '420px' : '520px',
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '8px' : '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}