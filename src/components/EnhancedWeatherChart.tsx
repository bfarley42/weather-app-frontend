// src/components/EnhancedWeatherChart.tsx
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';
import './EnhancedWeatherChart.css';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
}

interface ClimateNormal {
  mmdd: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
}

interface EnhancedWeatherChartProps {
  data: DailyWeather[];
  stationId: string;
  stationName: string;
}

export default function EnhancedWeatherChart({ 
  data, 
  stationId,
  stationName 
}: EnhancedWeatherChartProps) {
  const [showHighTemp, setShowHighTemp] = useState(true);
  const [showLowTemp, setShowLowTemp] = useState(true);
  const [showNormals, setShowNormals] = useState(true);
  const [normals, setNormals] = useState<ClimateNormal[]>([]);
  const [isLoadingNormals, setIsLoadingNormals] = useState(false);

  useEffect(() => {
    const fetchNormals = async () => {
      setIsLoadingNormals(true);
      try {
        const response = await fetch(`${API_URL}/api/weather/normals?station=${stationId}`);
        if (response.ok) {
          const data = await response.json();
          setNormals(data);
        }
      } catch (error) {
        console.error('Error fetching normals:', error);
      } finally {
        setIsLoadingNormals(false);
      }
    };

    if (stationId) {
      fetchNormals();
    }
  }, [stationId]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        No data available for the selected date range
      </div>
    );
  }

  // Prepare observed data - FIX: Add one day to match display
  const dates = data.map(d => {
    const date = new Date(d.obs_date + 'T12:00:00'); // Noon to avoid timezone issues
    return date;
  });
  
  const maxTemps = data.map(d => d.tmax_f);
  const minTemps = data.map(d => d.tmin_f);
  const precip = data.map(d => d.prcp_in || 0);

  // Match normals to observed dates
  const normalsMap = new Map(normals.map(n => [n.mmdd, n]));
  const normalHighs: (number | null)[] = [];
  const normalLows: (number | null)[] = [];

  dates.forEach(date => {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const normal = normalsMap.get(mmdd);
    normalHighs.push(normal?.tmax_f || null);
    normalLows.push(normal?.tmin_f || null);
  });

  // Format date labels
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const option = {
    backgroundColor: '#ffffff',
    
    title: {
      text: stationName,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 20,
        fontWeight: 700,
        color: '#2c3e50'
      }
    },
    
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      padding: 15,
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        const dateIdx = params[0].dataIndex;
        const date = formatDate(dates[dateIdx]);
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${date}</div>`;
        
        params.forEach((param: any) => {
          if (param.seriesName === 'Temperature Range') return;
          
          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          let displayValue = value;
          let unit = '';
          
          if (param.seriesName.includes('Temp')) {
            unit = '°F';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
          } else if (param.seriesName === 'Precipitation') {
            unit = '"';
            displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          }
          
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="color: #666;">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 12px; color: #333;">${displayValue}${unit}</span>
            </div>
          `;
        });
        
        return html;
      }
    },
    
    legend: {
      data: [
        ...(showHighTemp ? ['High Temp'] : []),
        ...(showLowTemp ? ['Low Temp'] : []),
        'Precipitation',
        ...(showNormals ? ['Normal High', 'Normal Low'] : [])
      ],
      top: 50,
      left: 'center',
      itemGap: 20,
      textStyle: {
        fontSize: 13,
        color: '#555'
      }
    },
    
    grid: {
      left: 60,
      right: 60,
      top: 110,
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
        borderColor: '#e0e0e0',
        fillerColor: 'rgba(102, 126, 234, 0.15)',
        handleStyle: {
          color: '#667eea'
        }
      }
    ],
    
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        color: '#666',
        fontSize: 12,
        rotate: 45,
        formatter: (value: any) => formatDate(new Date(value))
      },
      splitLine: {
        show: false
      }
    },
    
    yAxis: [
      {
        type: 'value',
        name: 'Temperature (°F)',
        nameTextStyle: {
          color: '#666',
          fontSize: 13,
          fontWeight: 600
        },
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          formatter: '{value}°'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      {
        type: 'value',
        name: 'Precipitation (inches)',
        nameTextStyle: {
          color: '#666',
          fontSize: 13,
          fontWeight: 600
        },
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          formatter: '{value}"'
        },
        splitLine: {
          show: false
        }
      }
    ],
    
    series: [
      // Temperature range area (only if both temps are shown)
      ...(showHighTemp && showLowTemp ? [{
        name: 'Temperature Range',
        type: 'line',
        data: maxTemps,
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 0.5, color: 'rgba(255, 180, 180, 0.2)' },
            { offset: 1, color: 'rgba(78, 205, 196, 0.3)' }
          ])
        },
        yAxisIndex: 0,
        z: 1
      }] : []),
      
      // High temperature
      ...(showHighTemp ? [{
        name: 'High Temp',
        type: 'line',
        data: maxTemps,
        smooth: true,
        symbolSize: 8,
        itemStyle: {
          color: '#ff6b6b',
          borderColor: '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#ff6b6b' },
            { offset: 1, color: '#ee5a6f' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(255, 107, 107, 0.5)'
          }
        },
        yAxisIndex: 0,
        z: 2
      }] : []),
      
      // Low temperature
      ...(showLowTemp ? [{
        name: 'Low Temp',
        type: 'line',
        data: minTemps,
        smooth: true,
        symbolSize: 8,
        itemStyle: {
          color: '#4ecdc4',
          borderColor: '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#4ecdc4' },
            { offset: 1, color: '#45b7d1' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(78, 205, 196, 0.5)'
          }
        },
        yAxisIndex: 0,
        z: 2
      }] : []),
      
      // Normal high temp
      ...(showNormals && showHighTemp ? [{
        name: 'Normal High',
        type: 'line',
        data: normalHighs,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          type: 'dashed',
          color: '#ff6b6b',
          opacity: 0.5
        },
        yAxisIndex: 0,
        z: 1
      }] : []),
      
      // Normal low temp
      ...(showNormals && showLowTemp ? [{
        name: 'Normal Low',
        type: 'line',
        data: normalLows,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          type: 'dashed',
          color: '#4ecdc4',
          opacity: 0.5
        },
        yAxisIndex: 0,
        z: 1
      }] : []),
      
      // Precipitation
      {
        name: 'Precipitation',
        type: 'bar',
        data: precip,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(116, 185, 255, 0.9)' },
            { offset: 1, color: 'rgba(116, 185, 255, 0.5)' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '70%',
        yAxisIndex: 1,
        z: 0
      }
    ],
    
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="enhanced-chart-container">
      <div className="chart-controls">
        <div className="toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showHighTemp}
              onChange={(e) => setShowHighTemp(e.target.checked)}
            />
            <span>High Temp</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showLowTemp}
              onChange={(e) => setShowLowTemp(e.target.checked)}
            />
            <span>Low Temp</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showNormals}
              onChange={(e) => setShowNormals(e.target.checked)}
              disabled={isLoadingNormals || normals.length === 0}
            />
            <span>Climate Normals {isLoadingNormals && '(loading...)'}</span>
          </label>
        </div>
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '550px',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
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