// src/components/ProfessionalWeatherChart.tsx
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
}

interface ProfessionalWeatherChartProps {
  data: DailyWeather[];
  stationName: string;
}

export default function ProfessionalWeatherChart({ 
  data, 
  stationName 
}: ProfessionalWeatherChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        No data available for the selected date range
      </div>
    );
  }

  // Prepare data
  const dates = data.map(d => d.obs_date);
  const maxTemps = data.map(d => d.tmax_f);
  const minTemps = data.map(d => d.tmin_f);
  const precip = data.map(d => d.prcp_in || 0);

  // Format date labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
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
        },
        lineStyle: {
          color: '#999',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        const date = formatDate(params[0].axisValue);
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${date}</div>`;
        
        params.forEach((param: any) => {
          if (param.seriesName === 'Temperature Range') {
            return; // Skip the area series in tooltip
          }
          
          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          let displayValue = value;
          let unit = '';
          
          if (param.seriesName.includes('High') || param.seriesName.includes('Low')) {
            unit = '°F';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
          } else if (param.seriesName === 'Precipitation') {
            unit = '"';
            displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          }
          
          const color = param.seriesName.includes('High') ? '#ff6b6b' : 
                       param.seriesName.includes('Low') ? '#4ecdc4' : '#74b9ff';
          
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 8px;"></span>
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
      data: ['High Temp', 'Low Temp', 'Precipitation'],
      top: 50,
      left: 'center',
      itemGap: 30,
      textStyle: {
        fontSize: 13,
        color: '#555'
      },
      icon: 'circle'
    },
    
    grid: {
      left: 60,
      right: 60,
      top: 110,
      bottom: 90,
      containLabel: false
    },
    
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: true
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
          color: '#667eea',
          borderColor: '#667eea'
        },
        moveHandleStyle: {
          color: '#667eea'
        },
        textStyle: {
          color: '#666'
        },
        dataBackground: {
          areaStyle: {
            color: 'rgba(102, 126, 234, 0.1)'
          },
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.3)'
          }
        },
        selectedDataBackground: {
          areaStyle: {
            color: 'rgba(102, 126, 234, 0.2)'
          },
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.5)'
          }
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
        formatter: formatDate
      },
      axisTick: {
        lineStyle: {
          color: '#e0e0e0'
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
        nameTextStyle: {
          color: '#666',
          fontSize: 13,
          fontWeight: 600,
          padding: [0, 0, 0, 0]
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
            color: '#f0f0f0',
            type: 'solid'
          }
        }
      },
      // Precipitation axis (right)
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
      // Area fill between high and low temps (creates the "temperature band")
      {
        name: 'Temperature Range',
        type: 'line',
        data: maxTemps,
        lineStyle: {
          opacity: 0
        },
        stack: 'confidence-band',
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(255, 107, 107, 0.3)'
            },
            {
              offset: 0.5,
              color: 'rgba(255, 180, 180, 0.2)'
            },
            {
              offset: 1,
              color: 'rgba(78, 205, 196, 0.3)'
            }
          ])
        },
        yAxisIndex: 0,
        z: 1
      },
      
      // High temperature line
      {
        name: 'High Temp',
        type: 'line',
        data: maxTemps,
        smooth: true,
        smoothMonotone: 'x',
        symbolSize: 8,
        symbol: 'circle',
        itemStyle: {
          color: '#ff6b6b',
          borderColor: '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            {
              offset: 0,
              color: '#ff6b6b'
            },
            {
              offset: 1,
              color: '#ee5a6f'
            }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: '#ff6b6b',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(255, 107, 107, 0.5)'
          }
        },
        yAxisIndex: 0,
        z: 2
      },
      
      // Low temperature line
      {
        name: 'Low Temp',
        type: 'line',
        data: minTemps,
        smooth: true,
        smoothMonotone: 'x',
        symbolSize: 8,
        symbol: 'circle',
        itemStyle: {
          color: '#4ecdc4',
          borderColor: '#fff',
          borderWidth: 2
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            {
              offset: 0,
              color: '#4ecdc4'
            },
            {
              offset: 1,
              color: '#45b7d1'
            }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: '#4ecdc4',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(78, 205, 196, 0.5)'
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
            {
              offset: 0,
              color: 'rgba(116, 185, 255, 0.9)'
            },
            {
              offset: 1,
              color: 'rgba(116, 185, 255, 0.5)'
            }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(116, 185, 255, 1)'
              },
              {
                offset: 1,
                color: 'rgba(116, 185, 255, 0.7)'
              }
            ]),
            shadowBlur: 10,
            shadowColor: 'rgba(116, 185, 255, 0.5)'
          }
        },
        barWidth: '70%',
        yAxisIndex: 1,
        z: 0
      }
    ],
    
    // Animation
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
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
  );
}