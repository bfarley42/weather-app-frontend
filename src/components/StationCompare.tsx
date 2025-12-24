// src/components/StationCompare.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { X, Plus, Search, Play, Pause, RotateCcw } from 'lucide-react';
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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

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
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationIndex, setAnimationIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [showEndLabels, setShowEndLabels] = useState(false);
  const [chartReady, setChartReady] = useState(false);
//   const [zoomEnd, setZoomEnd] = useState(0);

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, []);

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

  // Remove station (but not the primary station)
  const handleRemoveStation = (stationId: string) => {
    // Don't allow removing the primary station
    if (stationId === currentStationId) return;
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
    setAnimationIndex(null);
    setIsPlaying(false);
    setControlsCollapsed(true);
    setChartReady(false);
    setShowEndLabels(false);

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
      const updatedStations = selectedStations.map((s, i) => ({
        ...s,
        color: data.stations?.find((ds: Station) => ds.station_id === s.station_id)?.color || COLORS[i % COLORS.length]
      }));
      setSelectedStations(updatedStations);
      setCompareData(data);
      setAnimationIndex(0); // Initialize at frame 0 immediately
        setControlsCollapsed(true); // Collapse inputs

        // Delay slightly to allow the 'frame 0' render to happen before playing
        setTimeout(() => {
        startAnimation();
        }, 100);

    //   // 🔥 start animated build immediately
    // requestAnimationFrame(() => {
    // startAnimation();
    // });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStations, metric, year]);

    // Animation controls
  const startAnimation = () => {
    setShowEndLabels(false);
    setChartReady(true);
  if (!compareData) return;

  if (animationRef.current) clearInterval(animationRef.current);
    const yMax = getYAxisMax();
    const chart = chartRef.current?.getEchartsInstance();


    if (chart && yMax) {
    chart.setOption({
        yAxis: {
        max: yMax,
        },
    });
    }

  setIsPlaying(true);

  const total = compareData.data.length;
  const durationMs = 8000; // 👈 total animation time (6s feels great)
  const startTime = performance.now();

  animationRef.current = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    
// 1. Use LINEAR timing for smooth "days per second" flow
    // This replaces the complex easeInMidOutFast logic
    const frame = Math.floor(t * (total - 1));

    if (t >= 1) {
      // STOP ANIMATION
      if (animationRef.current) clearInterval(animationRef.current);
      animationRef.current = null;
      setIsPlaying(false);
      
      // CRITICAL FIX: Lock the frame to the very last index
      setAnimationIndex(total - 1);
      
      // Show the final labels
      setShowEndLabels(true);
    } else {
      // Update frame while running
      setAnimationIndex(frame);
    }
  }, 1000 / 60); // Run at ~60fps (approx 16ms)
};


  const pauseAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsPlaying(false);
  };

  const resetAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsPlaying(false);
    setAnimationIndex(null);
  };

  // Format date for display
  const formatChartDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get chart data (sliced for animation)
    const getChartData = () => {
    if (!compareData) return { dates: [], series: [] };

    // CHANGE: Slice data based on animationIndex.
    // If animationIndex is null, default to 0 (start) instead of full length.
    const limit = animationIndex !== null ? animationIndex + 1 : 0;
    
    const slicedData = compareData.data.slice(0, limit);
    const dates = slicedData.map(d => formatChartDate(d.date));

    const series = selectedStations.map(station => ({
        name: station.display_name,
        data: slicedData.map(d => d[station.station_id] as number || 0),
        color: station.color
    }));

    return { dates, series };
    };

  // Get current values for ranking
  const getCurrentValues = () => {
    if (!compareData || compareData.data.length === 0) return [];
    
    const dataIndex = animationIndex !== null ? animationIndex : compareData.data.length - 1;
    const currentData = compareData.data[dataIndex];

    return selectedStations
      .map((station) => ({
        ...station,
        value: (currentData[station.station_id] as number) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Build ECharts option
  const getChartOption = () => {
    const { dates, series } = getChartData();
    
    if (dates.length === 0) return {};

    const option: echarts.EChartsOption = {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      
      title: {
        text: `Cumulative ${compareData?.metric_label || ''} (${year})`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: isMobile ? 15 : 18,
          fontWeight: 700,
          color: darkMode ? '#ecf0f1' : '#2c3e50',
        },
      },

      tooltip: {
        trigger: 'axis',
        backgroundColor: darkMode ? 'rgba(30, 30, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: darkMode ? '#444' : '#ddd',
        textStyle: { color: darkMode ? '#ecf0f1' : '#2c3e50' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          
          // Sort by value descending
          const sorted = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));
          
          sorted.forEach((param: any) => {
            const value = param.value !== null && param.value !== undefined ? param.value.toFixed(2) : 'N/A';
            result += `${param.marker} ${param.seriesName}: ${value} ${compareData?.unit || ''}<br/>`;
          });
          
          return result;
        },
      },

      legend: {
        data: series.map(s => s.name),
        top: isMobile ? 40 : 45,
        left: 'center',
        textStyle: {
          color: darkMode ? '#bdc3c7' : '#555',
          fontSize: isMobile ? 11 : 12,
        },
        type: 'scroll',
        pageButtonItemGap: 5,
        pageButtonGap: 10,
      },

      grid: {
        left: isMobile ? '12%' : '8%',
        right: isMobile ? '10%' : '15%', // Extra space for end labels
        top: isMobile ? 85 : 90,
        bottom: isMobile ? 60 : 70,
        containLabel: false,
      },

       xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: {
          color: darkMode ? '#bdc3c7' : '#666',
          fontSize: isMobile ? 10 : 11,
          rotate: isMobile ? 45 : 0,
          interval: 'auto',
        },
        splitLine: { show: false },
      },

      yAxis: {
        type: 'value',
        name: compareData?.unit || '',
        max: getYAxisMax(),
        nameTextStyle: {
          color: darkMode ? '#bdc3c7' : '#666',
          fontSize: isMobile ? 11 : 12,
          padding: [0, 0, 0, isMobile ? 0 : 40],
        },
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ddd' } },
        axisLabel: {
          color: darkMode ? '#bdc3c7' : '#666',
          fontSize: isMobile ? 10 : 11,
          formatter: (value: number) => value.toFixed(1),
        },
        splitLine: {
          lineStyle: {
            color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            type: 'dashed',
          },
        },
      },

      series: series.map((s, index) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          width: 3,
          color: s.color,
        },
        itemStyle: {
          color: s.color,
        },
        areastyle: undefined,

        emphasis: {
          focus: 'series',
          lineStyle: { width: 4 },
        },
            endLabel: {
            show: showEndLabels, // Controlled by state
            formatter: () => {
                // Get the very last value from the FULL dataset, not just the slice
                const lastValue = s.data[s.data.length - 1] || 0;
                return `${s.name}\n${lastValue.toFixed(2)} ${compareData?.unit}`;
            },
            color: s.color,
            fontSize: 11,
            fontWeight: 600,
            distance: 10,
            },


        // Mark the final point
        markpoint: undefined,
        z: 10 - index, // Layer ordering
      })),

      animation: false,
    };

    return option;
  };

  return (
    <div className={`station-compare ${darkMode ? 'dark' : ''}`}>
      {/* Header - only show close button if onClose provided */}
      <div className="compare-header">
        <h2>📊 Station Comparison Race</h2>
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
                {station.station_id !== currentStationId && (
                  <button
                    className="remove-station"
                    onClick={() => handleRemoveStation(station.station_id)}
                    title="Remove station"
                  >
                    <X size={14} />
                  </button>
                )}
                {station.station_id === currentStationId && (
                  <span className="primary-badge">Primary</span>
                )}
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
        <button
            className="edit-inputs-button"
            onClick={() => setControlsCollapsed(false)}
        >
            ✏️ Edit Inputs
        </button>
        )}

      {/* Error */}
      {error && <div className="compare-error">⚠️ {error}</div>}
      

      {/* Chart */}
      {chartReady && compareData && compareData.data.length > 0 && (
        <div className="compare-chart-container">
          {/* Animation Controls */}
          <div className="animation-controls">
            {!isPlaying ? (
              <button className="animation-button" onClick={startAnimation} title="Play animation">
                <Play size={18} />
              </button>
            ) : (
              <button className="animation-button" onClick={pauseAnimation} title="Pause animation">
                <Pause size={18} />
              </button>
            )}
            <button
              className="animation-button"
              onClick={resetAnimation}
              title="Reset"
              disabled={animationIndex === null}
            >
              <RotateCcw size={18} />
            </button>

            <div className="animation-year">
            <label>Year</label>
            <select
                value={year}
                onChange={(e) => {
                setYear(parseInt(e.target.value));
                setCompareData(null);
                setControlsCollapsed(false);
                }}
            >
                {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
                ))}
            </select>
            </div>


            {animationIndex !== null && compareData.data[animationIndex] && (
              <span className="animation-date">
                {formatChartDate(compareData.data[animationIndex].date as string)}
              </span>
            )}
          </div>

          {/* The ECharts Chart */}
          <div 
            className="chart-wrapper"
            style={{
              width: '100%',
              height: isMobile ? '380px' : '450px',
              background: darkMode ? '#1a1a2e' : '#ffffff',
              borderRadius: isMobile ? '6px' : '12px',
              padding: isMobile ? '5px' : '15px',
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
                style={{ borderLeftColor: station.color }}
              >
                <span className="value-rank">#{index + 1}</span>
                <span className="value-name">{station.display_name}</span>
                <span className="value-amount" style={{ color: station.color }}>
                  {station.value.toFixed(2)} {compareData.unit}
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