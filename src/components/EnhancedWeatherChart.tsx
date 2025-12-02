// src/components/EnhancedWeatherChart.tsx
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';
import './EnhancedWeatherChart.css';

const colors = {
  high: {
    light: {
      line: ['#bd3440ff', '#9a000d'],
      dot: '#BE0010',
      shadow: 'rgba(190, 0, 16, 0.45)',
      normal: 'rgba(190, 0, 16, 0.6)',
    },
    dark: {
      line: ['#d4111f', '#BE0010'],
      dot: '#d4111f',
      shadow: 'rgba(212, 17, 31, 0.45)',
      normal: 'rgba(212, 17, 31, 0.7)',
    }
  },

  low: {
    light: {
      // Clean aqua → deeper teal for good contrast
      line: ['#00BEAE', '#00A696'],
      dot: '#00BEAE',
      shadow: 'rgba(0, 190, 174, 0.40)',
      normal: 'rgba(0, 175, 155, 0.65)',
    },
    dark: {
      // Slightly neon to pop in dark mode
      line: ['#66F5E6', '#00D5C2'],
      dot: '#66F5E6',
      shadow: 'rgba(0, 210, 190, 0.50)',
      normal: 'rgba(0, 220, 200, 0.75)',
    }
  },

  range: {
    // Much smoother → professional 4-stop gradient
    light: [
      'rgba(190,0,16,0.30)',   // warm orange highlight
      'rgba(190,0,16,0.15)',   // fade toward middle
      'rgba(0,190,174,0.20)',   // gentle mixing zone
      'rgba(0,190,174,0.05)' ,   // bottom haze
       'rgba(255, 255, 255, 0.15)'    // bottom haze
    ],
    dark: [
      'rgba(190,0,16,0.6)',   // warm orange highlight
      'rgba(190,0,16,0.4)',   // fade toward middle
      'rgba(0,190,174,0.4)',   // gentle mixing zone
      'rgba(0,190,174,0.05)' ,   // bottom haze
      'rgba(255, 255, 255, 0.15)'    // bottom haze
    ]
  },

  precip: {
    light: [
      'rgba(0,111,190,0.90)',   // your color but refined
      'rgba(0,111,190,0.45)'
    ],
    dark: [
      'rgba(60,150,220,0.95)',  // brighter + clearer in dark mode
      'rgba(40,120,190,0.65)'
    ],
  }
};


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
  darkMode?: boolean;
}

export default function EnhancedWeatherChart({ 
  data, 
  stationId,
  stationName,
  darkMode = false
}: EnhancedWeatherChartProps) {
  const [showHighTemp, setShowHighTemp] = useState(true);
  const [showLowTemp, setShowLowTemp] = useState(true);
  const [showNormals, setShowNormals] = useState(true);
  const [normals, setNormals] = useState<ClimateNormal[]>([]);
  const [isLoadingNormals, setIsLoadingNormals] = useState(false);
  // const [isMobile, setIsMobile] = useState(false);
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

  // Prepare observed data
  const dates = data.map(d => {
    const date = new Date(d.obs_date + 'T12:00:00');
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
    normalHighs.push(normal?.tmax_f ?? null);  // ✅ GOOD - only replaces undefined/null, not 0
    normalLows.push(normal?.tmin_f ?? null);   // ✅ GOOD - only replaces undefined/null, not 0
  });

  // Format date labels - shorter for mobile
  const formatDate = (date: Date) => {
    if (isMobile) {
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Responsive grid settings
  const gridSettings = isMobile ? {
    left: 35,   // CRITICAL: 60 → 35 (Y-axis labels)
    right: 35,  // CRITICAL: 60 → 35 (2nd Y-axis)
    top: 100,    // Reduced from 90; increased from 80
    bottom: 80  // Reduced from 70; increased from 60
  } : {
    left: 60,
    right: 60,
    top: 120,
    bottom: 90
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

const titleSettings = isMobile ? {
  text: wrapStationName(stationName, 30),  // Wrap at 30 chars for mobile
  left: 'center',
  top: 5,
  textStyle: {
    fontSize: 15,  // Reduced from 17 for wrapped titles
    fontWeight: 700,
    color: darkMode ? '#ecf0f1' : '#2c3e50',
    lineHeight: 18
  }
} : {
  text: wrapStationName(stationName, 50),  // Wrap at 50 chars for desktop
  left: 'center',
  top: 10,
  textStyle: {
    fontSize: 20,
    fontWeight: 700,
    color: darkMode ? '#ecf0f1' : '#2c3e50',
    lineHeight: 24
  }
};  

  // Responsive legend
  const legendSettings = isMobile ? {
    data: [
      ...(showHighTemp ? ['High Temp'] : []),
      ...(showLowTemp ? ['Low Temp'] : []), //F°
      'Precip',
      ...(showNormals ? ['Normal High', 'Normal Low'] : [])
    ],
    top: 45,
    left: 'center',
    width: '110%',  // Constrain width to force wrapping after 3 items
    itemGap: 7,
    itemWidth: 8,  //changed from 15
    itemHeight: 7, //changed from 10
    textStyle: {
      fontSize: 11,
      color: darkMode ? '#bdc3c7' : '#555'
    },
    selectedMode: {
      'High Temp': false,
      'Low Temp': false,
      'Precip': true,
      'Normal High': true,
      'Normal Low': true
    }
  } : {
    data: [
      ...(showHighTemp ? ['High Temp'] : []),
      ...(showLowTemp ? ['Low Temp'] : []),
      'Precipitation',
      ...(showNormals ? ['Normal High', 'Normal Low'] : [])
    ],
    top: 45,
    left: 'center',
    itemGap: 15,
    itemWidth: 20,   // ← Add/change this from 25
    itemHeight: 12,  // ← Add/change this from 14
    textStyle: {
      fontSize: 13,
      color: darkMode ? '#bdc3c7' : '#555'
    },
    selectedMode: {
      'High Temp': false,
      'Low Temp': false,
      'Precipitation': true,
      'Normal High': true,
      'Normal Low': true
    }
  };

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    title: titleSettings,
    
    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode
        ? 'rgba(30, 38, 50, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: isMobile ? 5 : 15, //reduced from 10:15
      textStyle: {
        color: darkMode ? '#e3eef5' : '#333',
        fontSize: isMobile ? 14 : 15
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
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: ${isMobile ? '12px' : '14px'};">${date}</div>`;
        
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
            <div style="margin: 4px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color}; margin-right: 6px;"></span>
                <span style="color: #666; font-size: ${isMobile ? '10px' : '12px'};">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 8px; color: #333; font-size: ${isMobile ? '11px' : '13px'};">${displayValue}${unit}</span>
            </div>
          `;
        });
        
        return html;
      }
    },
    
    legend: legendSettings,
    
    grid: gridSettings,
    
    dataZoom: isMobile ? [
      // Mobile: Only slider zoom, no inside zoom to prevent conflict with crosshair
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        height: 35,
        bottom: 5,
        borderColor: '#e0e0e0',
        fillerColor: 'rgba(102, 126, 234, 0.15)',
        handleStyle: {
          color: '#667eea'
        },
        textStyle: {
          fontSize: 9
        }
      }
    ] : [
      // Desktop: Both inside (mouse wheel) and slider zoom
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
        },
        textStyle: {
          fontSize: 11
        }
      }
    ],
    
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: darkMode ? '#3d4a57' : '#d8d8d8'
        }
      },
      axisLabel: {
        color: darkMode ? '#cfd8dc' : '#666',
        fontSize: isMobile ? 11 : 12,
        rotate: isMobile ? 45 : 45,
        formatter: (value: any) => formatDate(new Date(value)),
        interval: isMobile ? 'auto' : 0
      },
      axisPointer: {
        label: {
          formatter: (params: any) => {
            const date = new Date(params.value);
            return date.toLocaleDateString('en-US', { 
              weekday: 'short',
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
      {
        type: 'value',
        name: 'Temp',  // Always use "Temp" for more width
        nameLocation: 'end',  // Position on top of axis
        nameGap: 10,
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600
        },
        position: 'left',
        min: function(value: any) {
          const buffer = (value.max - value.min) * 0.05;
          const minWithBuffer = value.min - buffer;
          return Math.floor(minWithBuffer / 5) * 5;  // Round DOWN to nearest 5
        },
        max: function(value: any) {
          const buffer = (value.max - value.min) * 0.05;
          const maxWithBuffer = value.max + buffer;
          return Math.ceil(maxWithBuffer / 5) * 5;  // Round UP to nearest 5
        },
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
      {
        type: 'value',
        name: isMobile ? 'Precip' : 'Precipitation (inches)',  // CRITICAL: Just "Precip"
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,  // Smaller
          fontWeight: 600
        },
        position: 'right',
        min: 0,  // ADD THIS - start at 0
        max: Math.max(...precip) > 0.9 ? undefined : 1.0,  // ADD THIS - fix at 1.0" unless data exceeds 0.9"
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
          show: false
        }
      }
    ],
    
    series: [
      // Temperature range area (only if both temps are shown)
      ...(showHighTemp && showLowTemp ? [
        
        {
        name: 'Temperature Range',
        type: 'line',
        data: maxTemps,
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: darkMode ? colors.range.dark[0] : colors.range.light[0] },
            { offset: 0.15, color: darkMode ? colors.range.dark[1] : colors.range.light[1] },
            { offset: 0.3, color: darkMode ? colors.range.dark[2] : colors.range.light[2] },
            { offset: .7, color: darkMode ? colors.range.dark[3] : colors.range.light[3] },
            { offset: 1, color: darkMode ? colors.range.dark[4] : colors.range.light[4] },
          ])
        },    
        yAxisIndex: 0,
        z: 1
      }] : []),

// Temperature range area (only if both temps are shown)
// Temperature range area (only if both temps are shown)
// This uses a custom dataset approach

      // High temperature
      ...(showHighTemp ? [{
        name: 'High Temp',
        type: 'line',
        data: maxTemps,
        smooth: true,
        symbolSize: isMobile ? 3 : 6,
        itemStyle: {
          color: darkMode ? colors.high.dark.dot : colors.high.light.dot,
          borderColor: darkMode ? '#1a1a2e' : '#fff',
          borderWidth: isMobile ? 1 : 2,
        },
        lineStyle: {
          width: isMobile ? 2 : 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0,
            (darkMode ? colors.high.dark.line : colors.high.light.line)
              .map((c, i) => ({ offset: i, color: c }))
          ),
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: darkMode ? colors.high.dark.shadow : colors.high.light.shadow,
          }
        },
        markPoint: {  // ADD THIS ENTIRE BLOCK
          data: [
            {
              type: 'max',
              label: {
                show: true,
                formatter: '{c}°',
                position: 'top',  // ADD THIS - places label above point
                // offset: [0, -0],  // ADD THIS - moves it 10px further up
                color: darkMode ? '#fff' : '#2c3e50',
                fontSize: isMobile ? 11 : 13,
                fontWeight: 'semibold',
                backgroundColor: darkMode ? 'rgba(190, 0, 16, 0.8)' : 'rgba(190, 0, 16, 0.7)',
                padding: [2.5, 7],
                borderRadius: 6
              },
              symbolSize: 0  // Hide the marker symbol, just show label
            }
          ]
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
        symbolSize: isMobile ? 3 : 6,
        itemStyle: {
          color: darkMode ? colors.low.dark.dot : colors.low.light.dot,
          borderColor: darkMode ? '#1a1a2e' : '#fff',
          borderWidth: isMobile ? 1 : 2,
        },
        lineStyle: {
          width: isMobile ? 2 : 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0,
            (darkMode ? colors.low.dark.line : colors.low.light.line)
              .map((c, i) => ({ offset: i, color: c }))
          ),
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: darkMode ? colors.low.dark.shadow : colors.low.light.shadow,
          }
        },
        markPoint: {  // ADD THIS ENTIRE BLOCK
          data: [
            {
              type: 'min',
              label: {
                show: true,
                formatter: '{c}°',
                position: 'bottom',
                color: darkMode ? '#fff' : '#2c3e50',
                fontSize: isMobile ? 11 : 13,
                fontWeight: 'semibold',
                backgroundColor: darkMode ? 'rgba(0, 190, 174, 0.8)' : 'rgba(0, 190, 174, 0.6)',
                padding: [2.5, 7],
                borderRadius: 4
              },
              symbolSize: 0  // Hide the marker symbol, just show label
            }
          ]
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
          width: isMobile ? 2 : 3,
          type: 'dashed',
          opacity: 0.8,
          color: darkMode ? colors.high.dark.normal : colors.high.light.normal
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
          width: isMobile ? 2 : 3,
          type: 'dashed',
          opacity: 0.8,
          color: darkMode ? colors.low.dark.normal : colors.low.light.normal
        },
        yAxisIndex: 0,
        z: 1
      }] : []),
      
      // Precipitation
      {
        name: 'Precip',
        type: 'bar',
        data: precip,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: darkMode ? colors.precip.dark[0] : colors.precip.light[0] },
            { offset: 1, color: darkMode ? colors.precip.dark[1] : colors.precip.light[1] }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: isMobile ? '60%' : '70%',
        yAxisIndex: 1,
        z: 0
      }
    ],
    
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <div className={`enhanced-chart-container ${darkMode ? 'dark-mode' : ''}`}>
      <div style={{ 
        width: '100%', 
        height: isMobile ? '540px' : '510px', //was 380
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: isMobile ? '6px' : '12px',
        padding: isMobile ? '5px' : '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        position: 'relative'
      }}>
        <ReactECharts
          // key={data.length}  // ← ADD THIS - forces full re-render
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true} // changed from false
          lazyUpdate={true} // changed from false
        />
        
        {/* Landscape button - bottom left corner */}
        <button
          className="landscape-button"
          onClick={() => {
            // TODO: Implement landscape view in Phase 2
            console.log('Landscape view coming soon!');
          }}
          title="Landscape view"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 9V3h-6" />
            <path d="M3 15v6h6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
      </div>

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
    </div>
  );
}