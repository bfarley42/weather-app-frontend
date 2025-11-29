// src/components/HourlyWeatherChart.tsx
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './HourlyWeatherChart.css';

interface HourlyWeather {
  ts_local: string;
  tmpf: number | null;
  precip_in: number | null;
  avg_wspd_mph: number | null;
}

interface HourlyWeatherChartProps {
  data: HourlyWeather[];
  stationName: string;
  darkMode?: boolean;
}

export default function HourlyWeatherChart({ 
  data, 
  stationName,
  darkMode = false
}: HourlyWeatherChartProps) {
  const [showWind, setShowWind] = useState(false);

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
  const formatAxisLabel = (date: Date) => {
    const day = date.getDate();
    const hour = date.getHours();
    
    // Show date at midnight, otherwise just hour
    if (hour === 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${month} ${day}`;
    }
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: {
      text: `${stationName} - Hourly`,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 20,
        fontWeight: 700,
        color: darkMode ? '#ecf0f1' : '#2c3e50'
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
        fontSize: 13
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
          
          if (param.seriesName === 'Temperature') {
            unit = '°F';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
          } else if (param.seriesName === 'Precipitation') {
            unit = '"';
            displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          } else if (param.seriesName === 'Wind Speed') {
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
        'Precipitation',
        ...(showWind ? ['Wind Speed'] : [])
      ],
      top: 50,
      left: 'center',
      itemGap: 30,
      textStyle: {
        fontSize: 13,
        color: darkMode ? '#bdc3c7' : '#555'
      }
    },
    
    grid: {
      left: 60,
      right: 60,
      top: 120,
      bottom: 90
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
        bottom: 20,
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
      axisLabel: {
        color: darkMode ? '#cfd8dc' : '#666',
        fontSize: 11,
        rotate: 45,
        formatter: (value: any) => formatAxisLabel(new Date(value))
      },
      axisPointer: {
        label: {
          formatter: (params: any) => {
            const date = new Date(params.value);
            return formatTimestamp(date);
          }
        }
      },
      splitLine: {
        show: false
      }
    },
    
    yAxis: [
      // Temperature axis (left)
      {
        type: 'value',
        name: 'Temperature (°F)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: 13,
          fontWeight: 600
        },
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: darkMode ? '#34495e' : '#e0e0e0'
          }
        },
        axisLabel: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: 12,
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
        name: showWind ? 'Precip (in) / Wind (mph)' : 'Precipitation (inches)',
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: 13,
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
          fontSize: 12,
          formatter: showWind ? '{value}' : '{value}"'
        },
        splitLine: {
          show: false
        }
      }
    ],
    
    series: [
      // Temperature line
      {
        name: 'Temperature',
        type: 'line',
        data: temps,
        smooth: true,
        symbolSize: 4,
        showSymbol: false, // Don't show symbols on every point (too many for hourly)
        itemStyle: {
          color: darkMode ? '#ff8c8c' : '#ff6b6b',
          borderColor: darkMode ? '#1a1a2e' : '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 2.5,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: darkMode ? '#ff8c8c' : '#ff6b6b' },
            { offset: 1, color: darkMode ? '#ff5a5a' : '#ff3e3e' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: darkMode ? 'rgba(255, 150, 150, 0.5)' : 'rgba(255, 107, 107, 0.5)'
          }
        },
        yAxisIndex: 0,
        z: 2
      },
      
      // Precipitation bars
      {
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
      },
      
      // Wind speed line (optional)
      ...(showWind ? [{
        name: 'Wind Speed',
        type: 'line',
        data: windSpeed,
        smooth: true,
        symbolSize: 3,
        showSymbol: false,
        itemStyle: {
          color: darkMode ? '#a8e6cf' : '#26a69a',
          borderColor: darkMode ? '#1a1a2e' : '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 2,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: darkMode ? '#a8e6cf' : '#26a69a' },
            { offset: 1, color: darkMode ? '#7ec699' : '#00897b' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: darkMode ? 'rgba(168, 230, 207, 0.5)' : 'rgba(38, 166, 154, 0.5)'
          }
        },
        yAxisIndex: 1,
        z: 1
      }] : [])
    ],
    
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="hourly-chart-container">
      <div className="hourly-controls">
        <div className="toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showWind}
              onChange={(e) => setShowWind(e.target.checked)}
            />
            <span>💨 Show Wind Speed</span>
          </label>
        </div>
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '550px',
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: darkMode 
          ? '0 2px 8px rgba(0, 0, 0, 0.4)' 
          : '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}