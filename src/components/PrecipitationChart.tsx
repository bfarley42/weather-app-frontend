// src/components/PrecipitationChart.tsx
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';
import './PrecipitationChart.css';
import {CalendarDays} from 'lucide-react';

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
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: string) => void;
}

interface PrecipitationChartProps {
  data: DailyWeather[];
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  startDate: string;
  endDate: string;
  onDateRangeChange: (range: string) => void;
  initialShowSnow?: boolean;  // ADD THIS LINE
}

export default function PrecipitationChart({ 
  data, 
  stationId,
  stationName,
  darkMode = false,
  startDate,
  endDate,
  onDateRangeChange,
  initialShowSnow = false  // ADD THIS LINE
}: PrecipitationChartProps) {
  const [showSnow, setShowSnow] = useState(initialShowSnow); // Changed from useState(false)
  const [showNormalsCumulative, setShowNormalsCumulative] = useState(true);
  const [normals, setNormals] = useState<ClimateNormal[]>([]);
  const [isLoadingNormals, setIsLoadingNormals] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768); 
  const [activeRange, setActiveRange] = useState<string>('14D');

  const [compareLY, setCompareLY] = useState(false);
  const [lastYearData, setLastYearData] = useState<DailyWeather[]>([]);
  const [isLoadingLY, setIsLoadingLY] = useState(false);

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
  
      // Handle date range button clicks
    const handleRangeClick = (range: string) => {
      setActiveRange(range);
      onDateRangeChange(range);
    };

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

  // Fetch last year's data when compareLY is enabled
useEffect(() => {
  const fetchLastYearData = async () => {
    if (!compareLY || !stationId) return;
    
    setIsLoadingLY(true);
    try {
      // Calculate last year's date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const lyStart = new Date(start);
      const lyEnd = new Date(end);
      lyStart.setFullYear(lyStart.getFullYear() - 1);
      lyEnd.setFullYear(lyEnd.getFullYear() - 1);
      
      const lyStartStr = lyStart.toISOString().split('T')[0];
      const lyEndStr = lyEnd.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_URL}/api/weather/daily?station=${stationId}&start=${lyStartStr}&end=${lyEndStr}`
      );
      if (response.ok) {
        const data = await response.json();
        setLastYearData(data);
      }
    } catch (error) {
      console.error('Error fetching last year data:', error);
    } finally {
      setIsLoadingLY(false);
    }
  };
  
  if (compareLY) {
    fetchLastYearData();
  } else {
    setLastYearData([]);
  }
}, [compareLY, stationId, startDate, endDate]);

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

  const maxDailyValue = Math.max(...dailyValues);
  const defaultAxisMax = showSnow ? 3 : 1;  // 3" for snow, 1" for precip
  const dailyAxisMax = maxDailyValue > defaultAxisMax ? undefined : defaultAxisMax;
  
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

   const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate last year's daily and cumulative values
const lastYearDaily: number[] = [];
const lastYearCumulative: number[] = [];

if (compareLY && lastYearData.length > 0) {
  let lyCumSum = 0;
  // Match by index (same position in date range)
  dates.forEach((_, idx) => {
    const lyRecord = lastYearData[idx];
    const lyValue = lyRecord 
      ? (showSnow ? (lyRecord.snow_in || 0) : (lyRecord.prcp_in || 0))
      : 0;
    lastYearDaily.push(lyValue);
    lyCumSum += lyValue;
    lastYearCumulative.push(lyCumSum);
  });
}

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

  const dataType = showSnow ? 'Snow' : 'Precip';
  const barTop = showSnow
    ? (darkMode ? 'rgba(175, 215, 255, 0.98)' : 'rgba(205, 235, 255, 0.98)')
    : (darkMode ? 'rgba(90, 200, 255, 0.95)' : '#1440aed8');

  const barBottom = showSnow
    ? (darkMode ? 'rgba(70, 130, 190, 0.92)' : 'rgba(80, 155, 225, 0.92)')
    : (darkMode ? 'rgba(0, 70, 130, 0.90)' : 'rgba(0,111,190,0.45)');
  
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
    color: darkMode ? '#95a5a6' : '#7f8c8d',
    lineHeight: isMobile ? 14 : 16
  }
};

  const option = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: titleSettings,
    
    // {
    //   text: wrapStationName(stationName, isMobile ? 30 : 50),  // Just station name, wrapped
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
      backgroundColor: darkMode ? 'rgba(44, 44, 62, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: isMobile ? 5 : 15,
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
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: ${isMobile ? '12px' : '14px'};">${date}</div>`;
        
        params.forEach((param: any) => {
          const value = param.value !== null && param.value !== undefined ? param.value : 'N/A';
          const displayValue = value !== 'N/A' ? value.toFixed(2) : value;
          
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="color: ${darkMode ? '#bdc3c7' : '#666'}; font-size: ${isMobile ? '10px' : '12px'};">${param.seriesName}:</span>
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
        ...(compareLY ? [`LY Daily`, `LY Cumulative`] : []),
        ...(showNormalsCumulative && !compareLY ? [`Normal Cumulative`] : [])
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
        min: 0,
        max: dailyAxisMax,
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
    symbolSize: 6,
    symbol: 'circle',
itemStyle: {
  color: showSnow
    ? (darkMode ? 'rgba(160,210,255,1)' : '#2883b4a1')
    : (darkMode ? 'rgba(120,200,255,1)' : 'rgba(50, 153, 182, 0.79)'),
  borderColor: darkMode ? '#1a1a2e' : '#fff',
  borderWidth: 0.5
},
lineStyle: {
  width: 3,
  color: showSnow
    ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: darkMode ? 'rgba(160, 210, 255, 1)' : '#2882b4ff' },
        { offset: 1, color: darkMode ? 'rgba(90, 140, 190, 1)' : '#6da4d9ff' }
      ])
    : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: darkMode ? 'rgba(120, 200, 255, 1)' : 'rgba(20,141,174,.7)' },
        { offset: 1, color: darkMode ? 'rgba(0, 110, 160, 1)' : 'rgba(10, 129, 161, 0.9)' }
      ]),
  shadowBlur: 8,
  shadowColor: showSnow
    ? (darkMode ? 'rgba(160,210,255,0.3)' : 'rgba(40,130,180,0.3)')
    : (darkMode ? 'rgba(120,200,255,0.3)' : 'rgba(0,148,255,0.3)')
},
areaStyle: {
  color: showSnow
    ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0,   color: darkMode ? 'rgba(45, 70, 100, 0.55)'  : 'rgba(59, 77, 179, 0.05)' },
        { offset: 0.5, color: darkMode ? 'rgba(80, 130, 180, 0.65)' : 'rgba(59, 77, 179, 0.2)' },
        // { offset: 1,   color: darkMode ? 'rgba(60, 110, 170, 0.90)' : 'rgba(80, 150, 225, 0.90)' }
        { offset: 1,   color: darkMode ? 'rgba(67, 77, 209, 0.9)' : 'rgba(40, 60, 180, 0.4)' }
      ])
    : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: darkMode ? 'rgba(30, 55, 75, 0.30)' : 'rgba(224,243,255,0.35)' },
        { offset: 0.7, color: darkMode ? 'rgba(0, 110, 160, 0.50)' : 'rgba(140,202,247,0.50)' },
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
    markPoint: {
  data: [
    {
      coord: [cumulativeObserved.length - 1, cumulativeObserved[cumulativeObserved.length - 1]],
      value: cumulativeObserved[cumulativeObserved.length - 1],
      label: {
        show: true,
        formatter: (params: any) => `${params.value.toFixed(2)}"`,
        position: 'top',
        offset: [0, -1],
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'bold',
        color: '#3f3f3fff',
        backgroundColor: showSnow
          ? 'rgba(160, 210, 255, 0.85)' // Ice blue for snow
          : 'rgba(50, 153, 182, 0.85)', // Water blue for rain
        padding: [3, 7],
        borderRadius: 3
      },
      symbolSize: 0
    }
  ]
},
    yAxisIndex: 1,
    z: 2
    },

    // Last year daily bars (if Compare LY enabled)
...(compareLY && lastYearData.length > 0 ? [{
  name: 'LY Daily',
  type: 'bar',
  data: lastYearDaily,
  barWidth: '65%',
  barGap: '-100%',  // Overlap with current year bars
  itemStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: darkMode ? 'rgba(255, 180, 100, 0.7)' : '#ead266cc' },
      { offset: 1, color: darkMode ? 'rgba(200, 120, 50, 0.5)' : '#ead266c4' }
    ]),
    borderRadius: [2, 2, 0, 0]
  },
  yAxisIndex: 0,
  z: 0  // Behind current year
}] : []),

// Last year cumulative line (if Compare LY enabled)
// Last year cumulative line (if Compare LY enabled)
...(compareLY && lastYearData.length > 0 ? [{
  name: 'LY Cumulative',
  type: 'line',
  data: lastYearCumulative,
  smooth: true,
  symbol: 'none',
  itemStyle: {
  color: '#dfbd25ff',
    // ? (darkMode ? 'rgba(160,210,255,1)' : '#2883b4a1')
    // : (darkMode ? 'rgba(120,200,255,1)' : 'rgba(50, 153, 182, 0.79)'),
  borderColor: darkMode ? '#1a1a2e' : '#fff',
  borderWidth: 0.5
},
  lineStyle: {
    width: 2,
    type: 'dashed',
    color: darkMode ? 'rgba(255, 180, 100, 0.9)' : '#d6b007ff'
  },
  areaStyle: {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: darkMode ? 'rgba(255, 180, 100, 0.15)' : 'rgba(230, 160, 80, 0.1)' },
      { offset: 1, color: darkMode ? 'rgba(200, 120, 50, 0.05)' : 'rgba(180, 100, 40, 0.02)' }
    ])
  },
  markPoint: {
    data: [
      {
        coord: [lastYearCumulative.length - 1, lastYearCumulative[lastYearCumulative.length - 1]],
        label: {
          show: true,
          formatter: () => `${lastYearCumulative[lastYearCumulative.length - 1]?.toFixed(2) || '0.00'}"`,
          position: 'top',
          offset: [0, -3],
          fontSize: isMobile ? 11 : 13,
          fontWeight: 'bold',
          color: '#3f3f3fff',
          backgroundColor: '#e7cb4eff',
          padding: [3, 7],
          borderRadius: 3
        },
        symbolSize: 0
      }
    ]
  },
  
  yAxisIndex: 1,
  z: 0
}] : []),


      // Cumulative normals line (if enabled)
    ...(showNormalsCumulative && !compareLY ? [{
    // ...(showNormalsCumulative ? [{  
    name: 'Normal Cumulative',
    type: 'line',
    data: cumulativeNormals,
    smooth: true,
    symbol: 'none',
lineStyle: {
  width: 2,
  type: 'dashed',
  color: showSnow
    ? (darkMode ? 'rgba(140, 200, 255, 0.9)' : '#283db4dc')
    : (darkMode ? '#14ae82e0' : '#14AE82'),
  opacity: 0.8
},
      itemStyle: {
        color: showSnow ?
          darkMode ? '#14AE82': '#283db4dc' // 👈 match line
          : darkMode ? '#14AE82': '#14AE82', // 👈 match line
        opacity: darkMode ? 0.8: 0.5,
      },
markPoint: {
  data: [
    {
      coord: [cumulativeObserved.length - 1, cumulativeObserved[cumulativeObserved.length - 1]],
      value: cumulativeObserved[cumulativeObserved.length - 1],
      label: {
        show: true,
        formatter: (params: any) => `${params.value.toFixed(2)}"`,
        position: 'top',
        offset: [0, -1],
        color: '#3f3f3fff',
        fontSize: isMobile ? 11 : 13,
        fontWeight: 'bold',
        backgroundColor: showSnow
          ? 'rgba(160, 210, 255, 0.85)' // Ice blue for snow
          : 'rgba(50, 153, 182, 0.85)', // Water blue for rain
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
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <div className="precipitation-chart-container">
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
        {/* Snow/Rain Toggle and Compare LY - Below chart */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '10px',
          marginTop: '15px',
          marginBottom: '10px',
          flexWrap: 'wrap'
        }}>
          {/* Existing Snow/Rain button */}
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
{/* Compare Last Year Toggle */}
<button
  onClick={() => setCompareLY(!compareLY)}
  disabled={isLoadingLY}
  style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border:  'none',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: isLoadingLY ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: isMobile ? '13px' : '14px',
    fontWeight: 600,
    color: 'white',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    marginLeft: '10px'
  }}
  title={compareLY ? 'Hide Last Year' : 'Compare to Last Year'}
>
  <span>{isLoadingLY ? '⏳' : <CalendarDays size={20} />}</span>
  <span>{isLoadingLY ? 'Loading...' : (compareLY ? 'Hide LY' : 'Compare LY')}</span>
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