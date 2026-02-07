// src/components/HourlyPrecipChart.tsx
/**
 * Hourly precipitation chart for 24-hour display
 * Features:
 * - Bar chart showing hourly precip amounts
 * - Toggle for cumulative line overlay
 * - Apple Weather-inspired styling
 */
import { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Droplets } from 'lucide-react';
// import type { EChartsOption, LineSeriesOption, BarSeriesOption } from 'echarts';
// import type { ZRFontWeight } from 'zrender';

interface HourlyPrecipData {
  ts_local: string;
  precip_in: number | null;
}

interface HourlyPrecipChartProps {
  data: HourlyPrecipData[];
  stationName: string;
  darkMode?: boolean;
  totalPrecip?: number | null;
}

export default function HourlyPrecipChart({
  data,
  stationName,
  darkMode = false,
  totalPrecip,
}: HourlyPrecipChartProps) {
  const [showCumulative, setShowCumulative] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const chartRef = useRef<ReactECharts | null>(null);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup chart on unmount
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
        padding: '60px 20px', 
        textAlign: 'center', 
        color: darkMode ? '#94a3b8' : '#666' 
      }}>
        No precipitation data available
      </div>
    );
  }

  // Prepare data
  const timestamps = data.map(d => d.ts_local);
  const precipValues = data.map(d => d.precip_in ?? 0);

  // Calculate cumulative values
  const cumulativeValues: number[] = [];
  let cumSum = 0;
  precipValues.forEach(val => {
    cumSum += val;
    cumulativeValues.push(Number(cumSum.toFixed(3)));
  });

  // Calculate total
  const calculatedTotal = precipValues.reduce((sum, val) => sum + val, 0);
  const displayTotal = totalPrecip ?? calculatedTotal;

  // Format hour for x-axis
  const formatAxisLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const hour = date.getHours();
    const day = date.getDate();
    
    // Show date at midnight
    if (hour === 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `{date|${month} ${day}}`;
    }
    
    // Show every 3 hours
    if (hour % 3 === 0) {
      const ampm = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour % 12 || 12;
      return `{small|${displayHour}${ampm}}`;
    }
    
    return '';
  };

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

  // Shorten station name if needed
  const shortenStationName = (name: string): string => {
    if (!name) return '';
    if (name.length > 35) {
      return name
        .replace(/INTERNATIONAL/g, 'INTL')
        .replace(/AIRPORT/g, 'AP')
        .replace(/CENTER/g, 'CTR');
    }
    return name;
  };

  // Colors
  const barTop = darkMode ? 'rgba(90, 200, 255, 0.95)' : '#1440aed8';
  const barBottom = darkMode ? 'rgba(0, 70, 130, 0.90)' : 'rgba(0,111,190,0.45)';
  const cumulativeColor = darkMode ? '#14ae82e0' : '#14AE82';

  // Calculate y-axis max for precip bars
  const maxPrecip = Math.max(...precipValues);
  const precipAxisMax = maxPrecip > 0.25 ? undefined : 0.25;

  // Calculate cumulative y-axis max
  const maxCumulative = cumulativeValues[cumulativeValues.length - 1] || 0;
  const cumulativeAxisMax = maxCumulative > 0.5 ? undefined : 0.5;

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    
    title: {
      text: shortenStationName(stationName),
      subtext: 'Last 24 Hours Precipitation',
      left: 'center',
      top: 5,
      itemGap: 4,
      textStyle: {
        fontSize: isMobile ? 15 : 18,
        fontWeight: 700,
        color: darkMode ? '#e2e8f0' : '#1e293b',
      },
      subtextStyle: {
        fontSize: isMobile ? 12 : 14,
        fontWeight: 500,
        color: darkMode ? '#94a3b8' : '#64748b',
      }
    },

    grid: {
      top: 70,
      right: showCumulative ? 50 : 20,
      bottom: 45,
      left: 45,
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
        
        const time = formatTimestamp(params[0].axisValue);
        let html = `<div style="font-weight:600;margin-bottom:6px">${time}</div>`;
        
        params.forEach((p: any) => {
          const color = p.color?.colorStops ? p.color.colorStops[0].color : p.color;
          const value = typeof p.value === 'number' ? p.value.toFixed(3) : p.value;
          html += `
            <div style="display:flex;align-items:center;gap:6px;margin:3px 0">
              <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:2px"></span>
              <span>${p.seriesName}:</span>
              <span style="font-weight:600">${value}"</span>
            </div>
          `;
        });
        
        return html;
      }
    },

    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: {
        lineStyle: {
          color: darkMode ? '#475569' : '#cbd5e1'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        formatter: (value: string) => formatAxisLabel(value),
        rich: {
          date: {
            fontSize: isMobile ? 10 : 12,
            fontWeight: 600,
            color: darkMode ? '#94a3b8' : '#475569',
            padding: [8, 0, 0, 0]
          },
          small: {
            fontSize: isMobile ? 9 : 11,
            color: darkMode ? '#64748b' : '#94a3b8'
          }
        },
        interval: 0
      }
    },

    yAxis: [
      // Left axis - hourly precip bars
      {
        type: 'value',
        name: 'Hourly',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 11,
          color: darkMode ? '#64748b' : '#94a3b8'
        },
        position: 'left',
        min: 0,
        max: precipAxisMax,
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
          formatter: (value: number) => value === 0 ? '0' : `${value.toFixed(2)}"`,
          fontSize: isMobile ? 9 : 11,
          color: darkMode ? '#64748b' : '#94a3b8'
        }
      },
      // Right axis - cumulative (only when enabled)
      ...(showCumulative ? [{
        type: 'value' as const,
        name: 'Cumulative',
        nameLocation: 'middle' as const,
        nameGap: 40,
        nameTextStyle: {
          fontSize: 11,
          color: cumulativeColor
        },
        position: 'right' as const,
        min: 0,
        max: cumulativeAxisMax,
        axisLine: {
          show: true,
          lineStyle: {
            color: cumulativeColor
          }
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          formatter: (value: number) => value === 0 ? '0' : `${value.toFixed(2)}"`,
          fontSize: isMobile ? 9 : 11,
          color: cumulativeColor
        }
      }] : [])
    ],

    series: [
      // Hourly precip bars
      {
        name: 'Precipitation',
        type: 'bar',
        data: precipValues,
        barWidth: '60%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barTop },
            { offset: 1, color: barBottom }
          ]),
          borderRadius: [3, 3, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: darkMode ? 'rgba(120, 220, 255, 1)' : '#2563eb' },
              { offset: 1, color: darkMode ? 'rgba(30, 100, 160, 1)' : 'rgba(0,130,210,0.7)' }
            ])
          }
        },
        yAxisIndex: 0,
        z: 2
      },
      // Cumulative line (when enabled)
      ...(showCumulative ? [{
        name: 'Cumulative',
        type: 'line' as const,
        data: cumulativeValues,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2.5,
          color: cumulativeColor
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: darkMode ? 'rgba(20, 174, 130, 0.3)' : 'rgba(20, 174, 130, 0.25)' },
            { offset: 1, color: darkMode ? 'rgba(20, 174, 130, 0.05)' : 'rgba(20, 174, 130, 0.02)' }
          ])
        },
        markPoint: {
        data: [
            {
            name: 'Total',  // ADD THIS LINE
            coord: [cumulativeValues.length - 1, cumulativeValues[cumulativeValues.length - 1]],
            value: cumulativeValues[cumulativeValues.length - 1],
            label: {
                show: true,
                formatter: (params: any) => `${params.value.toFixed(2)}"`,
                position: 'top' as const,
                offset: [0, -3],
                fontSize: isMobile ? 11 : 13,
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: cumulativeColor,
                padding: [3, 7],
                borderRadius: 3
            },
            symbolSize: 0
            }
        ]
        },
        yAxisIndex: 1,
        z: 1
      }] : [])
    ],

    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="hourly-precip-chart-container">
      {/* Summary Header */}
      <div className={`precip-summary-header ${darkMode ? 'dark' : ''}`}>
        <div className="precip-total">
          <Droplets size={20} className="precip-icon" />
          <span className="precip-total-value">
            {displayTotal.toFixed(2)}"
          </span>
          <span className="precip-total-label">total</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{
        width: '100%',
        height: isMobile ? '320px' : '350px',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderRadius: '12px',
        padding: isMobile ? '8px' : '16px',
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

      {/* Cumulative Toggle - Apple Style */}
      <div className={`precip-toggle-container ${darkMode ? 'dark' : ''}`}>
        <button
          className={`precip-toggle-btn ${showCumulative ? 'active' : ''}`}
          onClick={() => setShowCumulative(!showCumulative)}
        >
          <span className="toggle-label">Show Cumulative</span>
          <div className={`toggle-switch ${showCumulative ? 'on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </button>
      </div>
    </div>
  );
}