import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';
import './EnhancedWeatherChart.css';

const colors = {
  high: {
    light: {
      line: ['#ae3514cc', '#AE3514'],
      dot: '#AE3514',
      shadow: 'rgba(190, 92, 0, 0.45)',
      normal: '#d30000ff',
    },
    dark: {
      line: ['#c03942ff', '#b3000fff'],
      dot: '#d4111f',
      shadow: 'rgba(212, 17, 31, 0.45)',
      normal: 'rgba(212, 17, 31, 0.7)',
    }
  },

  low: {
    light: {
      line: ['#0888acc9', '#148dae'],
      dot: '#148daede',
      shadow: 'rgba(0, 190, 174, 0.40)',
      normal: '#04addbc9',
    },
    dark: {
      line: ['#66F5E6', '#00D5C2'],
      dot: '#66F5E6',
      shadow: 'rgba(0, 210, 190, 0.50)',
      normal: '#148daed8',
    }
  },

  range: {
    light: [
      'rgba(174, 53, 20, 0.6)',
      'rgba(174, 53, 20, 0.2)',
      'rgba(20, 141, 174, 0.25)',
      'rgba(20,141,174,0.15)',
      'rgba(189, 189, 189, 0)'
    ],
    dark: [
      'rgba(190,0,16,0.6)',
      'rgba(190,0,16,0.4)',
      'rgba(0,190,174,0.4)',
      'rgba(0,190,174,0.05)',
      'rgba(255, 255, 255, 0.15)'
    ]
  },

  precip: {
    light: [
      '#1440aed8',
      'rgba(0,111,190,0.45)'
    ],
    dark: [
      'rgba(60,150,220,0.95)',
      'rgba(40,120,190,0.65)'
    ],
  },
  snow: {  // ADD THIS ENTIRE BLOCK
    light: [
      'rgba(109, 184, 250, 0.9)',  // Light ice blue at top
      'rgba(185, 222, 250, 0.7)'   // Very light ice blue at bottom
    ],
    dark: [
      'rgba(140,200,255,0.95)',  // Brighter ice blue for dark mode
      'rgba(180,220,255,0.45)'   // Lighter ice blue
    ],
  }
};

interface DailyWeather {
  obs_date: string;
  tmax_f: number | null;
  tmin_f: number | null;
  prcp_in: number | null;
  snow_in: number | null;  // ADD THIS
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
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: string) => void;
}

export default function EnhancedWeatherChart({ 
  data, 
  stationId,
  stationName,
  darkMode = false,
  startDate: _startDate,
  endDate: _endDate,
  onDateRangeChange
}: EnhancedWeatherChartProps) {
  const [showHighTemp, setShowHighTemp] = useState(true);
  const [showLowTemp, setShowLowTemp] = useState(true);
  const [showNormals, setShowNormals] = useState(true);
  const [normals, setNormals] = useState<ClimateNormal[]>([]);
  const [isLoadingNormals, setIsLoadingNormals] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [showSnow, setShowSnow] = useState(false);  // ADD THIS - default to precip
  const [activeRange, setActiveRange] = useState<string>('14D');

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

// Set initial active range based on current date range (runs once on mount)
// useEffect(() => {
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
//   // Month to date
//   if (start.getDate() === 1 && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
//     setActiveRange('MTD');
//   }
//   // Year to date
//   else if (start.getMonth() === 0 && start.getDate() === 1 && start.getFullYear() === end.getFullYear()) {
//     setActiveRange('YTD');
//   }
//   // Based on day difference
//   else if (diffDays >= 6 && diffDays <= 8) setActiveRange('7D');
//   else if (diffDays >= 13 && diffDays <= 15) setActiveRange('14D');
//   else if (diffDays >= 28 && diffDays <= 32) setActiveRange('1M');
//   else if (diffDays >= 85 && diffDays <= 95) setActiveRange('3M');
//   else if (diffDays >= 175 && diffDays <= 185) setActiveRange('6M');
//   else if (diffDays >= 360 && diffDays <= 370) setActiveRange('1Y');
//   else setActiveRange('Custom');
// }, []); // Empty array = only run once on mount

    if (stationId) {
      fetchNormals();
    }
  }, [stationId]);

  const handleRangeClick = (range: string) => {
    setActiveRange(range); // Update immediately for instant visual feedback
    onDateRangeChange(range); // Trigger parent update
  };

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
  // const precip = data.map(d => d.prcp_in || 0);
  const precip = data.map(d => showSnow ? (d.snow_in || 0) : (d.prcp_in || 0));  // Toggle between precip and snow

  // Compute axis min/max for temperature, matching your old min/max logic
  const allTemps: number[] = [];
  maxTemps.forEach(t => { if (typeof t === 'number') allTemps.push(t); });
  minTemps.forEach(t => { if (typeof t === 'number') allTemps.push(t); });



  // Compute raw min/max from the data
// const allTemps = [];
maxTemps.forEach(t => { if (typeof t === 'number') allTemps.push(t); });
minTemps.forEach(t => { if (typeof t === 'number') allTemps.push(t); });

let axisMin = 0;
let axisMax = 0;

if (allTemps.length > 0) {
  const rawMin = Math.min(...allTemps);
  const rawMax = Math.max(...allTemps);
  const buffer = (rawMax - rawMin) * 0.05;

  // Round min and max to nearest 5° intervals
  const minWithBuffer = rawMin - buffer;
  const maxWithBuffer = rawMax + buffer;

  const roundedMin = Math.floor(minWithBuffer / 5) * 5;
  const roundedMax = Math.ceil(maxWithBuffer / 5) * 5;

  // 👉 Zero-base logic:
  if (roundedMin >= 0) {
    axisMin = 0;                 // zero-base the graph
  } else {
    axisMin = roundedMin;        // negative temps → use the real minimum
  }

  axisMax = roundedMax;
}


  // Match normals to observed dates
  const normalsMap = new Map(normals.map(n => [n.mmdd, n]));
  const normalHighs: (number | null)[] = [];
  const normalLows: (number | null)[] = [];

  dates.forEach(date => {
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const normal = normalsMap.get(mmdd);
    normalHighs.push(normal?.tmax_f ?? null);
    normalLows.push(normal?.tmin_f ?? null);
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
    left: 35,
    right: 35,
    top: 100,
    bottom: 80
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
    text: wrapStationName(stationName, 30),
    left: 'center',
    top: 5,
    textStyle: {
      fontSize: 15,
      fontWeight: 700,
      color: darkMode ? '#ecf0f1' : '#2c3e50',
      lineHeight: 18
    }
  } : {
    text: wrapStationName(stationName, 50),
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
      ...(showLowTemp ? ['Low Temp'] : []),
      showSnow ? 'Snow' : 'Precip',
      ...(showNormals ? ['Normal High', 'Normal Low'] : [])
    ],
    top: 45,
    left: 'center',
    width: '110%',
    itemGap: 7,
    itemWidth: 8,
    itemHeight: 7,
    //  icon: 'rect',
    textStyle: {
      fontSize: 11,
      color: darkMode ? '#bdc3c7' : '#555'
    },
    selectedMode: {
      'High Temp': true,
      'Low Temp': true,
      'Precip': true,
      'Normal High': true,
      'Normal Low': true
    }
  } : {
    data: [
      ...(showHighTemp ? ['High Temp'] : []),
      ...(showLowTemp ? ['Low Temp'] : []),
      showSnow ? 'Snow' : 'Precip',
      ...(showNormals ? ['Normal High', 'Normal Low'] : [])
    ],
    top: 45,
    left: 'center',
    itemGap: 15,
    itemWidth: 20,
    itemHeight: 12,
    // icon: 'rect',
    textStyle: {
      fontSize: 13,
      color: darkMode ? '#bdc3c7' : '#555'
    },
    selectedMode: {
      'High Temp': true,
      'Low Temp': true,
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
        : 'rgba(255, 255, 255, 1)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: isMobile ? 5 : 15,
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
          // Hide shading series in tooltip
          if (param.seriesName === 'TempFillBase' || param.seriesName === 'TempFillBand' || param.seriesName === 'Temperature Shade') return;

          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          let displayValue = value;
          let unit = '';
          
          if (param.seriesName.includes('Temp')) {
            unit = '°F';
            displayValue = value !== 'N/A' ? Math.round(value) : value;
          } else if (param.seriesName === 'Precipitation' || param.seriesName === 'Precip') {
            unit = '"';
            displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          }
          
          html += `
            <div style="margin: 4px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color}; margin-right: 6px;"></span>
                <span style="color: ${darkMode ? '#bdc3c7' : '#666'}; font-size: ${isMobile ? '10px' : '12px'};">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 8px; color: ${darkMode ? '#bdc3c7' : '#666'}; font-size: ${isMobile ? '11px' : '13px'};">${displayValue}${unit}</span>
            </div>
          `;
        });
        
        return html;
      }
    },
    
    legend: legendSettings,
    
    grid: gridSettings,
    
    dataZoom: isMobile ? [
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
        rotate: 45,
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
        name: 'Temp',
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600
        },
        position: 'left',
        min: axisMin,
        max: axisMax,
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
            color: darkMode ? '#2c3e50' : '#cfcdcd3b'
          }
        }
      },
      {
        type: 'value',
        name: isMobile ? (showSnow ? 'Snow' : 'Precip') : (showSnow ? 'Snowfall (inches)' : 'Precipitation (inches)'),
        nameTextStyle: {
          color: darkMode ? '#95a5a6' : '#666',
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600
        },
        position: 'right',
        min: 0,
        max: Math.max(...precip) > 0.9 ? undefined : 1.0,
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
      // Temperature Line and Shading
 // 🔥 Temperature shading from High Temp down to axis bottom
{
  name: 'Temperature Shade',
  type: 'line',
  data: maxTemps,
  symbol: 'none',
  smooth: true,           // or false, your call
  lineStyle: {
    width: 0,             // hide the line itself
    opacity: 0,
  },
  areaStyle: {
    origin: 'start',      // <--- key: fill down to yAxis.min, not 0
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0,    color: darkMode ? colors.range.dark[0] : colors.range.light[0] },
      { offset: 0.15, color: darkMode ? colors.range.dark[1] : colors.range.light[1] },
      { offset: 0.35,  color: darkMode ? colors.range.dark[2] : colors.range.light[2] },
      { offset: 0.55, color: darkMode ? colors.range.dark[3] : colors.range.light[3] },
      { offset: 1,    color: darkMode ? colors.range.dark[4] : colors.range.light[4] },
    ]),
  },
  silent: true,
  yAxisIndex: 0,
  z: 0,                  // keep this below the high/low lines (which use z: 2)
},


      // High temperature line
      ...(showHighTemp ? [{
        name: 'High Temp',
        type: 'line',
        data: maxTemps,
        smooth: 0.4,
        symbolSize: isMobile ? 3 : 3,
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
        markPoint: {
          data: [
            {
              type: 'max',
              label: {
                show: true,
                formatter: '{c}°',
                position: 'top',
                color: darkMode ? '#fff' : '#fff',
                fontSize: isMobile ? 11 : 13,
                fontWeight: 'semibold',
                backgroundColor: darkMode ? 'rgba(190, 0, 16, 0.8)' : 'rgba(192, 0, 16, 0.8)',
                padding: [2.5, 7],
                borderRadius: 6
              },
              symbolSize: 0
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
        symbolSize: isMobile ? 3 : 3,
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
        markPoint: {
          data: [
            {
              type: 'min',
              label: {
                show: true,
                formatter: '{c}°',
                position: 'bottom',
                color: darkMode ? '#fff' : '#000',
                fontSize: isMobile ? 11 : 13,
                fontWeight: 'semibold',
                backgroundColor: darkMode ? 'rgba(0, 190, 174, 0.8)' : 'rgba(4, 167, 212, 0.38)',
                padding: [2.5, 7],
                borderRadius: 4
              },
              symbolSize: 0
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
        showSymbol: false,
        // legendIcon: 'rect',  // ADD THIS - forces dashed line icon
        lineStyle: {
          width: isMobile ? 2.5 : 3,
          type: 'dotted',
          opacity: 0.8,
          color: darkMode ? colors.high.dark.normal : colors.high.light.normal
        },
      itemStyle: {
        color: darkMode ? colors.high.dark.normal : '#ad0b0ba6', // 👈 match line
        opacity: 0.5,
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
        legendIcon: 'rect',  // ADD THIS - forces dashed line icon
        lineStyle: {
          width: isMobile ? 2.5 : 3,
          type: 'dotted',
          opacity: 0.8,
          color: darkMode ? colors.low.dark.normal : colors.low.light.normal
        },
        itemStyle: {
        color: darkMode ? colors.high.dark.normal : '#0b8dada6', // 👈 match line
        opacity: 0.5,
      },
        yAxisIndex: 0,
        z: 1
      }] : []),
      
      // Precipitation
      {
        name: showSnow ? 'Snow' : 'Precip',  // Dynamic name
        type: 'bar',
        data: precip,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, 
            showSnow ? [
              // Ice blue gradient for snow
              { offset: 0, color: darkMode ? colors.snow.dark[0] : colors.snow.light[0] },
              { offset: 1, color: darkMode ? colors.snow.dark[1] : colors.snow.light[1] }
            ] : [
              // Regular blue gradient for precipitation
              { offset: 0, color: darkMode ? colors.precip.dark[0] : colors.precip.light[0] },
              { offset: 1, color: darkMode ? colors.precip.dark[1] : colors.precip.light[1] }
            ]
          ),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: isMobile ? '60%' : '70%',
        yAxisIndex: 1,
        z: 0
      }
    ],
    
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  //   animationDelay: (idx: number) => {
  // // Stagger the animation by series order
  // return idx * 100;  // 100ms delay between each series element
// }
  };

  return (
    <div className={`enhanced-chart-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Date Range Selector - CNBC Style */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? '6px' : '8px',
        marginBottom: '15px',
        marginTop: '10px',
        flexWrap: 'wrap',
        padding: '0 10px'
      }}>
        {['7D', '14D', 'MTD', '1M', '3M', '6M', 'YTD', '1Y'].map(range => (
          <button
            key={range}
            onClick={() => handleRangeClick(range)}
            style={{
              padding: isMobile ? '6px 12px' : '8px 16px',
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: activeRange === range ? 700 : 500,
              color: activeRange === range 
                ? '#fff' 
                : (darkMode ? '#95a5a6' : '#666'),
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
                : 'none',
              minWidth: isMobile ? '42px' : '48px'
            }}
            onMouseEnter={(e) => {
              if (activeRange !== range) {
                e.currentTarget.style.background = darkMode 
                  ? 'rgba(52, 73, 94, 0.5)' 
                  : 'rgba(0, 0, 0, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeRange !== range) {
                e.currentTarget.style.background = darkMode 
                  ? 'rgba(52, 73, 94, 0.3)' 
                  : 'rgba(0, 0, 0, 0.04)';
              }
            }}
          >
            {range}
          </button>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '20px',
        width: '100%', 
        height: isMobile ? '540px' : '510px',
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: isMobile ? '6px' : '12px',
        padding: isMobile ? '5px' : '20px',
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
        
        {/* Landscape button - bottom left corner */}
        <button
          className="landscape-button"
          onClick={() => {
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // CHANGED - gradient like other buttons
    border: 'none',  // CHANGED - remove border for gradient
    borderRadius: '8px',
    padding: '10px 20px',  // CHANGED - slightly more padding
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: isMobile ? '13px' : '14px',
    fontWeight: 600,
    color: 'white',  // CHANGED - white text on gradient
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'  // CHANGED - gradient shadow
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';  // CHANGED - lift effect
    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  }}
  title={showSnow ? 'Show Precipitation' : 'Show Snowfall'}
>
  {showSnow ? (
    // Raindrop icon (when snow is selected)
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ) : (
    // Better Snowflake icon (when precip is selected)
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

{/* <div className="chart-controls">
  <div className="toggle-group"></div> */}


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