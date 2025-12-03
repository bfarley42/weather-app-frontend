// src/components/PrecipitationChart.tsx
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';
import './PrecipitationChart.css';

interface DailyWeather {
  obs_date: string;
  prcp_in: number | null;
  snow_in: number | null;
}

interface ClimateNormal {
  mmdd: string;
  prcp_in: number | null;
  snow_in: number | null;
}

interface PrecipitationChartProps {
  data: DailyWeather[];
  stationId: string;
  stationName: string;
  darkMode?: boolean;
}

export default function PrecipitationChart({ 
  data, 
  stationId,
  stationName,
  darkMode = false
}: PrecipitationChartProps) {
  const [showSnow, setShowSnow] = useState(false); // false = precip, true = snow
  const [showNormalsCumulative, setShowNormalsCumulative] = useState(true);
  const [normals, setNormals] = useState<ClimateNormal[]>([]);
  const [isLoadingNormals, setIsLoadingNormals] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768); 

// Detect mobile device
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

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

  // Prepare dates
  const dates = data.map(d => {
    const date = new Date(d.obs_date + 'T12:00:00');
    return date;
  });

  // Get daily values
  const dailyValues = data.map(d => showSnow ? (d.snow_in || 0) : (d.prcp_in || 0));

  // Calculate cumulative observed
  const cumulativeObserved: number[] = [];
  let cumSum = 0;
  dailyValues.forEach(val => {
    cumSum += val;
    cumulativeObserved.push(cumSum);
  });

  // Match normals to dates and calculate cumulative normals
  const normalsMap = new Map(normals.map(n => [n.mmdd, n]));
  const cumulativeNormals: number[] = [];
  let cumNormalSum = 0;
  
  dates.forEach(date => {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const normal = normalsMap.get(mmdd);
    const normalValue = showSnow ? (normal?.snow_in || 0) : (normal?.prcp_in || 0);
    cumNormalSum += normalValue;
    cumulativeNormals.push(cumNormalSum);
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const dataType = showSnow ? 'Snow' : 'Precip';
const barTop = showSnow
  ? (darkMode ? 'rgba(175, 215, 255, 0.98)' : 'rgba(205, 235, 255, 0.98)')
  : (darkMode ? 'rgba(90, 200, 255, 0.95)' : 'rgba(74, 177, 245, 0.95)');

const barBottom = showSnow
  ? (darkMode ? 'rgba(70, 130, 190, 0.92)' : 'rgba(80, 155, 225, 0.92)')
  : (darkMode ? 'rgba(0, 70, 130, 0.90)' : 'rgba(0, 94, 156, 0.90)');
    // : (darkMode ? '#4a90e2' : '#000000');  // Blue for precip
  
  const lineColor = showSnow
    ? (darkMode ? '#95a5a6' : '#636e72')  // Dark gray for snow line
    // : (darkMode ? '#2980b9' : '#0984e3');  // Darker blue for precip line
    : (darkMode ? '#2980b9' : '#0984e3');  // Darker blue for precip line

 const snowLineColor = darkMode
  ? 'rgba(140, 205, 255, 1.0)'
  : 'rgba(0, 145, 215, 1.0)';
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

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: {
      text: wrapStationName(stationName, isMobile ? 30 : 50),  // Just station name, wrapped
      left: 'center',
      top: isMobile ? 5 : 10,
      textStyle: {
        fontSize: isMobile ? 15 : 20,
        fontWeight: 700,
        color: darkMode ? '#ecf0f1' : '#2c3e50',
        lineHeight: isMobile ? 18 : 24
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? 'rgba(44, 44, 62, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: 15,
      textStyle: {
        color: darkMode ? '#ecf0f1' : '#333',
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
        const date = formatDate(dates[dateIdx]);
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${date}</div>`;
        
        params.forEach((param: any) => {
          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          const displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="color: ${darkMode ? '#bdc3c7' : '#666'};">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 12px; color: ${darkMode ? '#ecf0f1' : '#333'};">${displayValue}"</span>
            </div>
          `;
        });
        
        return html;
      }
    },
    
    legend: {
    data: [
      `Daily ${dataType}`,
      `Cumulative ${dataType}`,
      ...(showNormalsCumulative ? [`Normal Cumulative`] : [])
    ],
    top: isMobile ? 45 : 45,  // Closer to top like EnhancedWeatherChart
    left: 'center',
    itemGap: isMobile ? 12 : 20,  // Responsive spacing
    itemWidth: isMobile ? 15 : 20,  // Add item width
    itemHeight: isMobile ? 8 : 12,  // Add item height
    textStyle: {
      fontSize: isMobile ? 11 : 13,  // Responsive font size
      color: darkMode ? '#bdc3c7' : '#555'
    }
  },
    
    grid: isMobile ? {
      left: 45,
      right: 45,
      top: 110,  // Reduced from 100
      bottom: 90  // Increased from 80 to make room for slider
    } : {
      left: 60,
      right: 60,
      top: 100,  // Reduced from 110
      bottom: 100  // Increased from 90 to make room for slider
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
        bottom: 10,
        borderColor: darkMode ? '#34495e' : '#e0e0e0',
        fillerColor: showSnow 
          ? (darkMode ? 'rgba(224, 231, 234, 0.2)' : 'rgba(223, 230, 233, 0.3)')
          : 'rgba(102, 126, 234, 0.15)',
        handleStyle: {
          color: showSnow ? (darkMode ? '#95a5a6' : '#636e72') : '#667eea'
        }
      }
    ],
    
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,  // true for bar charts
      axisLine: {
        lineStyle: {
          color: darkMode ? '#34495e' : '#e0e0e0'
        }
      },
      axisLabel: {
      color: darkMode ? '#95a5a6' : '#666',
      fontSize: isMobile ? 11 : 12,  // Match Enhanced
      rotate: 45,
        formatter: (value: any) => formatDate(new Date(value))
      },
      axisPointer: {
        label: {
          formatter: (params: any) => {
            const date = new Date(params.value);
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          }
        }
      },
      splitLine: {
        show: false
      }
    },
    
    yAxis: [
      // Daily amount axis (left)
      {
        type: 'value',
        name: isMobile ? (showSnow ? 'Snow' : 'Precip') : (showSnow ? 'Snowfall (in)' : 'Precipitation (in)'),
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,
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
          fontSize: isMobile ? 11 : 12,
          formatter: '{value}"'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: darkMode ? '#2c3e50' : '#f0f0f0'
          }
        }
      },
      // Cumulative axis (right)
        {
        type: 'value',
        name: isMobile ? 'Cumulative' : 'Cumulative (in)',
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
          fontSize: 12,
          formatter: '{value}"'
        },
        splitLine: {
          show: false
        }
      }
    ],
    
    series: [
      // Daily bars
      {
        name: `Daily ${dataType}`,
        type: 'bar',
        data: dailyValues,
    itemStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: barTop },
        { offset: 1, color: barBottom }
    ]),
    borderRadius: [4, 4, 0, 0]
    },
        
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)'
          }
        },
        barWidth: '60%',
        yAxisIndex: 0,
        z: 1
      },
      
      // Cumulative observed line
// Cumulative observed line with area fill
    {
    name: `Cumulative ${dataType}`,
    type: 'line',
    data: cumulativeObserved,
    smooth: true,
    symbolSize: 8,
    symbol: 'circle',
itemStyle: {
  color: showSnow
    ? (darkMode ? 'rgba(160, 210, 255, 1.0)' : 'rgba(40, 130, 180, 1.0)')
    : (darkMode ? 'rgba(120, 200, 255, 1.0)' : 'rgba(0, 148, 255, 1.0)'),
  borderColor: darkMode ? '#1a1a2e' : '#fff',
  borderWidth: 2
},
lineStyle: {
  width: 3,
  color: showSnow
    ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: darkMode ? 'rgba(160, 210, 255, 1.0)' : 'rgba(40, 130, 180, 1.0)' },
        { offset: 1, color: darkMode ? 'rgba(90, 140, 190, 1.0)' : 'rgba(109, 164, 217, 1.0)' }
      ])
    : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: darkMode ? 'rgba(120, 200, 255, 1.0)' : 'rgba(0, 148, 255, 1.0)' },
        { offset: 1, color: darkMode ? 'rgba(0, 110, 160, 1.0)' : 'rgba(74, 177, 245, 1.0)' }
      ]),
  shadowBlur: 8,
  shadowColor: showSnow
    ? (darkMode ? 'rgba(160,210,255,0.3)' : 'rgba(40,130,180,0.3)')
    : (darkMode ? 'rgba(120,200,255,0.3)' : 'rgba(0,148,255,0.3)')
},
areaStyle: {
  color: showSnow
    ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0,   color: darkMode ? 'rgba(45, 70, 100, 0.55)'  : 'rgba(230, 245, 255, 0.55)' },
        { offset: 0.5, color: darkMode ? 'rgba(80, 130, 180, 0.65)' : 'rgba(160, 210, 250, 0.65)' },
        // { offset: 1,   color: darkMode ? 'rgba(60, 110, 170, 0.90)' : 'rgba(80, 150, 225, 0.90)' }
        { offset: 1,   color: darkMode ? 'rgba(67, 77, 209, 0.9)' : 'rgba(82, 105, 235, 0.8)' }
      ])
    : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: darkMode ? 'rgba(30, 55, 75, 0.60)' : 'rgba(224,243,255,0.55)' },
        { offset: 0.5, color: darkMode ? 'rgba(0, 110, 160, 0.70)' : 'rgba(140,202,247,0.70)' },
        { offset: 1, color: darkMode ? 'rgba(0, 60, 110, 0.85)' : 'rgba(0,94,156,0.85)' }
      ])
},
    emphasis: {
        focus: 'series',
        itemStyle: {
        shadowBlur: 15,
        shadowColor: showSnow ? '#12aee5' : '#12e3e3'
        }
    },
    yAxisIndex: 1,
    z: 2
    },
      // Cumulative normals line (if enabled)
    ...(showNormalsCumulative ? [{
    name: 'Normal Cumulative',
    type: 'line',
    data: cumulativeNormals,
    smooth: true,
    symbol: 'none',
lineStyle: {
  width: 2,
  type: 'dashed',
  color: showSnow
    ? (darkMode ? 'rgba(140, 200, 255, 0.9)' : 'rgba(0, 120, 180, 0.9)')
    : (darkMode ? 'rgba(120, 180, 255, 0.9)' : 'rgba(33,123,197,0.9)'),
  opacity: 0.8
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
    <div className="precipitation-chart-container">
      
      
<div style={{ 
  width: '100%', 
  height: isMobile ? '540px' : '510px',  // Match EnhancedWeatherChart heights
  background: darkMode ? '#1a1a2e' : '#ffffff',
  borderRadius: isMobile ? '6px' : '12px',  // Smaller radius on mobile
  padding: isMobile ? '5px' : '20px',  // Less padding on mobile
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  position: 'relative'  // For any absolute positioned elements
}}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
      {/* Snow/Rain Toggle - Below chart, above checkboxes */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginTop: '15px',
        marginBottom: '10px'
      }}>
        <button
          onClick={() => setShowSnow(!showSnow)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: isMobile ? '13px' : '14px',
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
          title={showSnow ? 'Show Precipitation' : 'Show Snowfall'}
        >
            {showSnow ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="m20 16-4-4 4-4" />
              <path d="m4 8 4 4-4 4" />
              <path d="m16 4-4 4-4-4" />
              <path d="m8 20 4-4 4 4" />
            </svg>
          )}
          <span>{showSnow ? 'Show Rain' : 'Show Snow'}</span>
        </button>
      </div>
      {/* Chart controls - Show Normals checkbox */}
      <div className="chart-controls">
        <div className="toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showNormalsCumulative}
              onChange={(e) => setShowNormalsCumulative(e.target.checked)}
              disabled={isLoadingNormals || normals.length === 0}
            />
            <span>Show Normal Cumulative {isLoadingNormals && '(loading...)'}</span>
          </label>
        </div>
      </div>      



    </div>

    
  );
}