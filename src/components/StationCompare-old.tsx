// src/components/StationCompare.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Play, Pause, RotateCcw, X, Plus, Search } from 'lucide-react';
import { API_URL } from '../config';
import './StationCompare.css';
import type { TooltipProps } from 'recharts';


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

type MetricType = 'precipitation' | 'snowfall' | 'rainy_days' | 'hot_days' | 'cold_days';

interface StationCompareProps {
  darkMode: boolean;
  onClose: () => void;
}

const METRICS: { value: MetricType; label: string; icon: string }[] = [
  { value: 'precipitation', label: 'Precipitation', icon: '🌧️' },
  { value: 'snowfall', label: 'Snowfall', icon: '❄️' },
  { value: 'rainy_days', label: 'Rainy Days', icon: '☔' },
  { value: 'hot_days', label: 'Hot Days (90°F+)', icon: '🔥' },
  { value: 'cold_days', label: 'Cold Days (≤32°F)', icon: '🥶' },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

// Helper function - defined outside component
const formatChartDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Custom Tooltip Component - defined outside main component
const ChartTooltip = ({ 
  active, 
  payload, 
  label, 
  darkMode, 
  unit 
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
  darkMode: boolean;
  unit: string;
}) => {
  if (!active || !payload || !payload.length || !label) return null;

  return (
    <div className={`compare-tooltip ${darkMode ? 'dark' : ''}`}>
      <p className="tooltip-date">{formatChartDate(label)}</p>
      {[...payload]
        .sort((a, b) => b.value - a.value)
        .map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(2)} {unit}
          </p>
        ))}
    </div>
  );
};

export default function StationCompare({ darkMode, onClose }: StationCompareProps) {
  // ALL HOOKS - unconditionally at the top
  const [selectedStations, setSelectedStations] = useState<Station[]>([]);
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
  // const [chartWidth, setChartWidth] = useState(800);

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Measure chart container width
  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const newWidth = chartContainerRef.current.offsetWidth - 40;
        // setChartWidth(Math.max(newWidth, 300));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  // Search for stations
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

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

  // Remove station from comparison
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
    setAnimationIndex(null);
    setIsPlaying(false);

    const stationIds = selectedStations.map((s) => s.station_id).join(',');
    const startDate = `${year}-01-01`;
    const endDate =
      year === new Date().getFullYear()
        ? new Date().toISOString().split('T')[0]
        : `${year}-12-31`;

    try {
      const response = await fetch(
        `${API_URL}/api/weather/compare?stations=${stationIds}&metric=${metric}&start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch comparison data');
      }

      const data = await response.json();

      const updatedStations = selectedStations.map((s, i) => ({
        ...s,
        color:
          data.stations.find((ds: Station) => ds.station_id === s.station_id)?.color ||
          COLORS[i],
        display_name:
          data.stations.find((ds: Station) => ds.station_id === s.station_id)?.display_name ||
          s.display_name,
      }));
      setSelectedStations(updatedStations);

      setCompareData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStations, metric, year]);

  // Animation controls
  const startAnimation = () => {
    if (!compareData || compareData.data.length === 0) return;

    setIsPlaying(true);
    setAnimationIndex(0);

    animationRef.current = setInterval(() => {
      setAnimationIndex((prev) => {
        if (prev === null || !compareData || prev >= compareData.data.length - 1) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          setIsPlaying(false);
          return compareData ? compareData.data.length - 1 : 0;
        }
        return prev + 1;
      });
    }, 50);
  };

  const pauseAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    setIsPlaying(false);
  };

  const resetAnimation = () => {
    pauseAnimation();
    setAnimationIndex(null);
  };

  // Get data for chart
  const getChartData = () => {
    if (!compareData) return [];
    if (animationIndex === null) return compareData.data;
    return compareData.data.slice(0, animationIndex + 1);
  };

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Get current values for ranking display
  const getCurrentValues = () => {
    if (!compareData) return [];
    const dataPoint =
      animationIndex !== null
        ? compareData.data[animationIndex]
        : compareData.data[compareData.data.length - 1];

    return selectedStations
      .map((station) => ({
        ...station,
        value: (dataPoint?.[station.station_id] as number) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div className={`station-compare ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="compare-header">
        <h2>📊 Station Comparison</h2>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      {/* Controls */}
      <div className="compare-controls">
        {/* Station Search */}
        <div className="control-section">
          <label>Stations ({selectedStations.length}/5)</label>

          {/* Selected stations */}
          <div className="selected-stations">
            {selectedStations.map((station) => (
              <div
                key={station.station_id}
                className="station-chip"
                style={{ borderColor: station.color }}
              >
                <span
                  className="station-color-dot"
                  style={{ backgroundColor: station.color }}
                />
                <span className="station-chip-name">{station.display_name}</span>
                <button
                  className="remove-station"
                  onClick={() => handleRemoveStation(station.station_id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Search input */}
          {selectedStations.length < 5 && (
            <div className="station-search-container" ref={searchRef}>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                  placeholder="Add a city or station..."
                  className="station-search-input"
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
                          {result.result_type === 'city' ||
                          result.result_type === 'zipcode' ? (
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

      {/* Error */}
      {error && <div className="compare-error">⚠️ {error}</div>}

      {/* The Chart */}
      <div ref={chartContainerRef} className="chart-wrapper">
        <ResponsiveContainer width="100%" aspect={2}>
          <LineChart
            data={getChartData()}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
              tick={{ fontSize: 12 }}
              label={{
                value: compareData?.unit || '',
                angle: -90,
                position: 'insideLeft',
                style: { fill: darkMode ? '#9ca3af' : '#6b7280' },
              }}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as any}
                  label={props.label as string}
                  darkMode={darkMode}
                  unit={compareData?.unit || ''}
                />
              )}
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value: string) => (
                <span style={{ color: darkMode ? '#e5e7eb' : '#374151' }}>{value}</span>
              )}
            />
            {selectedStations.map((station) => (
              <Line
                key={station.station_id}
                type="monotone"
                dataKey={station.station_id}
                name={station.display_name}
                stroke={station.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
            {animationIndex !== null && compareData?.data[animationIndex] && (
              <ReferenceLine
                x={compareData.data[animationIndex].date}
                stroke={darkMode ? '#6b7280' : '#9ca3af'}
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

          {/* Current Values */}
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
          <p>Select 2-5 stations and click "Compare" to see the race!</p>
        </div>
      )}
//     </div>
//   );
// }