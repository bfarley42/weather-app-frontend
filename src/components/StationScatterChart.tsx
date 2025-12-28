import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { API_URL } from '../config';
import './StationScatterChart.css';

// --- Types ---
interface StationMetrics {
  station_id: string;
  name: string;
  state: string;
  elevation: number;
  latitude: number;
  longitude: number;
  years_of_data: number;
  
  // Temperature metrics
  avg_annual_temp: number | null;
  avg_summer_high: number | null;
  avg_winter_low: number | null;
  temp_range: number | null;
  temp_trend_per_decade: number | null;
  heating_degree_days: number | null;
  cooling_degree_days: number | null;
  days_above_90: number | null;
  days_below_32: number | null;
  
  // Precipitation metrics
  annual_precip: number | null;
  annual_snow: number | null;
  precip_trend_per_decade: number | null;
  wettest_month_avg: number | null;
  driest_month_avg: number | null;
  rain_days_per_year: number | null;
}

interface AxisOption {
  value: keyof StationMetrics;
  label: string;
  unit: string;
  category: 'temperature' | 'precipitation' | 'location';
  description?: string;
}

interface StationScatterChartProps {
  darkMode?: boolean;
}

// --- Axis Options Configuration ---
const AXIS_OPTIONS: AxisOption[] = [
  // Temperature
  { value: 'avg_annual_temp', label: 'Avg Annual Temp', unit: '°F', category: 'temperature', description: 'Mean of daily avg temps' },
  { value: 'avg_summer_high', label: 'Avg Summer High', unit: '°F', category: 'temperature', description: 'Jun-Aug avg daily high' },
  { value: 'avg_winter_low', label: 'Avg Winter Low', unit: '°F', category: 'temperature', description: 'Dec-Feb avg daily low' },
  { value: 'temp_range', label: 'Annual Temp Range', unit: '°F', category: 'temperature', description: 'Hottest month avg - coldest month avg' },
  { value: 'temp_trend_per_decade', label: 'Temp Trend (30yr)', unit: '°F/decade', category: 'temperature', description: 'Linear warming/cooling rate' },
  { value: 'heating_degree_days', label: 'Heating Degree Days', unit: 'HDD', category: 'temperature', description: 'Annual HDD (base 65°F)' },
  { value: 'cooling_degree_days', label: 'Cooling Degree Days', unit: 'CDD', category: 'temperature', description: 'Annual CDD (base 65°F)' },
  { value: 'days_above_90', label: 'Days Above 90°F', unit: 'days/yr', category: 'temperature', description: 'Annual avg of 90°F+ days' },
  { value: 'days_below_32', label: 'Days Below 32°F', unit: 'days/yr', category: 'temperature', description: 'Annual avg of freezing days' },
  
  // Precipitation
  { value: 'annual_precip', label: 'Annual Precipitation', unit: 'in', category: 'precipitation', description: 'Total yearly precipitation' },
  { value: 'annual_snow', label: 'Annual Snowfall', unit: 'in', category: 'precipitation', description: 'Total yearly snowfall' },
  { value: 'precip_trend_per_decade', label: 'Precip Trend (30yr)', unit: 'in/decade', category: 'precipitation', description: 'Linear precip change rate' },
  { value: 'wettest_month_avg', label: 'Wettest Month', unit: 'in', category: 'precipitation', description: 'Avg precip in wettest month' },
  { value: 'driest_month_avg', label: 'Driest Month', unit: 'in', category: 'precipitation', description: 'Avg precip in driest month' },
  { value: 'rain_days_per_year', label: 'Rain Days', unit: 'days/yr', category: 'precipitation', description: 'Days with ≥0.01" precip' },
  
  // Location/Physical
  { value: 'elevation', label: 'Elevation', unit: 'ft', category: 'location' },
  { value: 'latitude', label: 'Latitude', unit: '°N', category: 'location' },
];

const REGIONS = [
  { value: 'all', label: 'All Regions', states: [] as string[] },
  { value: 'alaska', label: 'Alaska', states: ['AK'] },
  { value: 'west_coast', label: 'West Coast', states: ['WA', 'OR', 'CA'] },
  { value: 'mountain', label: 'Mountain West', states: ['MT', 'ID', 'WY', 'CO', 'UT', 'NV', 'AZ', 'NM'] },
  { value: 'plains', label: 'Great Plains', states: ['ND', 'SD', 'NE', 'KS', 'OK', 'TX'] },
  { value: 'midwest', label: 'Midwest', states: ['MN', 'IA', 'MO', 'WI', 'IL', 'IN', 'OH', 'MI'] },
  { value: 'south', label: 'South', states: ['AR', 'LA', 'MS', 'AL', 'TN', 'KY'] },
  { value: 'southeast', label: 'Southeast', states: ['FL', 'GA', 'SC', 'NC', 'VA', 'WV'] },
  { value: 'northeast', label: 'Northeast', states: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD'] },
];

// Color schemes for different metric types
const getColorForValue = (value: number, metric: string): string => {
  // Temperature trend: red = warming, blue = cooling
  if (metric.includes('trend')) {
    if (value > 1) return '#c0392b';
    if (value > 0.5) return '#e74c3c';
    if (value > 0) return '#f39c12';
    if (value > -0.5) return '#3498db';
    return '#2980b9';
  }
  
  // Temperature: warm colors
  if (metric.includes('temp') || metric.includes('summer') || metric.includes('winter') || 
      metric.includes('days_above') || metric.includes('cooling_degree')) {
    if (value > 80) return '#c0392b';
    if (value > 60) return '#e74c3c';
    if (value > 40) return '#f39c12';
    if (value > 20) return '#3498db';
    return '#2980b9';
  }
  
  // Precipitation: blue shades
  if (metric.includes('precip') || metric.includes('rain') || metric.includes('snow')) {
    if (value > 60) return '#1a5276';
    if (value > 40) return '#2980b9';
    if (value > 20) return '#3498db';
    if (value > 10) return '#85c1e9';
    return '#d5dbdb';
  }
  
  // Default gradient
  return '#7f8c8d';
};

export default function StationScatterChart({ darkMode = false }: StationScatterChartProps) {
  // Data state
  const [data, setData] = useState<StationMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Axis selections
  const [xAxis, setXAxis] = useState<keyof StationMetrics>('avg_annual_temp');
  const [yAxis, setYAxis] = useState<keyof StationMetrics>('temp_trend_per_decade');
  const [colorBy, setColorBy] = useState<'yAxis' | 'state' | 'elevation'>('yAxis');
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 15000]);
  const [minYearsData, setMinYearsData] = useState(15);
  
  // UI state
  const [selectedStation, setSelectedStation] = useState<StationMetrics | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(true);
  const chartRef = useRef<ReactECharts>(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          min_years: minYearsData.toString(),
        });
        
        if (selectedRegion !== 'all') {
          const region = REGIONS.find(r => r.value === selectedRegion);
          if (region?.states.length) {
            params.append('states', region.states.join(','));
          }
        }
        
        if (elevationRange[0] > 0) {
          params.append('min_elevation', elevationRange[0].toString());
        }
        if (elevationRange[1] < 15000) {
          params.append('max_elevation', elevationRange[1].toString());
        }
        
        const response = await fetch(`${API_URL}/api/station-metrics?${params}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const result = await response.json();
        setData(result.stations || []);
      } catch (err) {
        console.error('API Error:', err);
        setError('Using sample data - API unavailable');
        setData(generateMockData());
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRegion, minYearsData, elevationRange]);

  // --- Mobile Detection ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Filter Data ---
  const filteredData = useMemo(() => {
    return data.filter(station => {
      // Must have valid data for selected axes
      const xValue = station[xAxis];
      const yValue = station[yAxis];
      if (xValue === null || yValue === null || xValue === undefined || yValue === undefined) {
        return false;
      }
      return true;
    });
  }, [data, xAxis, yAxis]);

  // --- Get axis info ---
  const xAxisInfo = AXIS_OPTIONS.find(o => o.value === xAxis) || AXIS_OPTIONS[0];
  const yAxisInfo = AXIS_OPTIONS.find(o => o.value === yAxis) || AXIS_OPTIONS[4];

  // --- Point Color Function ---
  const getPointColor = useCallback((station: StationMetrics) => {
    if (colorBy === 'state') {
      const stateColors: Record<string, string> = {
        'AK': '#1abc9c', 'WA': '#2ecc71', 'OR': '#27ae60', 'CA': '#9b59b6',
        'AZ': '#e74c3c', 'NV': '#e67e22', 'ID': '#f1c40f', 'MT': '#16a085',
        'WY': '#1abc9c', 'CO': '#3498db', 'UT': '#8e44ad', 'NM': '#c0392b',
        'TX': '#d35400', 'OK': '#f39c12', 'KS': '#27ae60', 'NE': '#2ecc71',
        'SD': '#3498db', 'ND': '#2980b9', 'MN': '#8e44ad', 'IA': '#9b59b6',
        'MO': '#e74c3c', 'AR': '#c0392b', 'LA': '#d35400', 'WI': '#16a085',
        'IL': '#1abc9c', 'MI': '#2ecc71', 'IN': '#27ae60', 'OH': '#3498db',
        'KY': '#e67e22', 'TN': '#f39c12', 'MS': '#9b59b6', 'AL': '#8e44ad',
        'FL': '#e74c3c', 'GA': '#c0392b', 'SC': '#d35400', 'NC': '#f1c40f',
        'VA': '#27ae60', 'WV': '#2ecc71', 'MD': '#3498db', 'DE': '#2980b9',
        'PA': '#8e44ad', 'NJ': '#9b59b6', 'NY': '#1abc9c', 'CT': '#16a085',
        'RI': '#2ecc71', 'MA': '#27ae60', 'VT': '#3498db', 'NH': '#2980b9',
        'ME': '#8e44ad', 'HI': '#e74c3c'
      };
      return stateColors[station.state] || '#95a5a6';
    }
    
    if (colorBy === 'elevation') {
      const elev = station.elevation;
      if (elev > 8000) return '#2c3e50';
      if (elev > 5000) return '#7f8c8d';
      if (elev > 3000) return '#95a5a6';
      if (elev > 1000) return '#bdc3c7';
      return '#ecf0f1';
    }
    
    // Color by Y-axis value
    const yValue = station[yAxis] as number;
    return getColorForValue(yValue, yAxis as string);
  }, [colorBy, yAxis]);

  // --- Virtual Voronoi Click Handler ---
  const handleZrClick = useCallback((params: any) => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (!chartInstance || !params) return;

    const pointInPixel = [params.offsetX, params.offsetY];
    const option = chartInstance.getOption() as any;
    const seriesData = option.series[0]?.data || [];
    
    let minDistance = Infinity;
    let nearestIndex = -1;

    for (let i = 0; i < seriesData.length; i++) {
      const pixelPoint = chartInstance.convertToPixel({ seriesIndex: 0 }, [seriesData[i][0], seriesData[i][1]]);
      if (pixelPoint) {
        const dx = pointInPixel[0] - pixelPoint[0];
        const dy = pointInPixel[1] - pixelPoint[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
    }

    if (nearestIndex !== -1 && minDistance < 50) {
      const foundItem = seriesData[nearestIndex][2];
      setSelectedStation(foundItem);
      
      chartInstance.dispatchAction({
        type: 'highlight',
        seriesIndex: 0,
        dataIndex: nearestIndex
      });
    } else {
      setSelectedStation(null);
      chartInstance.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    }
  }, []);

  // --- Chart Configuration ---
  const option = useMemo(() => {
    const scatterData = filteredData.map(item => [
      item[xAxis],
      item[yAxis],
      item // Store full object for retrieval
    ]);

    return {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      grid: {
        top: 60,
        right: 30,
        bottom: 60,
        left: 70,
        containLabel: true
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'filter' },
        { type: 'inside', yAxisIndex: 0, filterMode: 'empty' }
      ],
      xAxis: {
        type: 'value',
        name: `${xAxisInfo.label} (${xAxisInfo.unit})`,
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { 
          color: darkMode ? '#aaa' : '#555',
          fontSize: 13,
          fontWeight: 500
        },
        scale: true,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ccc' } },
        axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 11 },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } }
      },
      yAxis: {
        type: 'value',
        name: `${yAxisInfo.label} (${yAxisInfo.unit})`,
        nameLocation: 'middle',
        nameGap: 55,
        nameTextStyle: { 
          color: darkMode ? '#aaa' : '#555',
          fontSize: 13,
          fontWeight: 500
        },
        scale: true,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ccc' } },
        axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const station = params.value[2] as StationMetrics;
          const xVal = params.value[0];
          const yVal = params.value[1];
          return `
            <div style="font-weight:600; margin-bottom:4px">${station.name}</div>
            <div style="color:#888; font-size:11px; margin-bottom:6px">
              ${station.state} • ${station.elevation.toLocaleString()} ft • ${station.years_of_data} years
            </div>
            <div style="font-size:12px">
              <b>${xAxisInfo.label}:</b> ${typeof xVal === 'number' ? xVal.toFixed(1) : xVal} ${xAxisInfo.unit}<br/>
              <b>${yAxisInfo.label}:</b> ${typeof yVal === 'number' ? yVal.toFixed(2) : yVal} ${yAxisInfo.unit}
            </div>
          `;
        },
        backgroundColor: darkMode ? '#2a2a4a' : '#fff',
        borderColor: darkMode ? '#444' : '#ddd',
        textStyle: { color: darkMode ? '#eee' : '#333' },
        extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);'
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 7,
          itemStyle: {
            color: (params: any) => getPointColor(params.value[2]),
            opacity: 0.75,
            borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            borderWidth: 1
          },
          emphasis: {
            focus: 'self',
            scale: 1.8,
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: 'rgba(0,0,0,0.4)',
              opacity: 1
            }
          }
        }
      ]
    };
  }, [filteredData, darkMode, xAxis, yAxis, xAxisInfo, yAxisInfo, getPointColor]);

  // --- Render Axis Selector ---
  const renderAxisSelector = (
    label: string,
    value: keyof StationMetrics,
    onChange: (val: keyof StationMetrics) => void,
    excludeValue?: keyof StationMetrics
  ) => (
    <div style={{ flex: 1, minWidth: '180px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '6px', 
        fontSize: '11px', 
        fontWeight: 600,
        color: darkMode ? '#888' : '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as keyof StationMetrics)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
          background: darkMode ? '#2a2a4a' : '#fff',
          color: darkMode ? '#eee' : '#333',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {['temperature', 'precipitation', 'location'].map(category => (
          <optgroup 
            key={category} 
            label={category.charAt(0).toUpperCase() + category.slice(1)}
            style={{ fontWeight: 600 }}
          >
            {AXIS_OPTIONS
              .filter(opt => opt.category === category && opt.value !== excludeValue)
              .map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.unit})
                </option>
              ))
            }
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <div className={`scatter-tool-container ${darkMode ? 'dark' : ''}`} style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: darkMode ? '#1a1a2e' : '#fff',
      padding: isMobile ? '12px' : '20px',
      borderRadius: '12px'
    }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            color: darkMode ? '#ecf0f1' : '#2c3e50',
            fontSize: isMobile ? '18px' : '22px',
            fontWeight: 700
          }}>
            Climate Explorer
          </h3>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: darkMode ? '#7f8c8d' : '#95a5a6', 
            fontSize: '13px' 
          }}>
            {filteredData.length.toLocaleString()} stations • 30 years of data (1995-2024)
          </p>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
            background: darkMode ? '#2a2a4a' : '#f8f9fa',
            color: darkMode ? '#eee' : '#333',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '10px' }}>{showFilters ? '▼' : '▶'}</span>
          {showFilters ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>

      {/* Controls Panel */}
      {showFilters && (
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          background: darkMode ? '#252540' : '#f8f9fa',
          borderRadius: '10px',
          border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
        }}>
          {/* Axis Selectors Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {renderAxisSelector('X-Axis', xAxis, setXAxis, yAxis)}
            {renderAxisSelector('Y-Axis', yAxis, setYAxis, xAxis)}
            
            {/* Color By Selector */}
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '11px', 
                fontWeight: 600,
                color: darkMode ? '#888' : '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Color By
              </label>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                  background: darkMode ? '#2a2a4a' : '#fff',
                  color: darkMode ? '#eee' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="yAxis">Y-Axis Value</option>
                <option value="state">State</option>
                <option value="elevation">Elevation</option>
              </select>
            </div>
          </div>
          
          {/* Filters Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'flex-end'
          }}>
            {/* Region Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '11px', 
                fontWeight: 600,
                color: darkMode ? '#888' : '#666',
                textTransform: 'uppercase'
              }}>
                Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                  background: darkMode ? '#2a2a4a' : '#fff',
                  color: darkMode ? '#eee' : '#333',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {REGIONS.map(region => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>
            
            {/* Min Years Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '11px', 
                fontWeight: 600,
                color: darkMode ? '#888' : '#666',
                textTransform: 'uppercase'
              }}>
                Min Years Data: <span style={{ color: darkMode ? '#3498db' : '#2980b9' }}>{minYearsData}</span>
              </label>
              <input
                type="range"
                min="5"
                max="28"
                value={minYearsData}
                onChange={(e) => setMinYearsData(parseInt(e.target.value))}
                style={{ 
                  width: '100%', 
                  cursor: 'pointer',
                  accentColor: '#3498db'
                }}
              />
            </div>
            
            {/* Quick Info */}
            <div style={{ 
              padding: '8px 12px', 
              background: darkMode ? '#1a1a2e' : '#fff',
              borderRadius: '6px',
              fontSize: '12px',
              color: darkMode ? '#888' : '#666'
            }}>
              <strong style={{ color: darkMode ? '#aaa' : '#555' }}>Tip:</strong> Scroll to zoom, drag to pan
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div style={{ 
        height: isMobile ? '380px' : '520px', 
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${darkMode ? '#333' : '#eee'}`,
        position: 'relative',
        background: darkMode ? '#1a1a2e' : '#fff'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: darkMode ? '#888' : '#666',
            fontSize: '14px',
            zIndex: 10
          }}>
            Loading station data...
          </div>
        )}
        
        {error && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '6px 12px',
            background: darkMode ? '#3a2a2a' : '#fef2f2',
            color: darkMode ? '#f87171' : '#dc2626',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 10
          }}>
            {error}
          </div>
        )}
        
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={{
            'zr:click': handleZrClick
          }}
        />
      </div>

      {/* Detail Card */}
      <div style={{
        marginTop: '16px',
        background: darkMode ? '#252540' : '#f8f9fa',
        borderRadius: '10px',
        padding: '16px',
        border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        minHeight: selectedStation ? 'auto' : '80px',
        transition: 'all 0.3s ease'
      }}>
        {selectedStation ? (
          <>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '14px',
              paddingBottom: '10px',
              borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}`
            }}>
              <div>
                <span style={{ 
                  fontWeight: 700, 
                  color: darkMode ? '#fff' : '#222', 
                  fontSize: '17px' 
                }}>
                  {selectedStation.name}
                </span>
                <span style={{ 
                  marginLeft: '10px',
                  fontSize: '13px', 
                  color: darkMode ? '#888' : '#666'
                }}>
                  {selectedStation.state}
                </span>
              </div>
              <div style={{ 
                fontSize: '11px', 
                background: darkMode ? '#1a1a2e' : '#e8e8e8', 
                padding: '4px 10px', 
                borderRadius: '6px',
                color: darkMode ? '#aaa' : '#555'
              }}>
                {selectedStation.elevation.toLocaleString()} ft • {selectedStation.years_of_data} yrs data
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
              gap: '12px' 
            }}>
              <MetricCard 
                label={xAxisInfo.label}
                value={selectedStation[xAxis] as number}
                unit={xAxisInfo.unit}
                darkMode={darkMode}
              />
              <MetricCard 
                label={yAxisInfo.label}
                value={selectedStation[yAxis] as number}
                unit={yAxisInfo.unit}
                darkMode={darkMode}
                highlight
              />
              {/* Show a few extra relevant metrics */}
              {xAxis !== 'annual_precip' && yAxis !== 'annual_precip' && (
                <MetricCard 
                  label="Annual Precip"
                  value={selectedStation.annual_precip}
                  unit="in"
                  darkMode={darkMode}
                />
              )}
              {xAxis !== 'annual_snow' && yAxis !== 'annual_snow' && selectedStation.annual_snow !== null && selectedStation.annual_snow > 0 && (
                <MetricCard 
                  label="Annual Snow"
                  value={selectedStation.annual_snow}
                  unit="in"
                  darkMode={darkMode}
                />
              )}
            </div>
          </>
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: darkMode ? '#555' : '#aaa',
            fontStyle: 'italic',
            fontSize: '14px'
          }}>
            Click a station on the chart to see details
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components ---
function MetricCard({ label, value, unit, darkMode, highlight }: {
  label: string;
  value: number | null;
  unit: string;
  darkMode: boolean;
  highlight?: boolean;
}) {
  if (value === null || value === undefined) return null;
  
  const displayValue = Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1);
  const isPositive = value > 0;
  const showSign = label.toLowerCase().includes('trend');
  
  return (
    <div style={{
      background: darkMode ? '#1a1a2e' : '#fff',
      padding: '12px',
      borderRadius: '8px',
      border: highlight 
        ? `2px solid ${isPositive ? '#e74c3c' : '#3498db'}` 
        : `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
    }}>
      <div style={{ 
        fontSize: '11px', 
        color: darkMode ? '#777' : '#888', 
        marginBottom: '4px',
        fontWeight: 500
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '20px', 
        fontWeight: 700,
        color: highlight && showSign
          ? (isPositive ? '#e74c3c' : '#3498db')
          : (darkMode ? '#eee' : '#333')
      }}>
        {showSign && isPositive ? '+' : ''}{displayValue}
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 400, 
          marginLeft: '3px',
          color: darkMode ? '#888' : '#666'
        }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

// --- Mock Data Generator ---
function generateMockData(): StationMetrics[] {
  const states = ['AK', 'WA', 'OR', 'CA', 'AZ', 'NV', 'ID', 'MT', 'WY', 'CO', 'UT', 'NM', 
                  'TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'MO', 'WI', 'IL', 'MI'];
  
  return Array.from({ length: 800 }).map((_, i) => {
    const lat = 25 + Math.random() * 47;
    const elevation = Math.floor(Math.random() * 12000);
    const baseTemp = 75 - (lat - 25) * 0.9 - elevation * 0.0035;
    const basePrecip = 8 + Math.random() * 55;
    const isSnowy = lat > 40 || elevation > 4000;
    
    return {
      station_id: `ST${String(i).padStart(5, '0')}`,
      name: `Station ${i + 1}`,
      state: states[Math.floor(Math.random() * states.length)],
      elevation,
      latitude: lat,
      longitude: -120 + Math.random() * 55,
      years_of_data: Math.floor(15 + Math.random() * 13),
      
      // Temperature
      avg_annual_temp: baseTemp + (Math.random() - 0.5) * 8,
      avg_summer_high: baseTemp + 18 + (Math.random() - 0.5) * 12,
      avg_winter_low: baseTemp - 22 + (Math.random() - 0.5) * 15,
      temp_range: 35 + Math.random() * 45,
      temp_trend_per_decade: (Math.random() - 0.25) * 2.5, // Slight warming bias
      heating_degree_days: Math.max(0, Math.floor(4000 + (lat - 35) * 150 + elevation * 0.8 + (Math.random() - 0.5) * 1500)),
      cooling_degree_days: Math.max(0, Math.floor(1500 - (lat - 35) * 80 - elevation * 0.3 + (Math.random() - 0.5) * 800)),
      days_above_90: Math.max(0, Math.floor(60 - (lat - 30) * 2 - elevation * 0.008 + (Math.random() - 0.5) * 40)),
      days_below_32: Math.max(0, Math.floor((lat - 25) * 6 + elevation * 0.015 + (Math.random() - 0.5) * 50)),
      
      // Precipitation
      annual_precip: basePrecip + (Math.random() - 0.5) * 20,
      annual_snow: isSnowy ? Math.random() * 180 : Math.random() * 5,
      precip_trend_per_decade: (Math.random() - 0.5) * 3,
      wettest_month_avg: basePrecip / 12 * (1.5 + Math.random()),
      driest_month_avg: basePrecip / 12 * (0.2 + Math.random() * 0.4),
      rain_days_per_year: Math.floor(50 + Math.random() * 100)
    };
  });
}