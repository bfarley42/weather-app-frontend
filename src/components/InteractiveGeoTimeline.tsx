// src/components/InteractiveGeoTimeline.tsx
/**
 * Interactive Geographic Timeline Visualization
 * - Edit Mode: Drag stations to position them on the map
 * - Animation Mode: Watch bars grow from each station over time
 * - No echarts-gl required - pure ECharts v6
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { API_URL } from '../config';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface StationData {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  daily_values: DailyValue[];
  position?: [number, number]; // User-defined position on map
}

interface DailyValue {
  obs_date: string;
  value: number;
}

interface InteractiveGeoTimelineProps {
  region: 'michigan' | 'alaska' | 'all';
  metric: 'snow' | 'rain' | 'hot_days' | 'freeze_days';
  startDate: string;
  endDate: string;
  stationIds: string[];
  darkMode?: boolean;
  onStationsPositioned?: (positions: Record<string, [number, number]>) => void;
}

type ChartMode = 'edit' | 'animate';

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function InteractiveGeoTimeline({
  region,
  metric,
  startDate,
  endDate,
  stationIds,
  darkMode = false,
  onStationsPositioned
}: InteractiveGeoTimelineProps) {
  const [mode, setMode] = useState<ChartMode>('edit');
  const [stationData, setStationData] = useState<StationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [_chartInstance, setChartInstance] = useState<any>(null);

  // Storage key for saved positions
  const STORAGE_KEY = `geo-timeline-positions-${region}`;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // =====================================================
  // FETCH DATA
  // =====================================================

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const promises = stationIds.map(async (stationId) => {
          const stationResponse = await fetch(`${API_URL}/api/stations/${stationId}`);
          const stationInfo = await stationResponse.json();

          const weatherResponse = await fetch(
            `${API_URL}/api/weather/daily?station=${stationId}&start=${startDate}&end=${endDate}`
          );
          const weatherData = await weatherResponse.json();

          const daily_values = weatherData.map((d: any) => ({
            obs_date: d.obs_date,
            value: getMetricValue(d, metric)
          }));

          return {
            station_id: stationId,
            name: stationInfo.name,
            lat: stationInfo.lat,
            lon: stationInfo.lon,
            daily_values,
            position: undefined // Will be set from saved positions or auto-calculated
          };
        });

        const data = await Promise.all(promises);
        
        // Load saved positions or calculate initial positions
        const savedPositions = loadSavedPositions();
        const dataWithPositions = data.map(station => ({
          ...station,
          position: savedPositions[station.station_id] || calculateInitialPosition(station, data)
        }));

        setStationData(dataWithPositions);
      } catch (error) {
        console.error('Error fetching geo timeline data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (stationIds.length > 0) {
      fetchData();
    }
  }, [stationIds, startDate, endDate, metric]);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const getMetricValue = (dailyData: any, metric: string): number => {
    switch (metric) {
      case 'snow':
        return dailyData.snow_in || 0;
      case 'rain':
        return dailyData.prcp_in || 0;
      case 'hot_days':
        return (dailyData.tmax_f && dailyData.tmax_f >= 90) ? 1 : 0;
      case 'freeze_days':
        return (dailyData.tmin_f && dailyData.tmin_f <= 32) ? 1 : 0;
      default:
        return 0;
    }
  };

  const getMetricLabel = (metric: string): string => {
    switch (metric) {
      case 'snow': return 'Snow Accumulation';
      case 'rain': return 'Rain Accumulation';
      case 'hot_days': return '90°+ Days';
      case 'freeze_days': return 'Freeze Days';
      default: return 'Accumulation';
    }
  };

  const getMetricUnit = (metric: string): string => {
    switch (metric) {
      case 'snow': return 'in';
      case 'rain': return 'in';
      case 'hot_days': return 'days';
      case 'freeze_days': return 'days';
      default: return '';
    }
  };

  const shortenStationName = (name: string): string => {
    if (!name) return '';
    return name
      .replace(/INTERNATIONAL/g, 'INTL')
      .replace(/AIRPORT/g, 'AP')
      .replace(/CENTER/g, 'CTR');
  };

  // Calculate initial position based on lat/lon with some spacing
  const calculateInitialPosition = (station: StationData, _allStations: StationData[]): [number, number] => {
    // For Michigan: lon range ~[-90, -83], lat range ~[42, 47]
    // Add some random offset to prevent exact overlaps
    const randomOffset = () => (Math.random() - 0.5) * 0.5;
    return [station.lon + randomOffset(), station.lat + randomOffset()];
  };

  // Load saved positions from localStorage
  const loadSavedPositions = (): Record<string, [number, number]> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  // Save positions to localStorage
  const savePositions = useCallback((positions: Record<string, [number, number]>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      onStationsPositioned?.(positions);
    } catch (error) {
      console.error('Failed to save positions:', error);
    }
  }, [STORAGE_KEY, onStationsPositioned]);

  // Handle station drag
  const handleStationDrag = useCallback((params: any) => {
    if (!params || !params.data) return;

    const stationId = params.data.station_id;
    const newPosition: [number, number] = [params.data.value[0], params.data.value[1]];

    // Update station data
    setStationData(prev => {
      const updated = prev.map(s => 
        s.station_id === stationId 
          ? { ...s, position: newPosition }
          : s
      );

      // Save to localStorage
      const positions: Record<string, [number, number]> = {};
      updated.forEach(s => {
        if (s.position) {
          positions[s.station_id] = s.position;
        }
      });
      savePositions(positions);

      return updated;
    });
  }, [savePositions]);

  // Reset positions to initial lat/lon
  const handleResetPositions = () => {
    setStationData(prev => prev.map(station => ({
      ...station,
      position: calculateInitialPosition(station, prev)
    })));
    localStorage.removeItem(STORAGE_KEY);
  };

  // Auto-arrange stations in a grid
  const handleAutoArrange = () => {
    // Get map bounds for Michigan
    const minLon = -90.4;
    const maxLon = -82.4;
    const minLat = 41.7;
    const maxLat = 48.3;

    const numStations = stationData.length;
    const cols = Math.ceil(Math.sqrt(numStations));
    const rows = Math.ceil(numStations / cols);

    const lonStep = (maxLon - minLon) / (cols + 1);
    const latStep = (maxLat - minLat) / (rows + 1);

    const newPositions: Record<string, [number, number]> = {};
    
    stationData.forEach((station, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const lon = minLon + (col + 1) * lonStep;
      const lat = minLat + (row + 1) * latStep;
      newPositions[station.station_id] = [lon, lat];
    });

    setStationData(prev => prev.map(station => ({
      ...station,
      position: newPositions[station.station_id]
    })));

    savePositions(newPositions);
  };

  // =====================================================
  // CALCULATE CUMULATIVE VALUES
  // =====================================================

  const dateRange = useMemo(() => {
    if (stationData.length === 0) return [];
    return stationData[0].daily_values.map(d => d.obs_date);
  }, [stationData]);

  const cumulativeData = useMemo(() => {
    return stationData.map(station => {
      let cumulative = 0;
      const cumValues = station.daily_values.map(day => {
        cumulative += day.value;
        return cumulative;
      });
      return {
        ...station,
        cumulative_values: cumValues
      };
    });
  }, [stationData]);

  const maxCumulativeValue = useMemo(() => {
    if (cumulativeData.length === 0) return 0;
    return Math.max(...cumulativeData.flatMap(s => s.cumulative_values));
  }, [cumulativeData]);

  // =====================================================
  // CHART OPTIONS
  // =====================================================

  const chartOption = useMemo(() => {
    if (cumulativeData.length === 0) return {};

    const baseOption = {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      
      title: {
        text: mode === 'edit' 
          ? `Position Your Stations - ${getMetricLabel(metric)}`
          : `${getMetricLabel(metric)} - ${region.toUpperCase()}`,
        subtext: mode === 'edit'
          ? 'Drag stations to position them, then click "Start Animation"'
          : dateRange[currentDateIndex] 
            ? new Date(dateRange[currentDateIndex]).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })
            : '',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: isMobile ? 14 : 18,
          fontWeight: 700,
          color: darkMode ? '#ecf0f1' : '#2c3e50'
        },
        subtextStyle: {
          fontSize: isMobile ? 11 : 13,
          color: darkMode ? '#95a5a6' : '#7f8c8d',
          fontWeight: 500
        }
      },

      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (!params.data) return '';
          
          if (mode === 'edit') {
            return `<strong>${shortenStationName(params.data.name)}</strong><br/>Drag to reposition`;
          } else {
            const value = params.data.value[2];
            return `
              <strong>${shortenStationName(params.data.name)}</strong><br/>
              ${getMetricLabel(metric)}: ${value.toFixed(2)} ${getMetricUnit(metric)}
            `;
          }
        },
        backgroundColor: darkMode ? 'rgba(50, 50, 70, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: darkMode ? '#667eea' : '#ccc',
        textStyle: {
          color: darkMode ? '#ecf0f1' : '#333'
        }
      },

      geo: {
        map: region,
        roam: mode === 'edit', // Allow pan/zoom in edit mode
        itemStyle: {
          areaColor: darkMode ? '#2c3e50' : '#e8f4f8',
          borderColor: darkMode ? '#34495e' : '#95a5a6',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            areaColor: darkMode ? '#34495e' : '#d4e6f1'
          }
        },
        // Reserve space at top for bars
        top: '15%',
        bottom: '20%',
        left: '10%',
        right: '10%'
      }
    };

    if (mode === 'edit') {
      // EDIT MODE: Draggable station markers
      return {
        ...baseOption,
        series: [{
          type: 'scatter',
          coordinateSystem: 'geo',
          data: cumulativeData.map(station => ({
            name: station.name,
            station_id: station.station_id,
            value: station.position || [station.lon, station.lat],
            symbolSize: isMobile ? 40 : 50,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]),
              borderColor: darkMode ? '#fff' : '#333',
              borderWidth: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          })),
          symbolSize: isMobile ? 40 : 50,
          label: {
            show: true,
            position: 'bottom',
            formatter: (params: any) => shortenStationName(params.data.name),
            fontSize: isMobile ? 10 : 12,
            fontWeight: 600,
            color: darkMode ? '#ecf0f1' : '#2c3e50',
            backgroundColor: darkMode ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            padding: [2, 6],
            borderRadius: 3
          },
          emphasis: {
            scale: 1.2,
            itemStyle: {
              borderWidth: 3,
              shadowBlur: 20
            }
          }
        }]
      };
    } else {
      // ANIMATION MODE: Growing bars from stations
      const currentData = cumulativeData.map(station => {
        const cumValue = station.cumulative_values[currentDateIndex] || 0;
        const position = station.position || [station.lon, station.lat];
        
        // Calculate bar height as percentage of max
        const heightPercent = maxCumulativeValue > 0 
          ? (cumValue / maxCumulativeValue) * 100 
          : 0;

        return {
          name: station.name,
          station_id: station.station_id,
          value: [...position, cumValue],
          barHeight: heightPercent
        };
      });

      return {
        ...baseOption,
        series: [
          // Station markers (small)
          {
            type: 'scatter',
            coordinateSystem: 'geo',
            data: currentData.map(d => ({
              value: [d.value[0], d.value[1]],
              name: d.name
            })),
            symbolSize: isMobile ? 8 : 10,
            itemStyle: {
              color: darkMode ? '#fff' : '#333',
              borderColor: darkMode ? '#667eea' : '#764ba2',
              borderWidth: 2
            },
            z: 10
          },
          // Growing bars using custom SVG
          {
            type: 'custom',
            coordinateSystem: 'geo',
            renderItem: (params: any, api: any) => {
              const point = api.coord([
                currentData[params.dataIndex].value[0],
                currentData[params.dataIndex].value[1]
              ]);
              
              const barHeight = currentData[params.dataIndex].barHeight;
              const barWidth = isMobile ? 15 : 25;
              const maxBarPixelHeight = params.coordSys.height * 0.4; // Max 40% of chart height
              const actualHeight = (barHeight / 100) * maxBarPixelHeight;

              return {
                type: 'rect',
                shape: {
                  x: point[0] - barWidth / 2,
                  y: point[1] - actualHeight,
                  width: barWidth,
                  height: actualHeight
                },
                style: {
                  fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { 
                      offset: 0, 
                      color: metric === 'snow' 
                        ? (darkMode ? '#66b3ff' : '#4da6ff') 
                        : (darkMode ? '#667eea' : '#5568d3')
                    },
                    { 
                      offset: 1, 
                      color: metric === 'snow'
                        ? (darkMode ? '#0066cc' : '#0052a3')
                        : (darkMode ? '#764ba2' : '#633b8c')
                    }
                  ]),
                  shadowBlur: 8,
                  shadowColor: 'rgba(0, 0, 0, 0.3)',
                  shadowOffsetX: 2,
                  shadowOffsetY: 2
                }
              };
            },
            data: currentData,
            z: 5,
            animation: true,
            animationDuration: 300
          },
          // Value labels on top of bars
          {
            type: 'custom',
            coordinateSystem: 'geo',
            renderItem: (params: any, api: any) => {
              const point = api.coord([
                currentData[params.dataIndex].value[0],
                currentData[params.dataIndex].value[1]
              ]);
              
              const barHeight = currentData[params.dataIndex].barHeight;
              const maxBarPixelHeight = params.coordSys.height * 0.4;
              const actualHeight = (barHeight / 100) * maxBarPixelHeight;
              const value = currentData[params.dataIndex].value[2];

              if (value === 0) return null;

              return {
                type: 'text',
                style: {
                  text: value.toFixed(1),
                  x: point[0],
                  y: point[1] - actualHeight - 10,
                  textAlign: 'center',
                  fontSize: isMobile ? 10 : 12,
                  fontWeight: 'bold',
                  fill: darkMode ? '#ecf0f1' : '#2c3e50',
                  textBackgroundColor: darkMode ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  textBorderRadius: 3,
                  textPadding: [2, 6]
                }
              };
            },
            data: currentData,
            z: 15,
            silent: true
          },
          // Station name labels
          {
            type: 'custom',
            coordinateSystem: 'geo',
            renderItem: (params: any, api: any) => {
              const point = api.coord([
                currentData[params.dataIndex].value[0],
                currentData[params.dataIndex].value[1]
              ]);

              return {
                type: 'text',
                style: {
                  text: shortenStationName(currentData[params.dataIndex].name),
                  x: point[0],
                  y: point[1] + 15,
                  textAlign: 'center',
                  fontSize: isMobile ? 9 : 11,
                  fontWeight: 600,
                  fill: darkMode ? '#95a5a6' : '#666',
                  textBackgroundColor: darkMode ? 'rgba(26, 26, 46, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  textBorderRadius: 3,
                  textPadding: [1, 4]
                }
              };
            },
            data: currentData,
            z: 15,
            silent: true
          }
        ]
      };
    }
  }, [cumulativeData, mode, currentDateIndex, darkMode, isMobile, metric, region, dateRange, maxCumulativeValue]);

  // =====================================================
  // REGISTER MICHIGAN MAP
  // =====================================================

  useEffect(() => {
    if (region === 'michigan') {
      fetch('/geojson/michigan.json')
        .then(res => res.json())
        .then(data => {
          echarts.registerMap('michigan', data);
        })
        .catch(err => console.error('Failed to load Michigan map:', err));
    }
  }, [region]);

  // =====================================================
  // TIMELINE ANIMATION
  // =====================================================

  useEffect(() => {
    // let interval: NodeJS.Timeout;
    let interval: number;
    if (isPlaying && mode === 'animate' && currentDateIndex < dateRange.length - 1) {
      interval = setInterval(() => {
        setCurrentDateIndex(prev => {
          if (prev >= dateRange.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentDateIndex, dateRange.length, mode]);

  const handlePlayPause = () => {
    if (currentDateIndex >= dateRange.length - 1) {
      setCurrentDateIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDateIndex(parseInt(e.target.value));
    setIsPlaying(false);
  };

  const handleModeSwitch = () => {
    if (mode === 'edit') {
      setMode('animate');
      setCurrentDateIndex(0);
      setIsPlaying(false);
    } else {
      setMode('edit');
      setIsPlaying(false);
    }
  };

  // Handle chart events
  const onChartReady = (chart: any) => {
    setChartInstance(chart);
    
    if (mode === 'edit') {
      // Listen for drag events
      chart.on('dataZoom', handleStationDrag);
    }
  };

  const onEvents = useMemo(() => ({
    'mousemove': (params: any) => {
      if (mode === 'edit' && params.componentType === 'series' && params.seriesType === 'scatter') {
        handleStationDrag(params);
      }
    }
  }), [mode, handleStationDrag]);

  // =====================================================
  // RENDER
  // =====================================================

  if (isLoading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: darkMode ? '#ecf0f1' : '#666' 
      }}>
        Loading station data...
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      background: darkMode ? '#1a1a2e' : '#f8f9fa',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Mode Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleModeSwitch}
            style={{
              padding: '10px 20px',
              background: mode === 'edit'
                ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: isMobile ? '13px' : '14px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {mode === 'edit' ? '▶ Start Animation' : '✏️ Edit Positions'}
          </button>

          {mode === 'edit' && (
            <>
              <button
                onClick={handleAutoArrange}
                style={{
                  padding: '10px 20px',
                  background: darkMode ? 'rgba(52, 152, 219, 0.2)' : 'rgba(52, 152, 219, 0.1)',
                  color: darkMode ? '#3498db' : '#2980b9',
                  border: `2px solid ${darkMode ? '#3498db' : '#2980b9'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: isMobile ? '13px' : '14px'
                }}
              >
                📐 Auto-Arrange
              </button>

              <button
                onClick={handleResetPositions}
                style={{
                  padding: '10px 20px',
                  background: darkMode ? 'rgba(231, 76, 60, 0.2)' : 'rgba(231, 76, 60, 0.1)',
                  color: darkMode ? '#e74c3c' : '#c0392b',
                  border: `2px solid ${darkMode ? '#e74c3c' : '#c0392b'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: isMobile ? '13px' : '14px'
                }}
              >
                🔄 Reset
              </button>
            </>
          )}
        </div>

        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: darkMode ? '#95a5a6' : '#7f8c8d',
          fontWeight: 500
        }}>
          {mode === 'edit' 
            ? `${stationData.length} stations • Drag to position`
            : `Animating ${stationData.length} stations`
          }
        </div>
      </div>

      {/* Chart */}
      <div style={{ 
        width: '100%', 
        height: isMobile ? '500px' : '600px',
        background: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <ReactECharts
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onChartReady={onChartReady}
          onEvents={onEvents}
        />
      </div>

      {/* Timeline Controls (only in animation mode) */}
      {mode === 'animate' && (
        <div style={{ 
          marginTop: '20px',
          padding: '20px',
          background: darkMode ? 'rgba(52, 73, 94, 0.3)' : 'rgba(0, 0, 0, 0.04)',
          borderRadius: '8px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            marginBottom: '15px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handlePlayPause}
              style={{
                padding: '12px 24px',
                background: isPlaying 
                  ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                minWidth: '100px'
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <div style={{ 
              fontSize: '14px', 
              fontWeight: 600,
              color: darkMode ? '#ecf0f1' : '#2c3e50',
              minWidth: '150px'
            }}>
              {dateRange[currentDateIndex] 
                ? new Date(dateRange[currentDateIndex]).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : ''}
            </div>

            <div style={{
              flex: 1,
              fontSize: '13px',
              color: darkMode ? '#95a5a6' : '#7f8c8d',
              textAlign: 'right'
            }}>
              Day {currentDateIndex + 1} of {dateRange.length}
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={dateRange.length - 1}
            value={currentDateIndex}
            onChange={handleSliderChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              outline: 'none',
              background: `linear-gradient(to right, 
                #667eea 0%, 
                #667eea ${(currentDateIndex / (dateRange.length - 1)) * 100}%, 
                ${darkMode ? '#34495e' : '#ddd'} ${(currentDateIndex / (dateRange.length - 1)) * 100}%, 
                ${darkMode ? '#34495e' : '#ddd'} 100%)`,
              cursor: 'pointer'
            }}
          />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '12px',
            color: darkMode ? '#95a5a6' : '#666'
          }}>
            <span>{dateRange[0] ? new Date(dateRange[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <span>{dateRange[dateRange.length - 1] ? new Date(dateRange[dateRange.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {mode === 'edit' && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: darkMode ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.08)',
          borderLeft: `4px solid ${darkMode ? '#3498db' : '#2980b9'}`,
          borderRadius: '4px',
          fontSize: isMobile ? '12px' : '13px',
          color: darkMode ? '#ecf0f1' : '#2c3e50'
        }}>
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Drag station markers to position them on the map</li>
            <li>Space them out so bars don't overlap during animation</li>
            <li>Use "Auto-Arrange" for a quick grid layout</li>
            <li>Your positions are saved automatically</li>
            <li>Click "Start Animation" when ready!</li>
          </ul>
        </div>
      )}
    </div>
  );
}