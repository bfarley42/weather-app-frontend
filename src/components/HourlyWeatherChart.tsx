// src/components/HourlyWeatherChart.tsx
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './HourlyWeatherChart.css';
import { useEffect } from 'react';

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
  relh_pct: number | null;
  max_gust_mph: number | null;
  feelslike_f: number | null
}

interface HourlyWeatherChartProps {
  data: HourlyWeather[];
  stationName: string;
  darkMode?: boolean;
  startDate: string;
  endDate: string;
}

export default function HourlyWeatherChart({ 
  data, 
  stationName,
  darkMode = false,
  startDate,
  endDate,
}: HourlyWeatherChartProps) {
  const [showWindOrPrecip, setShowWindOrPrecip] = useState<'precip' | 'wind'>('precip');  // Toggle between two
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);  // ADD THIS
  const [showFeelsLike, setShowFeelsLike] = useState(false);  // ADD THIS
  const [showWindGusts, setShowWindGusts] = useState(false);  // ADD THIS
  // const [showRelHumidity, setRelHumidity] = useState(false);  // ADD THIS
  // Detect mobile device - ADD THIS ENTIRE BLOCK
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        No hourly data available for the selected date range
      </div>
    );
  }

  // Prepare data
  const timestamps = data.map(d => new Date(d.ts_local));
  const temps = data.map(d => d.tmpf);
  const precip = data.map(d => d.precip_in || 0);
  const windSpeed = data.map(d => d.avg_wspd_mph || 0);
  const windGusts = data.map(d => d.max_gust_mph || 0);  // ADD THIS
  const feelsLike = data.map(d => d.feelslike_f);  // ADD THIS
  // const relHumdity = data.map(d => d.relh_pct);  // ADD THIS

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${month} ${day}, ${displayHour} ${ampm}`;
  };

  // Format for x-axis (shorter)
// Format for x-axis (only show date at midnight, "12pm" at noon)
  const formatAxisLabel = (date: Date) => {
    const hour = date.getHours();
    
    // Show date at midnight
    if (hour === 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `{date|${month} ${day}}`;  // Use rich text style
    }
    
    // Show "12pm" at noon
    if (hour === 12) {
      return '{small|12pm}';  // Use rich text style
    }
    
    // Hide all other hours
    return '';
  };

    // Helper function to wrap long station names
  const wrapStationName = (name: string, maxLength: number) => {
    if (name.length <= maxLength) return name;
    
    const words = name.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxLength) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  };

  const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  };

  const shortenStationName = (name: string): string => {
    if (!name) return '';

    // Only shorten if the length is > 45
    if (name.length > 45) {
      return name
        .replace(/INTERNATIONAL/g, 'INTL')
        .replace(/AIRPORT/g, 'AP')
        .replace(/CENTER/g, 'CTR');
    }

    // Otherwise return original name
    return name;
  };


const titleSettings = {
  text: shortenStationName(stationName),
  subtext: `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`,
  left: 'center',
  top: 3,
  itemGap: 2,
  textStyle: {
    fontSize: isMobile ? 15 : 20,
    fontWeight: 700,
    color: darkMode ? '#ecf0f1' : '#2c3e50',
    lineHeight: isMobile ? 18 : 22
  },
  subtextStyle: {
    fontSize: isMobile ? 12 : 14,
    fontWeight: 500,
    color: darkMode ? '#95a5a6' : '#7f8c8d',  // Lighter color for dates
    lineHeight: isMobile ? 14 : 16
  }
};

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: titleSettings,
    
    // {
    //   text: wrapStationName(stationName, isMobile ? 30 : 50),  // Just station name
    //   left: 'center',
    //   top: isMobile ? 5 : 10,
    //   textStyle: {
    //     fontSize: isMobile ? 15 : 20,
    //     fontWeight: 700,
    //     color: darkMode ? '#ecf0f1' : '#2c3e50',
    //     lineHeight: isMobile ? 18 : 24
    //   }
    // },
    
    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? 'rgba(30, 38, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: 15,
      textStyle: {
        color: darkMode ? '#e3eef5' : '#333',
        fontSize: isMobile ? 13 : 14  // Responsive
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
          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          let displayValue = value;
          let unit = '';
          
          if (param.seriesName === 'Temperature' || param.seriesName === 'Feels Like') {
            unit = '°F';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
          } else if (param.seriesName === 'Precipitation') {
            unit = '"';
            displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          } else if (param.seriesName === 'Wind Speed' || param.seriesName === 'Wind Gusts') {
            unit = ' mph';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
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
    data: [
      'Temperature',
      ...(showFeelsLike ? ['Feels Like'] : []),
      showWindOrPrecip === 'precip' ? 'Precipitation' : 'Wind Speed',
      ...(showWindOrPrecip === 'wind' && showWindGusts ? ['Wind Gusts'] : [])
    ],
    top: isMobile ? 45 : 45,
    left: 'center',
    itemGap: isMobile ? 12 : 20,
    itemWidth: isMobile ? 15 : 20,
    itemHeight: isMobile ? 8 : 12,
    textStyle: {
      fontSize: isMobile ? 11 : 13,
      color: darkMode ? '#bdc3c7' : '#555'
    }
  },
    
    grid: isMobile ? {
      left: 45,
      right: 45,
      top: 93,
      bottom: 90
    } : {
      left: 60,
      right: 60,
      top: 100,
      bottom: 100
    },
    
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 35,
        bottom: 15,
        borderColor: darkMode ? '#34495e' : '#e0e0e0',
        fillerColor: 'rgba(102, 126, 234, 0.15)',
        handleStyle: {
          color: '#667eea'
        }
      }
    ],
    
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: darkMode ? '#3d4a57' : '#d8d8d8'
        }
      },
        axisTick: {  // ADD THIS ENTIRE BLOCK
        show: false  // Hide all tick marks
      },
      axisLabel: {
        color: darkMode ? '#95a5a6' : '#666',  // Match other charts
        fontSize: isMobile ? 11 : 12,  // Responsive
        rotate: 45,
        interval: 0,  // ADD THIS - show all labels (formatter will hide most)
        formatter: (value: any) => formatAxisLabel(new Date(value)),
        rich: {  // ADD THIS
        date: {
          fontSize: isMobile ? 11 : 12,
          fontWeight: 'bold',
          color: darkMode ? '#95a5a6' : '#666'
        },
        small: {
          fontSize: isMobile ? 9 : 10,  // Smaller font
          color: darkMode ? 'rgba(149, 165, 166, 0.6)' : 'rgba(102, 102, 102, 0.6)'  // Lighter color
        }
  }

      },
      splitLine: {  // ADD THIS ENTIRE BLOCK
        show: true,
        interval: (index: number) => {
          // Show line only at midnight (hour === 0)
          const date = new Date(timestamps[index]);
          return date.getHours() === 0;
        },
        lineStyle: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          width: 1,
          type: 'solid'
        }
      },


      axisPointer: {
        label: {
          formatter: (params: any) => {
            const date = new Date(params.value);
            return formatTimestamp(date);
          }
        }
      },
    },
    
    yAxis: [
    // Temperature axis (left)
    {
      type: 'value',
      name: isMobile ? 'Temp (°F)' : 'Temperature (°F)',
      nameTextStyle: {
        color: darkMode ? '#95a5a6' : '#666',
        fontSize: isMobile ? 12 : 13,
        fontWeight: 600
      },
      position: 'left',
      min: (() => {
        // Base scale on actual temps only, not feels like (prevents outlier blowup)
        // const validTemps = temps.filter((t): t is number => t !== null);
        const validTemps =  temps.filter((t): t is number => t !== null);
        const feelsLikeTemps = feelsLike.filter((t): t is number => t !== null) 
        if (validTemps.length === 0) return 0;
        const minTemp = showFeelsLike ? Math.min(Math.min(...feelsLikeTemps),Math.min(...validTemps)) : Math.min(...validTemps);
        const maxTemp = showFeelsLike ? Math.max(Math.max(...feelsLikeTemps),Math.max(...validTemps)) : Math.max(...validTemps);
        const buffer = (maxTemp - minTemp) * 0.10;
        return Math.floor((minTemp - buffer)/5)*5;
      })(),
      max: (() => {
        // Base scale on actual temps only, not feels like (prevents outlier blowup)
        const validTemps =  temps.filter((t): t is number => t !== null);
        const feelsLikeTemps = feelsLike.filter((t): t is number => t !== null) 
        if (validTemps.length === 0) return 100;
        const minTemp = showFeelsLike ? Math.min(Math.min(...feelsLikeTemps),Math.min(...validTemps)) : Math.min(...validTemps);
        const maxTemp = showFeelsLike ? Math.max(Math.max(...feelsLikeTemps),Math.max(...validTemps)) : Math.max(...validTemps);
        const buffer = (maxTemp - minTemp) * 0.10;
        return Math.ceil((maxTemp + buffer)/5)*5;
      })(),
      axisLine: {
        show: true,
        lineStyle: {
          color: darkMode ? '#34495e' : '#e0e0e0'
        }
      },
      axisLabel: {
        color: darkMode ? '#95a5a6' : '#666',
        fontSize: isMobile ? 11 : 12,
        formatter: '{value}°'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: darkMode ? '#2c3e50' : '#f0f0f0'
        }
      }
    },
      // Precip/Wind axis (right)
      {
        type: 'value',
        name: isMobile 
          ? (showWindOrPrecip === 'wind' ? 'Wind (mph)' : 'Precip') 
          : (showWindOrPrecip === 'wind' ? 'Wind Speed (mph)' : 'Precipitation (in)'),
        min: 0,  // ADD THIS
        max: showWindOrPrecip === 'wind'  // ADD THIS ENTIRE BLOCK
          ? (Math.max(Math.max(...windSpeed), Math.max(...windGusts)) > 40 ? undefined : 40)  // Check both wind speed AND gusts
          : (Math.max(...precip) > 0.2 ? undefined : 0.2),  // Fixed at 0.25" unless exceeds
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600
        },
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: darkMode ? '#34495e' : '#e0e0e0'
          }
        },
        axisLabel: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 11 : 12,
          formatter: showWindOrPrecip === 'wind' ? '{value}' : '{value}"'
        },
        splitLine: {
          show: false
        }
      }
    ],
    
    series: [
  {
    // Dummy series for background day bands
    type: 'line',
    markArea: {
      silent: true,
      data: (() => {
        const areas: any[] = [];
        let currentDay = new Date(timestamps[0]).setHours(0, 0, 0, 0);
        let dayStart = 0;
        let isAlternate = false;
        
        timestamps.forEach((date, index) => {
          const dateAtMidnight = new Date(date).setHours(0, 0, 0, 0);
          
          // When day changes, create a band for previous day
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
              {
                xAxis: index  // Changed from index - 1
              }
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
          {
            xAxis: timestamps.length - 1
          }
        ]);
        
        return areas;
      })()
    }
  },

    // Temperature line
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
      markPoint: showFeelsLike ? undefined : {  // Only show when feels like is OFF
        data: [
          {
            type: 'max',
            name: 'High',
            label: {
              show: true,
              formatter: (params: any) => `${Math.round(params.value)}°`,
              position: 'top',
              // offset: [0, -10],
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
        ]
      },
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
// Feels Like temperature (dotted line)
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
  markPoint: {  // ADD THIS
    data: [
      {
        type: 'max',
        name: 'High',
        label: {
          show: true,
          formatter: (params: any) => `${Math.round(params.value)}°`,
          position: 'top',
          // offset: [0, -10],
          color: darkMode ? '#fff' : '#2c3e50',
          fontSize: isMobile ? 11 : 13,
          fontWeight: 'semibold',
          backgroundColor: darkMode ? 'rgba(255, 160, 122, 0.8)' : 'rgba(255, 140, 105, 0.9)',
          padding: [3,7],
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
          // offset: [0, 10],
              color: darkMode ? '#fff' : '#fff',
              fontSize: isMobile ? 11 : 13,
              fontWeight: 'semibold',
              backgroundColor: darkMode ? 'rgba(0, 190, 174, 0.8)' : 'rgba(11, 116, 202, 0.66)',
          padding: [3, 7],
          borderRadius: 4
        },
        symbolSize: 0
      }
    ]
  },
  emphasis: {
    focus: 'series',
    lineStyle: {
      width: 3
    }
  },
  yAxisIndex: 0,
  z: 2
}] : []),    
// Feels Like warmer area (red gradient where feels like > temp)
...(showFeelsLike ? [{
  name: 'Warmer Feel',
  type: 'custom',
  renderItem: (params: any, api: any) => {
    const index = params.dataIndex;
    const temp = temps[index];
    const feel = feelsLike[index];
    
    if (temp === null || feel === null || feel <= temp) {
      return null;  // Only show where feels like > temp
    }
    
    const tempCoord = api.coord([index, temp]);
    const feelCoord = api.coord([index, feel]);
    const nextCoord = index < temps.length - 1 ? api.coord([index + 1, 0]) : api.coord([index + 1, 0]);
    const width = nextCoord[0] - tempCoord[0];
    
    return {
      type: 'rect',
      shape: {
        x: tempCoord[0],
        y: feelCoord[1],
        width: width,
        height: tempCoord[1] - feelCoord[1]
      },
      style: {
        fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: darkMode ? 'rgba(255, 100, 100, 0.0)' : 'rgba(255, 100, 100, 0.0)' },
          { offset: 1, color: darkMode ? 'rgba(255, 150, 150, 0.0)' : 'rgba(255, 150, 150, 0.0)' }
        ])
      }
    };
  },
  data: Array.from({ length: temps.length }, (_, i) => i),
  yAxisIndex: 0,
  z: 0,
  silent: true,
  tooltip: { show: false }
}] : []),

// Feels Like colder area (blue gradient where feels like < temp)
...(showFeelsLike ? [{
  name: 'Colder Feel',
  type: 'custom',
  renderItem: (params: any, api: any) => {
    const index = params.dataIndex;
    const temp = temps[index];
    const feel = feelsLike[index];
    
    if (temp === null || feel === null || feel >= temp) {
      return null;  // Only show where feels like < temp
    }
    
    const tempCoord = api.coord([index, temp]);
    const feelCoord = api.coord([index, feel]);
    const nextCoord = index < temps.length - 1 ? api.coord([index + 1, 0]) : api.coord([index + 1, 0]);
    const width = nextCoord[0] - tempCoord[0];
    
    return {
      type: 'rect',
      shape: {
        x: tempCoord[0],
        y: tempCoord[1],
        width: width,
        height: feelCoord[1] - tempCoord[1]
      },
      style: {
        fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          // { offset: 0, color: darkMode ? 'rgba(100, 150, 255, 0.4)' : 'rgba(100, 150, 255, 0.3)' },
          { offset: 0, color: darkMode ? 'rgba(100, 150, 255, 0.0)' : 'rgba(2, 76, 173, 0.0)' },
          // { offset: 1, color: darkMode ? 'rgba(150, 200, 255, 0.1)' : 'rgba(150, 200, 255, 0.1)' }
          { offset: 1, color: darkMode ? 'rgba(150, 200, 255, 0.0)' : 'rgba(3, 132, 206, 0.0)' }
        ])
      }
    };
  },
  data: Array.from({ length: temps.length }, (_, i) => i),
  yAxisIndex: 0,
  z: 0,
  silent: true,
  tooltip: { show: false }
}] : []),





    // Precipitation bars (only if not showing wind)
    ...(showWindOrPrecip === 'precip' ? [{
      name: 'Precipitation',
      type: 'bar',
      data: precip,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: darkMode ? 'rgba(90, 200, 255, 0.95)' : 'rgba(74, 177, 245, 0.95)' },
          { offset: 1, color: darkMode ? 'rgba(0, 70, 130, 0.85)' : 'rgba(0, 94, 156, 0.85)' }
        ]),
        borderRadius: [2, 2, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 8,
          shadowColor: darkMode ? 'rgba(90, 200, 255, 0.4)' : 'rgba(74, 177, 245, 0.4)'
        }
      },
      barWidth: '80%',
      yAxisIndex: 1,
      z: 0
    }] : []),

// Wind speed line with gradient area fill
...(showWindOrPrecip === 'wind' ? [{
  name: 'Wind Speed',
  type: 'line',
  data: windSpeed,
  smooth: 0,  // Very smooth
  sampling: 'lttb',  // ADD THIS - downsamples data intelligently for smoothness
  symbol: 'none',
  lineStyle: {
    width: darkMode ? 1.5 : .2,
    color: darkMode ? '#0db0c58c' : '#189eb6ff'
  },
      itemStyle: {
        color: darkMode ? '#0db0c58c': '#189eb6ff', // 👈 match line
        opacity: darkMode ? 0.8: 0.5,
      },
  areaStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: darkMode ? 'rgba(12, 196, 180, 0.2)' : 'rgba(11, 191, 236, 0.99)' },
      { offset: 1, color: darkMode ? '#0db0c548' : 'rgba(22, 143, 190, 0.4)' }
    ])
  },
  emphasis: {
    focus: 'series',
    lineStyle: {
      width: 2
    }
  },
  yAxisIndex: 1,
  z: 1
}] : []),
// // Wind speed line with gradient area fill
// ...(showWindOrPrecip === 'wind' ? [{
//   name: 'Wind Speed',
//   type: 'line',
//   // ... existing wind config
//   z: 1
// }] : []),

// Wind gusts (optional, only when showing wind)
...(showWindOrPrecip === 'wind' && showWindGusts ? [{
  name: 'Wind Gusts',
  type: 'scatter',
  data: windGusts.map((gust, _index) => gust > 0 ? gust : null),  // Filter out zeros
  symbolSize: isMobile ? 8 : 10,
  symbol: 'diamond',
  itemStyle: {
    color: darkMode ? '#ffd700' : '#f39c12',
    borderColor: darkMode ? '#1a1a2e' : '#fff',
    borderWidth: 1.5,
    opacity: 0.8
  },
  markPoint: {  // ADD THIS - label top 3 gusts
    data: (() => {
      // Get top 3 gust values with their indices
      const gustsWithIndices = windGusts
        .map((gust, index) => ({ gust, index }))
        .filter(item => item.gust > 0)  // Filter out zeros
        .sort((a, b) => b.gust - a.gust)
        .slice(0, 3);  // Top 3
      
      return gustsWithIndices.map(item => ({
        coord: [item.index, item.gust],
        value: item.gust,
        label: {
          show: true,
          formatter: (params: any) => `${Math.round(params.value)} mph`,
          position: 'left',
          // offset: [0, -15],
          color: darkMode ? '#ffd700' : '#333',
          fontSize: isMobile ? 9 : 11,
          fontWeight: 'normal',
          backgroundColor: darkMode ? 'rgba(40, 40, 50, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          padding: [2, 6],
          borderRadius: 3,
          borderColor: darkMode ? '#ffd700' : '#f39c12',
          borderWidth: 1
        },
        symbolSize: 0  // Hide the marker, just show label with line
      }));
    })()
  },
  emphasis: {
    focus: 'series',
    itemStyle: {
      shadowBlur: 12,
      shadowColor: darkMode ? 'rgba(255, 215, 0, 0.6)' : 'rgba(243, 156, 18, 0.6)',
      borderWidth: 2,
      scale: true
    },
    scale: 1.3
  },
  yAxisIndex: 1,
  z: 3
}] : [])


    ],
    
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="hourly-chart-container">

          
    <div style={{ 
      width: '100%', 
      height: isMobile ? '540px' : '510px',  // Match other charts
      background: darkMode ? '#1a1a2e' : '#ffffff',
      borderRadius: isMobile ? '6px' : '12px',  // Smaller on mobile
      padding: isMobile ? '5px' : '20px',  // Less padding on mobile
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      position: 'relative'
    }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
      {/* Chart controls - Toggles */}
      <div className="chart-controls">
        <div className="toggle-group">
          {/* Wind/Precip Toggle */}
          <button
            onClick={() => setShowWindOrPrecip(showWindOrPrecip === 'precip' ? 'wind' : 'precip')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: 600,
              color: 'white',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
          >
            {showWindOrPrecip === 'precip' ? '💨 Show Wind' : '🌧️ Show Precip'}
          </button>
          
          {/* Feels Like Checkbox */}
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showFeelsLike}
              onChange={(e) => setShowFeelsLike(e.target.checked)}
            />
            <span>🌡️ Feels Like</span>
          </label>
          
          {/* Wind Gusts Checkbox (only show when wind is active) */}
          {showWindOrPrecip === 'wind' && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showWindGusts}
                onChange={(e) => setShowWindGusts(e.target.checked)}
              />
              <span>💨 Show Gusts</span>
            </label>
          )}
        </div>
      </div>

    </div>
  );
}