// src/components/SunshineChart.tsx
/**
 * Hourly sunshine bar chart
 * - Bars colored by sunshine factor (yellow = sunny, gray = cloudy)
 * - Nighttime hours shown with dark background
 * - Vertical divider between yesterday and today
 */
import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FaSun, FaRegMoon  } from "react-icons/fa6";



interface HourlyData {
  ts_local: string;
  tmpf: number | null;
  skyc1: string | null;
  wxcodes: string | null;
  precip_in: number | null;
}

interface SunshineChartProps {
  data: HourlyData[];
  darkMode?: boolean;
  sunTimes?: {
    sunrise: string | null;
    sunset: string | null;
  } | null;
  showTodayOnly?: boolean;
}

export default function SunshineChart({
  data,
  darkMode = false,
  sunTimes,
  showTodayOnly = false,
}: SunshineChartProps) {
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
        No sunshine data available
      </div>
    );
  }

  // Parse sunrise/sunset to hours
  const parseTimeToHour = (timeStr: string | null): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hour = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour + minutes / 60;
  };

  const sunriseHour = parseTimeToHour(sunTimes?.sunrise ?? null);
  const sunsetHour = parseTimeToHour(sunTimes?.sunset ?? null);

  // Calculate sunshine factor for each hour
  const skyToSunshineFactor = (skyCode: string | null): number => {
    if (!skyCode) return 0.5;
    const code = skyCode.toUpperCase();
    switch (code) {
      case 'CLR':
      case 'SKC': return 1.0;
      case 'FEW': return 0.90;
      case 'SCT': return 0.55;
      case 'BKN': return 0.25;
      case 'OVC': return 0.05;
      default: return 0.5;
    }
  };

  const wxToAttenuation = (wxCode: string | null): number => {
    if (!wxCode) return 1.0;
    const wx = wxCode.toLowerCase();
    if (wx.includes('ts')) return 0.0;
    if (wx.includes('+ra')) return 0.05;
    if (wx.includes('ra')) return 0.10;
    if (wx.includes('-ra')) return 0.15;
    if (wx.includes('sn')) return 0.05;
    if (wx.includes('fz')) return 0.05;
    if (wx.includes('dz')) return 0.20;
    if (wx.includes('fg')) return 0.15;
    if (wx.includes('br')) return 0.70;
    if (wx.includes('hz')) return 0.75;
    return 1.0;
  };

  const getConditionLabel = (skyCode: string | null, wxCode: string | null): string => {
    if (wxCode) {
      const wx = wxCode.toLowerCase();
      if (wx.includes('ts')) return 'Thunderstorm';
      if (wx.includes('+ra')) return 'Heavy Rain';
      if (wx.includes('-ra')) return 'Light Rain';
      if (wx.includes('ra')) return 'Rain';
      if (wx.includes('sn')) return 'Snow';
      if (wx.includes('fg')) return 'Fog';
      if (wx.includes('br')) return 'Mist';
      if (wx.includes('hz')) return 'Haze';
    }
    if (skyCode) {
      const code = skyCode.toUpperCase();
      switch (code) {
        case 'CLR':
        case 'SKC': return 'Clear';
        case 'FEW': return 'Mostly Clear';
        case 'SCT': return 'Partly Cloudy';
        case 'BKN': return 'Mostly Cloudy';
        case 'OVC': return 'Overcast';
      }
    }
    return 'Unknown';
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
    const hourNum = hourDate.getHours();
    const isDaylight = hourNum >= Math.floor(sunriseHour) && hourNum < Math.ceil(sunsetHour);
    
    const sunshineFactor = skyToSunshineFactor(hour.skyc1);
    const attenuation = wxToAttenuation(hour.wxcodes);
    const sunshineValue = isDaylight ? sunshineFactor * attenuation * 100 : 0;

    return {
      hour: hourDate,
      hourNum,
      value: sunshineValue,
      isDaylight,
      condition: getConditionLabel(hour.skyc1, hour.wxcodes),
      skyCode: hour.skyc1,
      wxCode: hour.wxcodes,
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
  const xLabels = chartData.map(d => {
    const label = formatHourLabel(d.hour);
    return label;
  });

  // Bar colors based on sunshine value and daylight
  const barColors = chartData.map(d => {
    if (!d.isDaylight) {
      return darkMode ? '#1e293b' : '#cbd5e1'; // Night - gray
    }
    // Gradient from gray (0%) to gold (100%)
    const intensity = d.value / 100;
    if (intensity >= 0.8) return '#f59e0b'; // Bright sun
    if (intensity >= 0.5) return '#fbbf24'; // Moderate sun
    if (intensity >= 0.25) return '#fcd34d'; // Light sun
    return darkMode ? '#475569' : '#94a3b8'; // Cloudy
  });

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
        
        if (!d.isDaylight) {
          return `
            <div style="font-weight:600;margin-bottom:4px">${dayLabel}, ${timeStr}</div>
            <div style="color:${darkMode ? '#94a3b8' : '#64748b'}">🌙 Nighttime</div>
          `;
        }
        
        return `
          <div style="font-weight:600;margin-bottom:4px">${dayLabel}, ${timeStr}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span>☀️</span>
            <span style="font-weight:600">${Math.round(d.value)}% sunshine</span>
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
        name: 'Sunshine',
        type: 'bar',
        data: chartData.map((d, i) => ({
          value: d.isDaylight ? d.value : 5, // Small bar for night to show it exists
          itemStyle: {
            color: barColors[i],
            borderRadius: [3, 3, 0, 0],
            opacity: d.isDaylight ? 1 : 0.4
          }
        })),
        barWidth: '70%',
        emphasis: {
          itemStyle: {
            opacity: 0.8
          }
        },
        // Mark line for midnight divider (only if showing 24h and midnight exists)
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

    // Visual map for background shading (night hours)
    visualMap: {
      show: false,
      dimension: 0,
      pieces: chartData.map((_d, i) => ({
        value: i,
        color: barColors[i]
      }))
    },

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