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
  
  // City info
  city: string | null;
  city_state: string | null;
  city_population: number | null;
  city_distance_mi: number | null;
  
  // Station type
  station_type: string | null;  // 'ASOS', 'COOP', 'OTHER'
  is_major_airport: boolean;
  
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
  days_below_0: number | null;
  
  // Precipitation metrics
  annual_precip: number | null;
  annual_snow: number | null;
  precip_trend_per_decade: number | null;
  wettest_month_avg: number | null;
  driest_month_avg: number | null;
  rain_days_per_year: number | null;
  snow_days_per_year: number | null;
  
  // Records
  record_high: number | null;
  record_low: number | null;
  record_precip: number | null;
  record_snow: number | null;
}

interface AxisOption {
  value: keyof StationMetrics;
  label: string;
  unit: string;
  category: 'temperature' | 'precipitation' | 'location';
}

interface StationScatterChartProps {
  darkMode?: boolean;
}

// --- Axis Options ---
const AXIS_OPTIONS: AxisOption[] = [
  { value: 'avg_annual_temp', label: 'Avg Annual Temp', unit: '°F', category: 'temperature' },
  { value: 'avg_summer_high', label: 'Avg Summer High', unit: '°F', category: 'temperature' },
  { value: 'avg_winter_low', label: 'Avg Winter Low', unit: '°F', category: 'temperature' },
  { value: 'temp_range', label: 'Annual Temp Range', unit: '°F', category: 'temperature' },
  { value: 'temp_trend_per_decade', label: 'Temp Trend (30yr)', unit: '°F/decade', category: 'temperature' },
  { value: 'heating_degree_days', label: 'Heating Degree Days', unit: 'HDD', category: 'temperature' },
  { value: 'cooling_degree_days', label: 'Cooling Degree Days', unit: 'CDD', category: 'temperature' },
  { value: 'days_above_90', label: 'Days Above 90°F', unit: 'days/yr', category: 'temperature' },
  { value: 'days_below_32', label: 'Days Below 32°F', unit: 'days/yr', category: 'temperature' },
  { value: 'days_below_0', label: 'Days Below 0°F', unit: 'days/yr', category: 'temperature' },
  { value: 'annual_precip', label: 'Annual Precipitation', unit: 'in', category: 'precipitation' },
  { value: 'annual_snow', label: 'Annual Snowfall', unit: 'in', category: 'precipitation' },
  { value: 'precip_trend_per_decade', label: 'Precip Trend (30yr)', unit: 'in/decade', category: 'precipitation' },
  { value: 'wettest_month_avg', label: 'Wettest Month', unit: 'in', category: 'precipitation' },
  { value: 'driest_month_avg', label: 'Driest Month', unit: 'in', category: 'precipitation' },
  { value: 'rain_days_per_year', label: 'Rain Days', unit: 'days/yr', category: 'precipitation' },
  { value: 'snow_days_per_year', label: 'Snow Days', unit: 'days/yr', category: 'precipitation' },
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

const STATION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Stations' },
  { value: 'ASOS', label: 'ASOS (Airports)' },
  { value: 'COOP', label: 'COOP (Cooperative)' },
  { value: 'major_airport', label: 'Major Airports Only' },
];

const TOP_CITIES_OPTIONS = [
  { value: 0, label: 'All Stations' },
  { value: 50, label: 'Top 50 Cities' },
  { value: 100, label: 'Top 100 Cities' },
  { value: 200, label: 'Top 200 Cities' },
  { value: 500, label: 'Top 500 Cities' },
];

const getColorForValue = (value: number, metric: string): string => {
  if (metric.includes('trend')) {
    if (value > 1) return '#c0392b';
    if (value > 0.5) return '#e74c3c';
    if (value > 0) return '#f39c12';
    if (value > -0.5) return '#3498db';
    return '#2980b9';
  }
  if (metric.includes('temp') || metric.includes('summer') || metric.includes('winter') || 
      metric.includes('days_above') || metric.includes('cooling_degree')) {
    if (value > 80) return '#c0392b';
    if (value > 60) return '#e74c3c';
    if (value > 40) return '#f39c12';
    if (value > 20) return '#3498db';
    return '#2980b9';
  }
  if (metric.includes('precip') || metric.includes('rain') || metric.includes('snow')) {
    if (value > 60) return '#1a5276';
    if (value > 40) return '#2980b9';
    if (value > 20) return '#3498db';
    if (value > 10) return '#85c1e9';
    return '#d5dbdb';
  }
  return '#7f8c8d';
};

const formatPopulation = (pop: number | null): string => {
  if (pop === null) return 'N/A';
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${Math.round(pop / 1000).toLocaleString()}k`;
  return pop.toLocaleString();
};

export default function StationScatterChart({ darkMode = false }: StationScatterChartProps) {
  const [data, setData] = useState<StationMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Axis selections
  const [xAxis, setXAxis] = useState<keyof StationMetrics>('avg_annual_temp');
  const [yAxis, setYAxis] = useState<keyof StationMetrics>('temp_trend_per_decade');
  const [colorBy, setColorBy] = useState<'yAxis' | 'state' | 'elevation'>('yAxis');
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [minYearsData, setMinYearsData] = useState(15);
  const [stationTypeFilter, setStationTypeFilter] = useState('all');
  const [topCitiesFilter, setTopCitiesFilter] = useState(0);
  
  // UI state
  const [selectedStation, setSelectedStation] = useState<StationMetrics | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(true);
  const chartRef = useRef<ReactECharts | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({ min_years: minYearsData.toString() });
        
        if (selectedRegion !== 'all') {
          const region = REGIONS.find(r => r.value === selectedRegion);
          if (region?.states.length) params.append('states', region.states.join(','));
        }
        
        const response = await fetch(`${API_URL}/api/station-metrics?${params}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const result = await response.json();
        setData(result.stations || []);
      } catch (err) {
        console.error('API Error:', err);
        setError('Using sample data');
        setData(generateMockData());
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRegion, minYearsData]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = data.filter(station => {
      const xValue = station[xAxis];
      const yValue = station[yAxis];
      if (xValue === null || yValue === null) return false;
      
      // Station type filter
      if (stationTypeFilter === 'ASOS' && station.station_type !== 'ASOS') return false;
      if (stationTypeFilter === 'COOP' && station.station_type !== 'COOP') return false;
      if (stationTypeFilter === 'major_airport' && !station.is_major_airport) return false;
      
      return true;
    });
    
    // Top cities filter
    if (topCitiesFilter > 0) {
      // Sort by city population descending, take top N
      filtered = filtered
        .filter(s => s.city_population !== null)
        .sort((a, b) => (b.city_population || 0) - (a.city_population || 0))
        .slice(0, topCitiesFilter);
    }
    
    return filtered;
  }, [data, xAxis, yAxis, stationTypeFilter, topCitiesFilter]);

  const xAxisInfo = AXIS_OPTIONS.find(o => o.value === xAxis) || AXIS_OPTIONS[0];
  const yAxisInfo = AXIS_OPTIONS.find(o => o.value === yAxis) || AXIS_OPTIONS[4];

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
    return getColorForValue(station[yAxis] as number, yAxis as string);
  }, [colorBy, yAxis]);

const handleChartClick = useCallback((params: any) => {
  if (params.componentType === 'series' && params.data) {
    const station = params.data[2] as StationMetrics;
    setSelectedStation(station);
  } else {
    setSelectedStation(null);
  }
}, []);

  // Chart config with reduced y-axis space
  const option = useMemo(() => {
    const scatterData = filteredData.map(item => [item[xAxis], item[yAxis], item]);

    return {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      grid: {
        top: 35,
        right: 20,
        bottom: 45,
        left: 50,
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
        nameGap: 28,
        nameTextStyle: { color: darkMode ? '#aaa' : '#555', fontSize: 12 },
        scale: true,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ccc' } },
        axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } }
      },
      yAxis: {
        type: 'value',
        name: `${yAxisInfo.label} (${yAxisInfo.unit})`,
        nameLocation: 'middle',
        nameGap: 38,
        nameTextStyle: { color: darkMode ? '#aaa' : '#555', fontSize: 12 },
        scale: true,
        axisLine: { lineStyle: { color: darkMode ? '#444' : '#ccc' } },
        axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } }
      },
tooltip: {
  trigger: 'item',
    position: function (_point: number[], _params: any, _dom: HTMLElement, _rect: any, size: { contentSize: number[], viewSize: number[] }) {
    // Center horizontally, position vertically near top third of chart
    const x = (size.viewSize[0] - size.contentSize[0]) / 2;
    const y = size.viewSize[1] * 0.15;
    return [x, y];
    },
    confine: true,
  backgroundColor: darkMode ? '#2a2a4a' : '#fff',
  borderColor: darkMode ? '#444' : '#ddd',
  textStyle: { color: darkMode ? '#eee' : '#333', fontSize: 12 },
  extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 280px;',
  formatter: (params: any) => {
    const s = params.value[2] as StationMetrics;
    const displayName = s.city && s.city_state ? `${s.city}, ${s.city_state}` : `${s.name}, ${s.state}`;
    const pop = s.city_population ? `Pop. ${formatPopulation(s.city_population)}` : '';
    const xVal = params.value[0];
    const yVal = params.value[1];
    
    return `
      <div style="font-weight:600; font-size:14px; margin-bottom:4px">${displayName}</div>
      ${pop ? `<div style="color:#888; font-size:11px">${pop}</div>` : ''}
      ${s.city ? `<div style="color:#999; font-size:11px; margin-bottom:6px">${s.name}</div>` : '<div style="margin-bottom:6px"></div>'}
      <div style="font-size:12px; line-height:1.6">
        <b>${xAxisInfo.label}:</b> ${typeof xVal === 'number' ? xVal.toFixed(1) : xVal} ${xAxisInfo.unit}<br/>
        <b>${yAxisInfo.label}:</b> ${typeof yVal === 'number' ? yVal.toFixed(2) : yVal} ${yAxisInfo.unit}
      </div>
      <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${darkMode ? '#444' : '#eee'}; font-size:11px; color:#888">
        ${s.station_type || 'Unknown'} • ${Math.round(s.elevation).toLocaleString()} ft • ${s.years_of_data} yrs
        ${s.is_major_airport ? ' • <span style="color:#3498db">Major Airport</span>' : ''}
      </div>
    `;
  }
},
      series: [{
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
          scale: 1.8,
          itemStyle: { borderColor: '#fff', borderWidth: 2, shadowBlur: 12, opacity: 1 }
        }
      }]
    };
  }, [filteredData, darkMode, xAxis, yAxis, xAxisInfo, yAxisInfo, getPointColor]);

  const renderSelect = (label: string, value: string | number, onChange: (v: any) => void, options: {value: any, label: string}[]) => (
    <div style={{ flex: 1, minWidth: '140px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 600, color: darkMode ? '#888' : '#666', textTransform: 'uppercase' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: '6px',
          border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
          background: darkMode ? '#2a2a4a' : '#fff',
          color: darkMode ? '#eee' : '#333', fontSize: '12px', cursor: 'pointer'
        }}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const renderAxisSelector = (label: string, value: keyof StationMetrics, onChange: (v: keyof StationMetrics) => void, excludeValue?: keyof StationMetrics) => (
    <div style={{ flex: 1, minWidth: '160px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 600, color: darkMode ? '#888' : '#666', textTransform: 'uppercase' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as keyof StationMetrics)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: '6px',
          border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
          background: darkMode ? '#2a2a4a' : '#fff',
          color: darkMode ? '#eee' : '#333', fontSize: '12px', cursor: 'pointer'
        }}
      >
        {['temperature', 'precipitation', 'location'].map(category => (
          <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
            {AXIS_OPTIONS.filter(opt => opt.category === category && opt.value !== excludeValue).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  // Get display name for station
  const getDisplayName = (station: StationMetrics) => {
    if (station.city && station.city_state) {
      return `${station.city}, ${station.city_state}`;
    }
    return `${station.name}, ${station.state}`;
  };

  return (
    <div className={`scatter-tool-container ${darkMode ? 'dark' : ''}`} style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: darkMode ? '#1a1a2e' : '#fff',
      padding: isMobile ? '10px' : '16px',
      borderRadius: '12px'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: darkMode ? '#ecf0f1' : '#2c3e50', fontSize: isMobile ? '16px' : '20px', fontWeight: 700 }}>
            Climate Explorer
          </h3>
          <p style={{ margin: '2px 0 0 0', color: darkMode ? '#7f8c8d' : '#95a5a6', fontSize: '12px' }}>
            {filteredData.length.toLocaleString()} stations • 1995-2024
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '6px 12px', borderRadius: '6px',
            border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
            background: darkMode ? '#2a2a4a' : '#f8f9fa',
            color: darkMode ? '#eee' : '#333', cursor: 'pointer', fontSize: '12px'
          }}
        >
          {showFilters ? '▼ Hide' : '▶ Filters'}
        </button>
      </div>

      {/* Controls */}
      {showFilters && (
        <div style={{
          marginBottom: '12px', padding: '12px',
          background: darkMode ? '#252540' : '#f8f9fa',
          borderRadius: '8px', border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            {renderAxisSelector('X-Axis', xAxis, setXAxis, yAxis)}
            {renderAxisSelector('Y-Axis', yAxis, setYAxis, xAxis)}
            {renderSelect('Color By', colorBy, setColorBy, [
              { value: 'yAxis', label: 'Y-Axis Value' },
              { value: 'state', label: 'State' },
              { value: 'elevation', label: 'Elevation' }
            ])}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            {renderSelect('Region', selectedRegion, setSelectedRegion, REGIONS.map(r => ({ value: r.value, label: r.label })))}
            {renderSelect('Station Type', stationTypeFilter, setStationTypeFilter, STATION_TYPE_OPTIONS)}
            {renderSelect('Cities Filter', topCitiesFilter, (v) => setTopCitiesFilter(Number(v)), TOP_CITIES_OPTIONS)}
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 600, color: darkMode ? '#888' : '#666', textTransform: 'uppercase' }}>
                Min Years: {minYearsData}
              </label>
              <input type="range" min="5" max="28" value={minYearsData} onChange={(e) => setMinYearsData(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#3498db' }} />
            </div>
          </div>
        </div>
      )}

      {/* Chart - increased height */}
      <div style={{ 
        height: isMobile ? '420px' : '580px', 
        borderRadius: '8px', overflow: 'hidden',
        border: `1px solid ${darkMode ? '#333' : '#eee'}`,
        position: 'relative', background: darkMode ? '#1a1a2e' : '#fff'
      }}>
        {loading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: darkMode ? '#888' : '#666' }}>
            Loading...
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 10px', background: darkMode ? '#3a2a2a' : '#fef2f2', color: darkMode ? '#f87171' : '#dc2626', borderRadius: '4px', fontSize: '11px' }}>
            {error}
          </div>
        )}
        <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '100%' }} onEvents={{ click: handleChartClick }} />
      </div>

      {/* Detail Card - Enhanced */}
      <div style={{
        marginTop: '12px', background: darkMode ? '#252540' : '#f8f9fa',
        borderRadius: '8px', padding: '14px',
        border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        minHeight: selectedStation ? 'auto' : '70px'
      }}>
        {selectedStation ? (
          <>
            {/* Header with city name */}
            <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${darkMode ? '#444' : '#ddd'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: darkMode ? '#fff' : '#222', fontSize: '17px' }}>
                    {getDisplayName(selectedStation)}
                  </div>
                  {selectedStation.city_population && (
                    <div style={{ fontSize: '12px', color: darkMode ? '#888' : '#666', marginTop: '2px' }}>
                      Pop. {formatPopulation(selectedStation.city_population)}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: darkMode ? '#999' : '#777', marginTop: '2px' }}>
                    {selectedStation.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', background: darkMode ? '#1a1a2e' : '#e8e8e8', padding: '3px 8px', borderRadius: '4px', color: darkMode ? '#aaa' : '#555' }}>
                    {selectedStation.station_id}
                  </div>
                  <div style={{ fontSize: '10px', color: darkMode ? '#777' : '#888', marginTop: '4px' }}>
                    {selectedStation.station_type || 'Unknown'} • {Math.round(selectedStation.elevation).toLocaleString()} ft
                    {selectedStation.is_major_airport && <span style={{ color: '#3498db' }}> • Major Airport</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Main metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <MetricCard label={xAxisInfo.label} value={selectedStation[xAxis] as number} unit={xAxisInfo.unit} darkMode={darkMode} />
              <MetricCard label={yAxisInfo.label} value={selectedStation[yAxis] as number} unit={yAxisInfo.unit} darkMode={darkMode} highlight />
            </div>

            {/* Additional metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
              {selectedStation.avg_annual_temp !== null && xAxis !== 'avg_annual_temp' && yAxis !== 'avg_annual_temp' && (
                <MiniMetric label="Avg Temp" value={`${selectedStation.avg_annual_temp.toFixed(1)}°F`} darkMode={darkMode} />
              )}
              {selectedStation.annual_precip !== null && xAxis !== 'annual_precip' && yAxis !== 'annual_precip' && (
                <MiniMetric label="Precip" value={`${selectedStation.annual_precip.toFixed(1)}"`} darkMode={darkMode} />
              )}
              {selectedStation.annual_snow !== null && selectedStation.annual_snow > 0 && xAxis !== 'annual_snow' && yAxis !== 'annual_snow' && (
                <MiniMetric label="Snow" value={`${selectedStation.annual_snow.toFixed(1)}"`} darkMode={darkMode} />
              )}
              {selectedStation.days_above_90 !== null && xAxis !== 'days_above_90' && yAxis !== 'days_above_90' && (
                <MiniMetric label="Days >90°" value={`${selectedStation.days_above_90.toFixed(0)}`} darkMode={darkMode} />
              )}
              {selectedStation.days_below_32 !== null && xAxis !== 'days_below_32' && yAxis !== 'days_below_32' && (
                <MiniMetric label="Days <32°" value={`${selectedStation.days_below_32.toFixed(0)}`} darkMode={darkMode} />
              )}
              <MiniMetric label="Years" value={`${selectedStation.years_of_data}`} darkMode={darkMode} />
            </div>

            {/* Records row */}
            {(selectedStation.record_high || selectedStation.record_low) && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: darkMode ? '#666' : '#999', marginBottom: '6px', textTransform: 'uppercase' }}>
                  30-Year Records
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                  {selectedStation.record_high !== null && (
                    <span><span style={{ color: '#e74c3c' }}>▲</span> High: <strong>{selectedStation.record_high}°F</strong></span>
                  )}
                  {selectedStation.record_low !== null && (
                    <span><span style={{ color: '#3498db' }}>▼</span> Low: <strong>{selectedStation.record_low}°F</strong></span>
                  )}
                  {selectedStation.record_precip !== null && selectedStation.record_precip > 0 && (
                    <span>🌧 Max Precip: <strong>{selectedStation.record_precip.toFixed(2)}"</strong></span>
                  )}
                  {selectedStation.record_snow !== null && selectedStation.record_snow > 0 && (
                    <span>❄ Max Snow: <strong>{selectedStation.record_snow.toFixed(1)}"</strong></span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: darkMode ? '#555' : '#aaa', fontStyle: 'italic', fontSize: '13px' }}>
            Click a station to see details • Scroll to zoom • Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, darkMode, highlight }: { label: string; value: number | null; unit: string; darkMode: boolean; highlight?: boolean }) {
  if (value === null) return null;
  const displayValue = Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1);
  const isPositive = value > 0;
  const showSign = label.toLowerCase().includes('trend');
  
  return (
    <div style={{
      background: darkMode ? '#1a1a2e' : '#fff', padding: '10px', borderRadius: '6px',
      border: highlight ? `2px solid ${isPositive ? '#e74c3c' : '#3498db'}` : `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
    }}>
      <div style={{ fontSize: '10px', color: darkMode ? '#777' : '#888', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: highlight && showSign ? (isPositive ? '#e74c3c' : '#3498db') : (darkMode ? '#eee' : '#333') }}>
        {showSign && isPositive ? '+' : ''}{displayValue}
        <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '2px', color: darkMode ? '#888' : '#666' }}>{unit}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return (
    <div style={{ background: darkMode ? '#1a1a2e' : '#fff', padding: '6px 8px', borderRadius: '4px', border: `1px solid ${darkMode ? '#333' : '#e8e8e8'}` }}>
      <div style={{ fontSize: '9px', color: darkMode ? '#666' : '#999' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: darkMode ? '#ccc' : '#444' }}>{value}</div>
    </div>
  );
}

function generateMockData(): StationMetrics[] {
  const states = ['AK', 'WA', 'OR', 'CA', 'AZ', 'NV', 'ID', 'MT', 'WY', 'CO', 'UT', 'NM', 'TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'MO', 'WI', 'IL', 'MI'];
  const cities = ['Seattle', 'Portland', 'San Francisco', 'Los Angeles', 'Phoenix', 'Denver', 'Chicago', 'Detroit', 'Minneapolis', 'Dallas'];
  
  return Array.from({ length: 500 }).map((_, i) => {
    const lat = 25 + Math.random() * 47;
    const elevation = Math.floor(Math.random() * 12000);
    const baseTemp = 75 - (lat - 25) * 0.9 - elevation * 0.0035;
    const basePrecip = 8 + Math.random() * 55;
    const isAirport = Math.random() > 0.7;
    
    return {
      station_id: isAirport ? `K${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}` : `USC00${String(i).padStart(5, '0')}`,
      name: `Station ${i + 1}`,
      state: states[Math.floor(Math.random() * states.length)],
      elevation, latitude: lat, longitude: -120 + Math.random() * 55,
      years_of_data: Math.floor(15 + Math.random() * 13),
      city: Math.random() > 0.3 ? cities[Math.floor(Math.random() * cities.length)] : null,
      city_state: Math.random() > 0.3 ? states[Math.floor(Math.random() * states.length)] : null,
      city_population: Math.random() > 0.3 ? Math.floor(Math.random() * 2000000) + 50000 : null,
      city_distance_mi: Math.random() * 20,
      station_type: isAirport ? 'ASOS' : 'COOP',
      is_major_airport: isAirport && Math.random() > 0.8,
      avg_annual_temp: baseTemp + (Math.random() - 0.5) * 8,
      avg_summer_high: baseTemp + 18 + (Math.random() - 0.5) * 12,
      avg_winter_low: baseTemp - 22 + (Math.random() - 0.5) * 15,
      temp_range: 35 + Math.random() * 45,
      temp_trend_per_decade: (Math.random() - 0.25) * 2.5,
      heating_degree_days: Math.max(0, Math.floor(4000 + (lat - 35) * 150 + elevation * 0.8)),
      cooling_degree_days: Math.max(0, Math.floor(1500 - (lat - 35) * 80 - elevation * 0.3)),
      days_above_90: Math.max(0, Math.floor(60 - (lat - 30) * 2 - elevation * 0.008)),
      days_below_32: Math.max(0, Math.floor((lat - 25) * 6 + elevation * 0.015)),
      days_below_0: Math.max(0, Math.floor((lat - 35) * 2 + elevation * 0.005)),
      annual_precip: basePrecip, annual_snow: lat > 40 || elevation > 4000 ? Math.random() * 180 : Math.random() * 5,
      precip_trend_per_decade: (Math.random() - 0.5) * 3,
      wettest_month_avg: basePrecip / 12 * 2, driest_month_avg: basePrecip / 12 * 0.3,
      rain_days_per_year: Math.floor(50 + Math.random() * 100),
      snow_days_per_year: lat > 40 ? Math.floor(10 + Math.random() * 40) : Math.floor(Math.random() * 5),
      record_high: Math.floor(90 + Math.random() * 30), record_low: Math.floor(-20 + Math.random() * 40),
      record_precip: Math.random() * 8 + 1, record_snow: lat > 35 ? Math.random() * 30 : Math.random() * 5
    };
  });
}