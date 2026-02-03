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
import { API_URL } from '../config';
import { WiThermometer } from 'react-icons/wi';
import { LuTrendingUp, LuTrendingDown } from 'react-icons/lu';

interface NormalData {
  mmdd: string;
  tmax_f: number | null;
  tmin_f: number | null;
}

// Colors matching EnhancedWeatherChart
const normalColors = {
  high: {
    light: '#d30000ff',
    dark: '#d30000ff',
  },
  low: {
    light: '#04addbc9',
    dark: '#04addbc9',
  }
};

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
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: string) => void;
  initialRange?: string;
}

export default function HourlyChartSimple({
  data,
  stationId,
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
  const [showFeelsLike, setShowFeelsLike] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showAvgLine, setShowAvgLine] = useState(false);
  const [normals, setNormals] = useState<NormalData[]>([]);

  // Sync activeRange with initialRange prop when it changes
  useEffect(() => {
    setActiveRange(initialRange);
  }, [initialRange]);

  // Fetch normals data
  useEffect(() => {
    if (!stationId) return;

    const fetchNormals = async () => {
      try {
        const response = await fetch(`${API_URL}/api/weather/normals?station=${stationId}`);
        if (response.ok) {
          const data = await response.json();
          setNormals(data);
        }
      } catch (error) {
        console.error('Error fetching normals:', error);
      }
    };

    fetchNormals();
  }, [stationId]);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mark component as unmounting and dispose chart to prevent echarts errors
  useEffect(() => {
    isUnmounting.current = false;
    return () => {
      isUnmounting.current = true;
      // Dispose the chart instance to prevent "disconnect" errors
      if (chartRef.current) {
        const echartsInstance = chartRef.current.getEchartsInstance();
        if (echartsInstance && !echartsInstance.isDisposed()) {
          echartsInstance.dispose();
        }
      }
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
  const feelsLike = data.map(d => d.feelslike_f);

  // Map normals to hourly timestamps (same value persists for entire day)
  const normalsMap = new Map(normals.map(n => [n.mmdd, n]));
  const normalHighs: (number | null)[] = timestamps.map(ts => {
    const date = new Date(ts);
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return normalsMap.get(mmdd)?.tmax_f ?? null;
  });
  const normalLows: (number | null)[] = timestamps.map(ts => {
    const date = new Date(ts);
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return normalsMap.get(mmdd)?.tmin_f ?? null;
  });

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
    const day = date.getDate();

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'pm' : 'am';
      const displayHour = h % 12 || 12;
      return `${displayHour}${ampm}`;
    };

    // 7D: show every other day at midnight only
    if (activeRange === '7D') {
      if (hour === 0 && day % 2 === 1) {  // Odd days only
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        return `{date|${month} ${day}}`;
      }
      return '';
    }

    // Show date at midnight for other ranges
    if (hour === 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `{date|${month} ${day}}`;
    }

    // 3D: only 12pm (every 12 hours)
    if (activeRange === '3D') {
      return hour === 12 ? `{small|${formatHour(hour)}}` : '';
    }

    // 1D: every 6 hours (6am, 12pm, 6pm)
    if (activeRange === '1D') {
      return [6, 12, 18].includes(hour) ? `{small|${formatHour(hour)}}` : '';
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
  const validFeelsLike = feelsLike.filter((t): t is number => t !== null);
  const validNormalHighs = normalHighs.filter((t): t is number => t !== null);
  const validNormalLows = normalLows.filter((t): t is number => t !== null);
  let allTemps = showFeelsLike ? [...validTemps, ...validFeelsLike] : [...validTemps];
  if (showNormals) {
    allTemps = [...allTemps, ...validNormalHighs, ...validNormalLows];
  }
  const tempMin = allTemps.length > 0 ? Math.floor(Math.min(...allTemps) / 5) * 5 - 5 : 0;
  const tempMax = allTemps.length > 0 ? Math.ceil(Math.max(...allTemps) / 5) * 5 + 5 : 100; 

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

  // Calculate period stats for summary cards
  const periodStats = (() => {
    const validTempsForStats = temps.filter((t): t is number => t !== null);
    const avgTemp = validTempsForStats.length > 0
      ? validTempsForStats.reduce((a, b) => a + b, 0) / validTempsForStats.length
      : null;
    const minTemp = validTempsForStats.length > 0 ? Math.min(...validTempsForStats) : null;
    const maxTemp = validTempsForStats.length > 0 ? Math.max(...validTempsForStats) : null;

    // Get days count from activeRange
    const days = activeRange === '1D' ? 1 : activeRange === '3D' ? 3 : 7;

    // Calculate normal averages for the period (average of normal highs and lows)
    const validNormalHighsForStats = normalHighs.filter((t): t is number => t !== null);
    const validNormalLowsForStats = normalLows.filter((t): t is number => t !== null);

    // Get unique daily normals (since hourly data repeats same normal for each hour)
    const uniqueNormalHighs: number[] = [];
    const uniqueNormalLows: number[] = [];
    const seenDays = new Set<string>();

    timestamps.forEach((ts, i) => {
      const date = new Date(ts);
      const dayKey = `${date.getMonth()}-${date.getDate()}`;
      if (!seenDays.has(dayKey)) {
        seenDays.add(dayKey);
        if (normalHighs[i] !== null) uniqueNormalHighs.push(normalHighs[i] as number);
        if (normalLows[i] !== null) uniqueNormalLows.push(normalLows[i] as number);
      }
    });

    const avgNormalHigh = uniqueNormalHighs.length > 0
      ? uniqueNormalHighs.reduce((a, b) => a + b, 0) / uniqueNormalHighs.length
      : null;
    const avgNormalLow = uniqueNormalLows.length > 0
      ? uniqueNormalLows.reduce((a, b) => a + b, 0) / uniqueNormalLows.length
      : null;

    const normalAvg = avgNormalHigh !== null && avgNormalLow !== null
      ? (avgNormalHigh + avgNormalLow) / 2
      : null;

    const deviation = avgTemp !== null && normalAvg !== null
      ? Math.round(avgTemp - normalAvg)
      : null;

    return { avgTemp, minTemp, maxTemp, days, avgNormalHigh, avgNormalLow, normalAvg, deviation };
  })();

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
          // Skip the banded background series (no name)
          if (!param.seriesName) return;

          const displayValue = Math.round(value).toString();
          const unit = '°F';

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
      data: [
        'Temperature',
        ...(showFeelsLike ? ['Feels Like'] : []),
        ...(showNormals ? ['Normal High', 'Normal Low'] : []),
        ...(showAvgLine ? ['Average'] : [])
      ],
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
      left: isMobile ? 55 : 70,  // Room for left-side badges
      right: isMobile ? 55 : 65,  // Room for "last temp" label
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
        show: true,
        alignWithLabel: true,
        lineStyle: { color: darkMode ? '#34495e' : '#bdc3c7' },
        // Only show ticks where labels are shown
        interval: (index: number) => {
          const date = new Date(timestamps[index]);
          const hour = date.getHours();
          const day = date.getDate();

          // 7D: only odd days at midnight
          if (activeRange === '7D') {
            return hour === 0 && day % 2 === 1;
          }
          // Midnight (date labels) always get a tick
          if (hour === 0) return true;
          // 3D: 12pm only
          if (activeRange === '3D') {
            return hour === 12;
          }
          // 1D: 6am, 12pm, 6pm
          if (activeRange === '1D') {
            return [6, 12, 18].includes(hour);
          }
          return false;
        }
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
      },
      axisPointer: {
        label: {
          formatter: (params: any) => {
            const date = new Date(params.value);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            const hour = date.getHours();
            const ampm = hour >= 12 ? 'pm' : 'am';
            const displayHour = hour % 12 || 12;
            return `${month}/${day}/${year} ${displayHour}:00${ampm}`;
          }
        }
      }
    },
    
    yAxis: {
      // Temperature axis - dark gray theme
      type: 'value',
      name: '°F',
      nameLocation: 'end',
      nameTextStyle: {
        fontSize: 11,
        color: darkMode ? '#95a5a6' : '#666',
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
        lineStyle: { color: darkMode ? '#34495e' : '#bdc3c7' }
      },
      axisLabel: {
        formatter: '{value}°',
        fontSize: isMobile ? 10 : 11,
        color: darkMode ? '#95a5a6' : '#666'
      }
    },
    
    series: [
      // Banded background for alternating days
      {
        type: 'line',
        markArea: {
          silent: true,
          data: (() => {
            const areas: any[] = [];
            let currentDay = new Date(timestamps[0]).setHours(0, 0, 0, 0);
            let dayStart = 0;
            let isAlternate = false;

            timestamps.forEach((dateStr, index) => {
              const dateAtMidnight = new Date(dateStr).setHours(0, 0, 0, 0);

              if (dateAtMidnight !== currentDay) {
                areas.push([
                  {
                    xAxis: dayStart,
                    itemStyle: {
                      color: isAlternate
                        ? (darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)')
                        : 'transparent'
                    }
                  },
                  { xAxis: index }
                ]);

                dayStart = index;
                currentDay = dateAtMidnight;
                isAlternate = !isAlternate;
              }
            });

            // Add final day
            areas.push([
              {
                xAxis: dayStart,
                itemStyle: {
                  color: isAlternate
                    ? (darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)')
                    : 'transparent'
                }
              },
              { xAxis: timestamps.length - 1 }
            ]);

            return areas;
          })()
        }
      },

      // Temperature line with gradient
    {
      name: 'Temperature',
      type: 'line',
      data: temps,
      smooth: true,
      connectNulls: true,  // Connect across missing data gaps
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
      z: showFeelsLike ? 1 : 2  // Lower z-index when feels like active
    },
...(showFeelsLike ? [{
  name: 'Feels Like',
  type: 'line',
  data: feelsLike,
  smooth: true,
  connectNulls: true,
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
  z: 2
}] : []),

      // Normal High temperature (dotted line)
      ...(showNormals ? [{
        name: 'Normal High',
        type: 'line',
        data: normalHighs,
        smooth: false,
        connectNulls: true,
        symbol: 'none',
        lineStyle: {
          width: isMobile ? 2 : 2.5,
          type: 'dotted',
          opacity: 0.8,
          color: darkMode ? normalColors.high.dark : normalColors.high.light
        },
        itemStyle: {
          color: darkMode ? normalColors.high.dark : normalColors.high.light,
          opacity: 0.5,
        },
        markPoint: (() => {
          // Find first valid normal high
          const firstIdx = normalHighs.findIndex(v => v !== null);
          if (firstIdx === -1) return undefined;
          return {
            data: [{
              coord: [firstIdx, normalHighs[firstIdx]],
              label: {
                show: true,
                formatter: `${Math.round(normalHighs[firstIdx] as number)}°`,
                position: 'left',
                color: '#fff',
                fontSize: isMobile ? 10 : 11,
                fontWeight: 'bold',
                backgroundColor: darkMode ? 'rgba(211, 0, 0, 0.8)' : 'rgba(211, 0, 0, 0.7)',
                padding: [2, 5],
                borderRadius: 4
              },
              symbolSize: 0
            }]
          };
        })(),
        z: 0
      }] : []),

      // Normal Low temperature (dotted line)
      ...(showNormals ? [{
        name: 'Normal Low',
        type: 'line',
        data: normalLows,
        smooth: false,
        connectNulls: true,
        symbol: 'none',
        lineStyle: {
          width: isMobile ? 2 : 2.5,
          type: 'dotted',
          opacity: 0.8,
          color: darkMode ? normalColors.low.dark : normalColors.low.light
        },
        itemStyle: {
          color: darkMode ? normalColors.low.dark : normalColors.low.light,
          opacity: 0.5,
        },
        markPoint: (() => {
          // Find first valid normal low
          const firstIdx = normalLows.findIndex(v => v !== null);
          if (firstIdx === -1) return undefined;
          return {
            data: [{
              coord: [firstIdx, normalLows[firstIdx]],
              label: {
                show: true,
                formatter: `${Math.round(normalLows[firstIdx] as number)}°`,
                position: 'left',
                color: '#fff',
                fontSize: isMobile ? 10 : 11,
                fontWeight: 'bold',
                backgroundColor: darkMode ? 'rgba(4, 173, 219, 0.8)' : 'rgba(4, 173, 219, 0.7)',
                padding: [2, 5],
                borderRadius: 4
              },
              symbolSize: 0
            }]
          };
        })(),
        z: 0
      }] : []),

      // Average temperature line (gray dotted horizontal line)
      ...(showAvgLine && periodStats.avgTemp !== null ? [{
        name: 'Average',
        type: 'line',
        data: timestamps.map(() => periodStats.avgTemp),
        symbol: 'none',
        lineStyle: {
          width: 2,
          type: 'dotted',
          opacity: 0.7,
          color: darkMode ? '#94a3b8' : '#64748b'
        },
        itemStyle: {
          color: darkMode ? '#94a3b8' : '#64748b',
          opacity: 0.5,
        },
        markPoint: {
          data: [{
            coord: [0, periodStats.avgTemp],
            label: {
              show: true,
              formatter: `${Math.round(periodStats.avgTemp)}°`,
              position: 'left',
              color: '#fff',
              fontSize: isMobile ? 10 : 11,
              fontWeight: 'bold',
              backgroundColor: darkMode ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.7)',
              padding: [2, 5],
              borderRadius: 4
            },
            symbolSize: 0
          }]
        },
        z: 0
      }] : [])
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
      {/* Toggle controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: isMobile ? 16 : 24,
          margin: isMobile ? '6px 0 10px' : '8px 0 12px',
          userSelect: 'none'
        }}
      >
        {/* Feels Like toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          notMerge={true}
          lazyUpdate={true}
        />
      </div>

      {/* Half-width summary cards */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '12px',
        width: '100%'
      }}>
        {/* Card 1: Average Temp - clickable to toggle avg line */}
        <div
          onClick={() => setShowAvgLine(v => !v)}
          style={{
            flex: 1,
            background: darkMode ? '#1e293b' : '#ffffff',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: showAvgLine
              ? (darkMode ? '0 0 0 2px #94a3b8, 0 2px 8px rgba(0,0,0,0.3)' : '0 0 0 2px #64748b, 0 2px 8px rgba(0,0,0,0.08)')
              : (darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
            cursor: 'pointer',
            transition: 'box-shadow 0.2s ease'
          }}
        >
          {/* Title row with icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '4px'
          }}>
            <WiThermometer style={{
              fontSize: '18px',
              color: darkMode ? '#94a3b8' : '#64748b'
            }} />
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              AVERAGE TEMP
            </span>
          </div>

          {/* Main value */}
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 350,
            lineHeight: 1.1,
            letterSpacing: '-1px',
            color: darkMode ? '#e2e8f0' : '#1e293b'
          }}>
            {periodStats.avgTemp !== null ? `${Math.round(periodStats.avgTemp)}°` : '--'}
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: darkMode ? '#334155' : '#e2e8f0',
            margin: '10px 0'
          }} />

          {/* Min/Max section */}
          <div style={{
            fontSize: '0.75rem',
            color: darkMode ? '#64748b' : '#94a3b8',
            marginBottom: '4px',
            textAlign: 'center'
          }}>
            {periodStats.days} Day Min/Max
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: darkMode ? '#f87171' : '#dc2626'
            }}>
              H:{periodStats.maxTemp !== null ? `${Math.round(periodStats.maxTemp)}°` : '--'}
            </span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: darkMode ? '#60a5fa' : '#2563eb'
            }}>
              L:{periodStats.minTemp !== null ? `${Math.round(periodStats.minTemp)}°` : '--'}
            </span>
          </div>
        </div>

        {/* Card 2: Averages (vs Normal) - clickable to toggle normals */}
        <div
          onClick={() => setShowNormals(v => !v)}
          style={{
            flex: 1,
            background: darkMode ? '#1e293b' : '#ffffff',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: showNormals
              ? (darkMode ? '0 0 0 2px #60a5fa, 0 2px 8px rgba(0,0,0,0.3)' : '0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.08)')
              : (darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
            cursor: 'pointer',
            transition: 'box-shadow 0.2s ease'
          }}
        >
          {(() => {
            const isWarmer = periodStats.deviation !== null && periodStats.deviation > 0;
            const isColder = periodStats.deviation !== null && periodStats.deviation < 0;

            // Format date range for display
            const periodLabel = periodStats.days === 1
              ? '24-Hour'
              : `${periodStats.days}-Day`;

            return (
              <>
                {/* Title row with icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '2px'
                }}>
                  {isWarmer ? (
                    <LuTrendingUp style={{
                      fontSize: '14px',
                      color: darkMode ? '#f97316' : '#9c2626'
                    }} />
                  ) : isColder ? (
                    <LuTrendingDown style={{
                      fontSize: '14px',
                      color: '#3b82f6'
                    }} />
                  ) : (
                    <LuTrendingUp style={{
                      fontSize: '14px',
                      color: '#22c55e'
                    }} />
                  )}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: darkMode ? '#94a3b8' : '#64748b'
                  }}>
                    AVERAGES
                  </span>
                </div>

                {/* Deviation value */}
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 350,
                  lineHeight: 1.1,
                  letterSpacing: '-1px',
                  color: isWarmer
                    ? (darkMode ? '#f97316' : '#9c2626')
                    : isColder
                      ? (darkMode ? '#3b82f6' : '#167cc0')
                      : (darkMode ? '#22c55e' : '#409c88')
                }}>
                  {periodStats.deviation !== null
                    ? `${periodStats.deviation > 0 ? '+' : ''}${periodStats.deviation}°`
                    : '--'}
                </div>

                {/* above/below average label */}
                <div style={{
                  fontSize: '0.8rem',
                  color: darkMode ? '#94a3b8' : '#64748b'
                }}>
                  {periodStats.deviation === null ? 'average' :
                    periodStats.deviation > 0 ? 'above average' :
                      periodStats.deviation < 0 ? 'below average' :
                        'on average'}
                </div>

                {/* Divider */}
                <div style={{
                  height: '1px',
                  background: darkMode ? '#334155' : '#e2e8f0',
                  margin: '10px 0'
                }} />

                {/* Period + Normals label */}
                <div style={{
                  fontSize: '0.75rem',
                  color: darkMode ? '#64748b' : '#94a3b8',
                  marginBottom: '4px',
                  textAlign: 'center'
                }}>
                  {periodLabel} Normals
                </div>

                {/* Normal H and L temps */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: darkMode ? '#f87171' : '#dc2626'
                  }}>
                    H:{periodStats.avgNormalHigh !== null ? `${Math.round(periodStats.avgNormalHigh)}°` : '--'}
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: darkMode ? '#60a5fa' : '#2563eb'
                  }}>
                    L:{periodStats.avgNormalLow !== null ? `${Math.round(periodStats.avgNormalLow)}°` : '--'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}