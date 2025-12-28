// src/components/StationCompare.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { X, Plus, Search, SatelliteDish } from 'lucide-react';
import { API_URL } from '../config';
import './StationCompare.css';


// Types
interface Station {
  station_id: string;
  display_name: string;
  color: string;
}

interface SearchResult {
  result_type: 'city' | 'zipcode' | 'station';
  display_name: string;
  station_id: string;
  station_name: string | null;
  lat: number;
  lon: number;
  state: string | null;
  population: number | null;
  distance_mi: number | null;
}

interface CompareData {
  metric: string;
  metric_label: string;
  unit: string;
  start_date: string;
  end_date: string;
  stations: Station[];
  data: Array<{ date: string; [key: string]: string | number }>;
}

type MetricType = 'precipitation' | 'snowfall' | 'rainy_days' | 'hot_days' | 'cold_days' | 'very_hot_days' | 'very_cold_days';

interface StationCompareProps {
  darkMode: boolean;
  onClose?: () => void;  // Optional - only show close button if provided
  currentStationId?: string;
  currentStationName?: string;
}

// const ANIMATION_INTERVAL_MS = 25; // 👈 speed control (lower = faster)

const METRICS: { value: MetricType; label: string; icon: string }[] = [
  { value: 'precipitation', label: 'Precipitation', icon: '🌧️' },
  { value: 'snowfall', label: 'Snowfall', icon: '❄️' },
  { value: 'rainy_days', label: 'Rainy Days', icon: '☔' },
  { value: 'hot_days', label: 'Hot Days (90°F+)', icon: '🌡️' },
  { value: 'very_hot_days', label: 'Very Hot Days (100°F+)', icon: '🔥' },
  { value: 'cold_days', label: 'Cold Days (≤32°F)', icon: '🥶' },
  { value: 'very_cold_days', label: 'Very Cold Days (≤0°F)', icon: '🧊' },
];

const COLORS = [
  'rgba(21, 124, 179, 0.9)',  // Blue
  'rgba(223, 189, 37, 1)',  // Red
  'rgba(65, 93, 250, 1)',  // Green
  'rgba(20, 174, 130, 1)',  // Orange
  'rgba(223, 47, 161, 1)',  // Purple
];



export default function StationCompare({ 
  darkMode, 
  onClose, 
  currentStationId,
  currentStationName 
}: StationCompareProps) {
  // Initialize with current station if provided
  const getInitialStations = (): Station[] => {
    if (currentStationId && currentStationName) {
      return [{
        station_id: currentStationId,
        display_name: currentStationName,
        color: COLORS[0]
      }];
    }
    return [];
  };

  const [selectedStations, setSelectedStations] = useState<Station[]>(getInitialStations);
  const [metric, setMetric] = useState<MetricType>('precipitation');
  const [year, setYear] = useState(new Date().getFullYear());
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [_chartReady, setChartReady] = useState(false);
//   const [zoomEnd, setZoomEnd] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<ReactECharts>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

//   useEffect(() => {
//     if (compareData) {
//         updateChartFrame(0);
//     }
//     }, [compareData]);  

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch when year changes (if we have enough stations)
useEffect(() => {
  if (selectedStations.length >= 2 && compareData) {
    fetchCompareData();
  }
}, [year]);  // Only trigger on year change

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - i);


const getYAxisMax = () => {
  if (!compareData) return undefined;

  let max = 0;
  for (const row of compareData.data) {
    for (const s of selectedStations) {
      const v = Number(row[s.station_id]);
      if (!isNaN(v)) max = Math.max(max, v);
    }
  }

  return Math.ceil(max * 1.1 * 10) / 10; // round nicely
};

  // Search for stations
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);

      try {
        const response = await fetch(
          `${API_URL}/api/stations/search?q=${encodeURIComponent(query)}&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          const filtered = data.filter(
            (r: SearchResult) => !selectedStations.some((s) => s.station_id === r.station_id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Add station to comparison
  const handleAddStation = (result: SearchResult) => {
    if (selectedStations.length >= 5) {
      setError('Maximum 5 stations allowed');
      return;
    }

    const newStation: Station = {
      station_id: result.station_id,
      display_name:
        result.result_type === 'city'
          ? result.display_name.split(',')[0]
          : result.station_name || result.station_id,
      color: COLORS[selectedStations.length % COLORS.length],
    };

    setSelectedStations([...selectedStations, newStation]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setCompareData(null);
  };

// Remove station
const handleRemoveStation = (stationId: string) => {
  setSelectedStations(selectedStations.filter((s) => s.station_id !== stationId));
  setCompareData(null);
};

  // Fetch comparison data
  const fetchCompareData = useCallback(async () => {
    if (selectedStations.length < 2) {
      setError('Select at least 2 stations to compare');
      return;
    }

    setIsLoading(true);
    setError(null);
    setControlsCollapsed(true);
    setChartReady(false);


    const stationIds = selectedStations.map((s) => s.station_id).join(',');
    
    // Build date range for full year comparison
    const startDate = `${year}-01-01`;
    const today = new Date();
    const isCurrentYear = year === today.getFullYear();
    // If current year, use today's date; otherwise use Dec 31
    const endDate = isCurrentYear 
      ? today.toISOString().split('T')[0]
      : `${year}-12-31`;

    try {
      const response = await fetch(
        `${API_URL}/api/weather/compare?stations=${stationIds}&metric=${metric}&start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();
      // 1. Calculate the global max for the Y-axis scale immediately

      
      // Update station colors from response
// const updatedStations = selectedStations.map((s, i) => ({
//   ...s,
//   color: COLORS[i % COLORS.length]  // Always use local colors
// }));
      const updatedStations = selectedStations.map((s, i) => ({
        ...s,
        color: data.stations?.find((ds: Station) => ds.station_id === s.station_id)?.color || COLORS[i % COLORS.length]
      }));
      setSelectedStations(updatedStations);
      setCompareData(data);
      setControlsCollapsed(true);
      setChartReady(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStations, metric, year]);



  // Format date for display
  const formatChartDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get chart data (sliced for animation)
  const getChartData = () => {
    if (!compareData) return { dates: [], series: [] };

    const dates = compareData.data.map(d => formatChartDate(d.date));

    const series = selectedStations.map(station => ({
      name: station.display_name,
      data: compareData.data.map(d => d[station.station_id] as number || 0),
      color: station.color
    }));

    return { dates, series };
  };

  // Get current values for ranking
const getCurrentValues = () => {
  if (!compareData || compareData.data.length === 0) return [];
  
  const currentData = compareData.data[compareData.data.length - 1];

  const lineColors = [
    { hex: 'rgba(40, 131, 180, 0.63)', rgb: '40, 131, 180' },    // Orange
    { hex: 'rgba(223, 189, 37, 1)', rgb: '223, 189, 37' },    // Tomato red  
    { hex: 'rgba(226, 111, 4, 1)', rgb: '226, 111, 4' },   // Dodger blue
    { hex: 'rgba(20, 174, 130, 1)', rgb: '20, 174, 130' },    // Lime green
    { hex: 'rgba(137, 60, 199, 1)', rgb: '137, 60, 199' },  // Medium purple
  ];

  // Assign colors by original index BEFORE sorting
  const withColors = selectedStations.map((station, index) => ({
    ...station,
    color: lineColors[index % lineColors.length].hex,
    value: (currentData[station.station_id] as number) || 0,
  }));

  // Sort by value but keep assigned colors
  return withColors.sort((a, b) => b.value - a.value);
};

  // Build ECharts option
const getChartOption = () => {
  const { dates, series } = getChartData();
  
  if (dates.length === 0) return {};

  const option: echarts.EChartsOption = {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    
    title: {
      text: `Cumulative ${compareData?.metric_label || ''} Comparison`,
      subtext: `${year}`,
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
    },

    tooltip: {
      trigger: 'axis',
      backgroundColor: darkMode ? 'rgba(44, 44, 62, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: darkMode ? '#34495e' : '#e0e0e0',
      borderWidth: 1,
      padding: isMobile ? 8 : 15,
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
        if (!Array.isArray(params) || params.length === 0) return '';
        
        let html = `<div style="font-weight: 600; margin-bottom: 8px; font-size: ${isMobile ? '12px' : '14px'};">${params[0].axisValue}</div>`;
        
        const sorted = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));
        
        sorted.forEach((param: any) => {
          const value = param.value !== null && param.value !== undefined ? param.value.toFixed(2) : 'N/A';
          html += `
            <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                <span style="color: ${darkMode ? '#bdc3c7' : '#666'}; font-size: ${isMobile ? '10px' : '12px'};">${param.seriesName}:</span>
              </span>
              <span style="font-weight: 600; margin-left: 12px; color: ${darkMode ? '#ecf0f1' : '#333'};">${value} ${compareData?.unit || ''}</span>
            </div>
          `;
        });
        
        return html;
      }
    },

    legend: {
      data: series.map(s => s.name),
      top: isMobile ? 45 : 45,
      left: 'center',
      itemGap: isMobile ? 12 : 20,
      itemWidth: isMobile ? 15 : 20,
      itemHeight: isMobile ? 8 : 12,
      textStyle: {
        fontSize: isMobile ? 11 : 13,
        color: darkMode ? '#bdc3c7' : '#555'
      },
      type: 'scroll',
    },

    grid: {
      left: isMobile ? 45 : 60,
      right: isMobile ? 45 : 60,
      top: isMobile ? 110 : 100,
      bottom: isMobile ? 90 : 100,
      containLabel: false,
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
          color: darkMode ? '#34495e' : '#e0e0e0'
        }
      },
      axisLabel: {
        color: darkMode ? '#95a5a6' : '#666',
        fontSize: isMobile ? 11 : 12,
        rotate: 45,
      },
      splitLine: {
        show: false
      }
    },

    yAxis: {
      type: 'value',
      name: isMobile ? compareData?.unit : `Cumulative (${compareData?.unit})`,
      nameTextStyle: {
        color: darkMode ? '#95a5a6' : '#666',
        fontSize: isMobile ? 12 : 13,
        fontWeight: 600
      },
      max: getYAxisMax(),
      axisLine: {
        show: true,
        lineStyle: {
          color: darkMode ? '#34495e' : '#e0e0e0'
        }
      },
      axisLabel: {
        color: darkMode ? '#95a5a6' : '#666',
        fontSize: isMobile ? 11 : 12,
        formatter: (value: number) => value.toFixed(1),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: darkMode ? '#2c3e50' : '#f0f0f0'
        }
      }
    },

series: series.map((s, index) => {
  // Define colors as [r, g, b] for flexibility
  const lineColors = [
    { hex: 'rgba(40, 131, 180, 0.63)', rgb: '40, 131, 180' },    // Orange
    { hex: 'rgba(223, 189, 37, 1)', rgb: '223, 189, 37' },    // Tomato red  
    { hex: 'rgba(226, 114, 4, 1)', rgb: '226, 114, 4' },   // Dodger blue
    { hex: 'rgba(20, 174, 130, 1)', rgb: '20, 174, 130' },    // Lime green
    { hex: 'rgba(137, 60, 199, 1)', rgb: '137, 60, 199' },  // Medium purple
  ];
  const colorObj = lineColors[index % lineColors.length];
  
  
  return {
    name: s.name,
    type: 'line' as const,
    data: s.data,
    smooth: true,
    symbol: 'none',
      itemStyle: {
      color: `rgba(${colorObj.rgb}, 0.9)`,
      borderColor: darkMode ? '#1a1a2e' : '#fff',
      borderWidth: 0.5
    },
    lineStyle: {
      width: 3,
      color: colorObj.hex,
      shadowBlur: 8,
      shadowColor: `rgba(${colorObj.rgb}, 0.25)`,
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `rgba(${colorObj.rgb}, 0.2)` },
        { offset: 0.5, color: `rgba(${colorObj.rgb}, 0.1)` },
        { offset: 1, color: `rgba(${colorObj.rgb}, 0.02)` }
      ])
    },
    emphasis: {
      focus: 'series' as const,
      lineStyle: { width: 4 },
    },
    markPoint: {
      data: [
        {
          name: s.name,
          coord: [s.data.length - 1, s.data[s.data.length - 1]],
          label: {
            show: true,
            formatter: () => `${s.data[s.data.length - 1]?.toFixed(2) || '0.00'}`,
            position: 'right' as const,
            offset: [0, -1],
            fontSize: isMobile ? 10 : 12,
            fontWeight: 'bold' as const,
            color: '#ffffffff',
            backgroundColor: colorObj.hex,
            padding: [3, 5],
            borderRadius: 3
          },
          symbolSize: 0
        }
      ]
    },
    z: 10 - index,
  };
}),

    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return option;
};

  return (
    <div className={`station-compare ${darkMode ? 'dark' : ''}`}>
      {/* Header - only show close button if onClose provided */}
      <div className="compare-header">
        <h2><SatelliteDish size={20} /> Station Comparison</h2>
        {onClose && (
          <button className="close-button" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        )}
      </div>

      {/* Controls */}
      {!controlsCollapsed && (
        <div className="compare-controls">
        {/* Selected Stations */}
        <div className="control-row">
          <div className="selected-stations">
            {selectedStations.map((station, index) => (
              <div
                key={station.station_id}
                className="station-chip"
                style={{ borderLeftColor: station.color }}
              >
                <span className="station-number">{index + 1}</span>
                <span className="station-name">{station.display_name}</span>
                <button
                  className="remove-station"
                  onClick={() => handleRemoveStation(station.station_id)}
                  title="Remove station"
                >
                  <X size={14} />
                </button>
                              </div>
                            ))}
                </div>

          {/* Search to add stations */}
          {selectedStations.length < 5 && (
            <div className="station-search" ref={searchRef}>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Add city or station..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                />
              </div>

              {showSearchDropdown && (
                <div className="search-dropdown">
                  {isSearching ? (
                    <div className="search-loading">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <button
                        key={`${result.station_id}-${index}`}
                        className="search-result-item"
                        onClick={() => handleAddStation(result)}
                      >
                        <Plus size={16} className="add-icon" />
                        <div className="result-info">
                          {result.result_type === 'city' || result.result_type === 'zipcode' ? (
                            <>
                              <span className="result-primary">{result.display_name}</span>
                              <span className="result-secondary">
                                Pop. {result.population?.toLocaleString() || 'N/A'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="result-primary">
                                {result.station_name || result.station_id} ({result.station_id})
                              </span>
                              <span className="result-secondary">Weather Station</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="search-no-results">No stations found</div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metric & Year */}
        <div className="control-row">
          <div className="control-section">
            <label>Metric</label>
            <select
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value as MetricType);
                setCompareData(null);
              }}
              className="metric-select"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.icon} {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-section">
            <label>Year</label>
            <select
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                setCompareData(null);
              }}
              className="year-select"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="control-section">
            <label>&nbsp;</label>
            <button
              className="compare-button"
              onClick={fetchCompareData}
              disabled={selectedStations.length < 2 || isLoading}
            >
              {isLoading ? 'Loading...' : 'Compare'}
            </button>        
          </div>
        </div>
      </div>
      )}
{controlsCollapsed && (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  }}>
    <button
      className="edit-inputs-button"
      onClick={() => setControlsCollapsed(false)}
    >
      ✏️ Edit Inputs
    </button>
    
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <label style={{ 
        color: darkMode ? '#bdc3c7' : '#666', 
        fontSize: '14px',
        fontWeight: 500
      }}>
        Year:
      </label>
      <select
        value={year}
        onChange={(e) => setYear(parseInt(e.target.value))}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
          background: darkMode ? '#2a2a4a' : '#fff',
          color: darkMode ? '#eee' : '#333',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
          {/* The ECharts Chart */}
            <div 
              className="chart-wrapper"
              style={{
                width: '100%',
                height: isMobile ? '540px' : '510px',  // Match PrecipitationChart
                background: darkMode ? '#1a1a2e' : '#ffffff',
                borderRadius: isMobile ? '6px' : '12px',
                padding: isMobile ? '5px' : '20px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
            >
            <ReactECharts
              ref={chartRef}
              option={getChartOption()}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>

          {/* Current Values / Leaderboard */}
          <div className="current-values">
            {getCurrentValues().map((station, index) => (
              <div
                key={station.station_id}
                className={`value-card ${index === 0 ? 'leader' : ''}`}
                style={{ borderLeftColor:  station.color }}
              >
                <span className="value-rank">#{index + 1}</span>
                <span className="value-name">{station.display_name}</span>
                <span className="value-amount" style={{ color: station.color }}>
                  {station.value.toFixed(2)} {compareData?.unit || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!compareData && !isLoading && (
        <div className="compare-empty">
          <p>
            {selectedStations.length === 0
              ? 'Search and add stations to compare'
              : selectedStations.length === 1
              ? 'Add at least one more station to compare'
              : 'Select stations and click "Compare" to see the race!'}
          </p>
        </div>
      )}
    </div>
  );
}