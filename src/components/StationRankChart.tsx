import { useState, useMemo, useEffect, useCallback, useRef} from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { API_URL } from '../config';
import './StationRankChart.css';

interface StationMetrics {
  station_id: string;
  name: string;
  state: string;
  elevation: number;
  latitude: number;
  years_of_data: number;
  city: string | null;
  city_state: string | null;
  city_population: number | null;
  station_type: string | null;
  is_major_airport: boolean;
  temp_trend_per_decade: number | null;
  precip_trend_per_decade: number | null;
  snow_trend_per_decade: number | null;
  annual_snow: number | null;
  avg_annual_temp: number | null;
  annual_precip: number | null;
  days_above_90: number | null;
  days_below_32: number | null;
  record_high: number | null;
  record_low: number | null;
  record_precip: number | null;
  record_snow: number | null;
}

interface StationRankChartProps {
  darkMode?: boolean;
}

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

const METRIC_OPTIONS = [
  { value: 'temp_trend_per_decade', label: 'Temperature Trend', unit: '°F/decade' },
  { value: 'precip_trend_per_decade', label: 'Precipitation Trend', unit: 'in/decade' },
  { value: 'snow_trend_per_decade', label: 'Snowfall Trend', unit: 'in/decade' },
];

const formatPopulation = (pop: number | null): string => {
  if (pop === null) return 'N/A';
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${Math.round(pop / 1000).toLocaleString()}k`;
  return pop.toLocaleString();
};

export default function StationRankChart({ darkMode = false }: StationRankChartProps) {
  const [data, setData] = useState<StationMetrics[]>([]);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  
  // Metric selection
  // const [metric, setMetric] = useState<'temp_trend_per_decade' | 'precip_trend_per_decade'>('temp_trend_per_decade');
  const [metric, setMetric] = useState<'temp_trend_per_decade' | 'precip_trend_per_decade' | 'snow_trend_per_decade'>('temp_trend_per_decade');
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [minYearsData, setMinYearsData] = useState(15);
  const [stationTypeFilter, setStationTypeFilter] = useState('all');
  const [topCitiesFilter, setTopCitiesFilter] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  
  // UI state
  const [selectedStation, setSelectedStation] = useState<StationMetrics | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
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

  // Filter and sort data
  const sortedData = useMemo(() => {
    let filtered = data.filter(station => {
      const trendValue = station[metric];
      if (trendValue === null || trendValue === undefined) return false;
      
      if (stationTypeFilter === 'ASOS' && station.station_type !== 'ASOS') return false;
      if (stationTypeFilter === 'COOP' && station.station_type !== 'COOP') return false;
      if (stationTypeFilter === 'major_airport' && !station.is_major_airport) return false;
      
      return true;
    });
    
    if (topCitiesFilter > 0) {
      filtered = filtered
        .filter(s => s.city_population !== null)
        .sort((a, b) => (b.city_population || 0) - (a.city_population || 0))
        .slice(0, topCitiesFilter);
    }
    
    // Sort by trend value for the ranking chart
    return filtered.sort((a, b) => (a[metric] || 0) - (b[metric] || 0));
  }, [data, metric, stationTypeFilter, topCitiesFilter]);

  // Statistics
  const stats = useMemo(() => {
    const values = sortedData.map(d => d[metric] || 0);
    const positive = values.filter(v => v > 0).length;
    const negative = values.filter(v => v < 0).length;
    const max = values.length > 0 ? values[values.length - 1] : 0;
    const min = values.length > 0 ? values[0] : 0;
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { positive, negative, max, min, avg, total: values.length };
  }, [sortedData, metric]);

  const metricInfo = METRIC_OPTIONS.find(m => m.value === metric) || METRIC_OPTIONS[0];

  // // Chart click handler
  // const handleChartClick = useCallback((params: any) => {
  //   // For bar charts, params.dataIndex is the index of the clicked bar
  //   if (params.componentType === 'series' && params.dataIndex !== undefined) {
  //     const station = sortedData[params.dataIndex];
  //     if (station) {
  //       setSelectedStation(station);
  //     }
  //   }
  // }, [sortedData]);

// Chart click handler
const handleChartClick = useCallback((params: any) => {
  if (params.componentType === 'series' && params.data?.station) {
    setSelectedStation(params.data.station);
  }
}, []);


//   // Chart option
//   const option = useMemo(() => {
//     const xData = sortedData.map((_, index) => index + 1);
//     const yData = sortedData.map(d => d[metric] || 0);

//     return {
//       backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
//       grid: {
//         top: 40,
//         right: 20,
//         bottom: 60,
//         left: 50,
//         containLabel: true
//       },
//       tooltip: {
//         trigger: 'item',
//         backgroundColor: darkMode ? '#2a2a4a' : '#fff',
//         borderColor: darkMode ? '#444' : '#ddd',
//         textStyle: { color: darkMode ? '#eee' : '#333', fontSize: 12 },
//         extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
// formatter: (params: any) => {
//   const index = params.dataIndex;
//   const station = sortedData[index];
//   if (!station) return '';
  
//   const displayName = station.city && station.city_state 
//     ? `${station.city}, ${station.city_state}` 
//     : `${station.name}, ${station.state}`;
//   const trendValue = station[metric] || 0;
//   const color = trendValue > 0 ? '#ef4444' : '#3b82f6';
//   const pop = station.city_population ? `Pop. ${formatPopulation(station.city_population)}` : '';
  
//   return `
//     <div style="font-weight:600; font-size:14px; margin-bottom:4px">${displayName}</div>
//     ${pop ? `<div style="color:#888; font-size:11px">${pop}</div>` : ''}
//     ${station.city ? `<div style="color:#999; font-size:11px; margin-bottom:6px">${station.name}</div>` : '<div style="margin-bottom:6px"></div>'}
//     <div style="font-size:12px; color:#888; margin-bottom:6px">Rank #${index + 1} of ${sortedData.length}</div>
//     <div style="font-size:14px">
//       <b>${metricInfo.label}:</b> 
//       <span style="font-weight:bold; color:${color}">
//         ${trendValue > 0 ? '+' : ''}${trendValue.toFixed(3)} ${metricInfo.unit}
//       </span>
//     </div>
//     <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${darkMode ? '#444' : '#eee'}; font-size:11px; color:#888">
//       ${station.station_type || 'Unknown'} • ${station.elevation.toLocaleString()} ft • ${station.years_of_data} yrs
//       ${station.is_major_airport ? ' • <span style="color:#3498db">Major Airport</span>' : ''}
//     </div>
//   `;
// }
//       },
//       xAxis: {
//         type: 'category',
//         name: `Stations Ranked by ${metricInfo.label}`,
//         nameLocation: 'middle',
//         nameGap: 35,
//         nameTextStyle: { color: darkMode ? '#aaa' : '#666', fontSize: 12 },
//         data: xData,
//         axisLabel: { show: false },
//         axisTick: { show: false },
//         axisLine: { lineStyle: { color: darkMode ? '#555' : '#ccc' } }
//       },
//       yAxis: {
//         type: 'value',
//         name: metricInfo.unit,
//         nameTextStyle: { color: darkMode ? '#aaa' : '#666', fontSize: 11 },
//         splitLine: { lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } },
//         axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 11 }
//       },
//       dataZoom: [
//         { type: 'inside', xAxisIndex: 0 },
//         { 
//           type: 'slider', 
//           xAxisIndex: 0, 
//           height: 20, 
//           bottom: 8,
//           borderColor: darkMode ? '#444' : '#ddd',
//           backgroundColor: darkMode ? '#1a1a2e' : '#f8f8f8',
//           fillerColor: darkMode ? 'rgba(100,100,150,0.3)' : 'rgba(100,150,200,0.2)',
//           handleStyle: { color: darkMode ? '#666' : '#aaa' },
//           textStyle: { color: darkMode ? '#aaa' : '#666' }
//         }
//       ],
//       series: [
//         {
//           type: 'bar',
//           data: yData,
//           large: true,
//           barCategoryGap: '20%',
//           itemStyle: {
//             color: (params: any) => {
//               const val = params.value;
//               if (val > 0) return darkMode ? '#ef4444' : '#dc2626';
//               return darkMode ? '#3b82f6' : '#2563eb';
//             },
//             borderRadius: [2, 2, 0, 0]
//           },
//           markLine: {
//             silent: true,
//             symbol: 'none',
//             data: [{ yAxis: 0 }],
//             lineStyle: { color: darkMode ? '#888' : '#666', width: 1, opacity: 0.8 }
//           }
//         }
//       ]
//     };
//   }, [sortedData, metric, metricInfo, darkMode]);

// Chart option
const option = useMemo(() => {
  // Use [x, y] coordinate pairs instead of separate arrays
  const seriesData = sortedData.map((d, index) => ({
    value: [index + 1, d[metric] || 0],
    station: d  // Store reference for tooltip
  }));

  return {
    backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
    grid: {
      top: 40,
      right: 20,
      bottom: 60,
      left: 50,
      containLabel: true
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
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
      formatter: (params: any) => {
        const station = params.data?.station;
        if (!station) return '';
        
        const index = params.data.value[0] - 1;
        const displayName = station.city && station.city_state 
          ? `${station.city}, ${station.city_state}` 
          : `${station.name}, ${station.state}`;
        const trendValue = station[metric] || 0;
        const color = trendValue > 0 ? '#ef4444' : '#3b82f6';
        const pop = station.city_population ? `Pop. ${formatPopulation(station.city_population)}` : '';
        
        return `
          <div style="font-weight:600; font-size:14px; margin-bottom:4px">${displayName}</div>
          ${pop ? `<div style="color:#888; font-size:11px">${pop}</div>` : ''}
          ${station.city ? `<div style="color:#999; font-size:11px; margin-bottom:6px">${station.name}</div>` : '<div style="margin-bottom:6px"></div>'}
          <div style="font-size:12px; color:#888; margin-bottom:6px">Rank #${index + 1} of ${sortedData.length}</div>
          <div style="font-size:14px">
            <b>${metricInfo.label}:</b> 
            <span style="font-weight:bold; color:${color}">
              ${trendValue > 0 ? '+' : ''}${trendValue.toFixed(3)} ${metricInfo.unit}
            </span>
          </div>
          <div style="margin-top:6px; padding-top:6px; border-top:1px solid ${darkMode ? '#444' : '#eee'}; font-size:11px; color:#888">
            ${station.station_type || 'Unknown'} • ${Math.round(station.elevation).toLocaleString()} ft • ${station.years_of_data} yrs
            ${station.is_major_airport ? ' • <span style="color:#3498db">Major Airport</span>' : ''}
          </div>
        `;
      }
    },
    xAxis: {
      type: 'value',
      name: `Stations Ranked by ${metricInfo.label}`,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { color: darkMode ? '#aaa' : '#666', fontSize: 12 },
      min: 1,
      max: sortedData.length,
      axisLabel: { 
        color: darkMode ? '#aaa' : '#666',
        formatter: (value: number) => value % 500 === 0 ? value.toString() : ''
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: darkMode ? '#555' : '#ccc' } }
    },
    yAxis: {
      type: 'value',
      name: metricInfo.unit,
      nameTextStyle: { color: darkMode ? '#aaa' : '#666', fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } },
      axisLabel: { color: darkMode ? '#aaa' : '#666', fontSize: 11 }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { 
        type: 'slider', 
        xAxisIndex: 0, 
        height: 20, 
        bottom: 8,
        borderColor: darkMode ? '#444' : '#ddd',
        backgroundColor: darkMode ? '#1a1a2e' : '#f8f8f8',
        fillerColor: darkMode ? 'rgba(100,100,150,0.3)' : 'rgba(100,150,200,0.2)',
        handleStyle: { color: darkMode ? '#666' : '#aaa' },
        textStyle: { color: darkMode ? '#aaa' : '#666' }
      }
    ],
    series: [
      {
        type: 'bar',
        data: seriesData,
        barWidth: '90%',
        itemStyle: {
          color: (params: any) => {
            const val = params.data.value[1];
            if (val > 0) return darkMode ? '#ef4444' : '#dc2626';
            return darkMode ? '#3b82f6' : '#2563eb';
          },
          borderRadius: [1, 1, 0, 0]
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 0 }],
          lineStyle: { color: darkMode ? '#888' : '#666', width: 1, opacity: 0.8 }
        }
      }
    ]
  };
}, [sortedData, metric, metricInfo, darkMode]);

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

  const getDisplayName = (station: StationMetrics) => {
    return station.city && station.city_state 
      ? `${station.city}, ${station.city_state}` 
      : `${station.name}, ${station.state}`;
  };

  return (
    <div style={{ 
      background: darkMode ? '#1a1a2e' : '#fff', 
      padding: isMobile ? '12px' : '20px', 
      borderRadius: '12px',
      color: darkMode ? '#fff' : '#1a1a2e',
      border: `1px solid ${darkMode ? '#333' : '#eee'}`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: 700 }}>
            Station Trend Rankings
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: darkMode ? '#888' : '#666' }}>
            30-year trends across {stats.total.toLocaleString()} stations (1995-2024)
          </p>
        </div>
        
        {/* Metric Toggle */}
        <div style={{ display: 'flex', gap: '6px', background: darkMode ? '#111' : '#f3f4f6', padding: '4px', borderRadius: '6px' }}>
          {METRIC_OPTIONS.map(opt => (
            <button 
              key={opt.value}
              onClick={() => setMetric(opt.value as any)}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '4px', 
                border: 'none', 
                background: metric === opt.value ? (darkMode ? '#333' : '#fff') : 'transparent',
                color: metric === opt.value ? (darkMode ? '#fff' : '#000') : '#888',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                boxShadow: metric === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {opt.label.split(' ')[0]}
            </button>
          ))}
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

      {/* Filters */}
      {showFilters && (
        <div style={{
          marginBottom: '16px', padding: '12px',
          background: darkMode ? '#252540' : '#f8f9fa',
          borderRadius: '8px', border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
        }}>
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

      {/* Summary Stats Cards */}
      {/* <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}> */}
      {/* <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}> */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'nowrap' }}>
        <div style={{flex: 1, minWidth: 0, background: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: darkMode ? '#ef4444' : '#b91c1c' }}>
            <TrendingUp size={14} /> Increasing
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#fca5a5' : '#7f1d1d' }}>
            {stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(0) : 0}%
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>{stats.positive.toLocaleString()} stations</div>
        </div>

        <div style={{flex: 1, minWidth: 0, background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: darkMode ? '#3b82f6' : '#1e40af' }}>
            <TrendingDown size={14} /> Decreasing
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#93c5fd' : '#1e3a8a' }}>
            {stats.total > 0 ? ((stats.negative / stats.total) * 100).toFixed(0) : 0}%
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>{stats.negative.toLocaleString()} stations</div>
        </div>

        <div style={{flex: 1, minWidth: 0, background: darkMode ? 'rgba(107, 114, 128, 0.1)' : '#f3f4f6', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(107, 114, 128, 0.2)' : '#e5e7eb'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: darkMode ? '#9ca3af' : '#4b5563' }}>
            <Minus size={14} /> Average
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: stats.avg > 0 ? (darkMode ? '#fca5a5' : '#dc2626') : (darkMode ? '#93c5fd' : '#2563eb') }}>
            {stats.avg > 0 ? '+' : ''}{stats.avg.toFixed(3)}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>{metricInfo.unit}</div>
        </div>

        <div style={{flex: 1, minWidth: 0, background: darkMode ? 'rgba(107, 114, 128, 0.1)' : '#f3f4f6', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(107, 114, 128, 0.2)' : '#e5e7eb'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: darkMode ? '#9ca3af' : '#4b5563' }}>
            Range
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#93c5fd' : '#1e3a8a' }}>
            Low: {stats.min.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#fca5a5' : '#dc2626' }}>
            High: +{stats.max.toFixed(2)}
          </div>
        </div>
      </div>

        {/* Chart */}
      <div style={{ height: isMobile ? '350px' : '450px', width: '100%', position: 'relative' }}>
        <ReactECharts
          option={option}
          ref={chartRef}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={{ click: handleChartClick }}
        />
      </div>
      
    {/* Detail Card - Enhanced with extra metrics */}
    <div style={{
      marginTop: '12px', background: darkMode ? '#252540' : '#f8f9fa',
      borderRadius: '8px', padding: '14px',
      border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
      minHeight: '70px'
    }}>
      {selectedStation ? (() => {
        const s = selectedStation;
        const displayName = getDisplayName(s);
        const trendValue = s[metric] || 0;
        const rank = sortedData.findIndex(st => st.station_id === s.station_id) + 1;
        const pop = s.city_population ? `Pop. ${formatPopulation(s.city_population)}` : '';
        
        return (
          <div>
            {/* Header */}
            <div style={{ fontWeight: 600, fontSize: '16px', color: darkMode ? '#fff' : '#222', marginBottom: '4px' }}>
              {displayName}
            </div>
            {pop && (
              <div style={{ color: darkMode ? '#888' : '#888', fontSize: '12px' }}>{pop}</div>
            )}
            {s.city && (
              <div style={{ color: darkMode ? '#999' : '#999', fontSize: '12px', marginBottom: '8px' }}>{s.name}</div>
            )}
            {!s.city && <div style={{ marginBottom: '8px' }}></div>}
            
            {/* Rank */}
            <div style={{ fontSize: '13px', color: darkMode ? '#aaa' : '#666', marginBottom: '10px' }}>
              Rank #{rank} of {sortedData.length}
            </div>
            
            {/* Main trend metric */}
            <div style={{ 
              fontSize: '14px', 
              marginBottom: '5px',
              padding: '7px',
              background: darkMode ? '#1a1a2e' : '#fff',
              borderRadius: '6px',
              border: `2px solid ${trendValue > 0 ? '#ef4444' : '#3b82f6'}`
            }}>
              <b>{metricInfo.label}:</b>{' '}
              <span style={{ fontWeight: 600, color: trendValue > 0 ? '#ef4444' : '#3b82f6' }}>
                {trendValue > 0 ? '+' : ''}{trendValue.toFixed(3)} {metricInfo.unit}
              </span>
            </div>
            
            {/* Additional metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {s.avg_annual_temp !== null && (
                <MiniMetric label="Avg Temp" value={`${s.avg_annual_temp.toFixed(1)}°F`} darkMode={darkMode} />
              )}
              {s.annual_precip !== null && (
                <MiniMetric label="Precip" value={`${s.annual_precip.toFixed(1)}"`} darkMode={darkMode} />
              )}
              {s.annual_snow !== null && s.annual_snow > 0 && (
                <MiniMetric label="Snow" value={`${s.annual_snow.toFixed(1)}"`} darkMode={darkMode} />
              )}
              {s.days_above_90 !== null && (
                <MiniMetric label="Days >90°" value={`${s.days_above_90.toFixed(0)}`} darkMode={darkMode} />
              )}
              {s.days_below_32 !== null && (
                <MiniMetric label="Days <32°" value={`${s.days_below_32.toFixed(0)}`} darkMode={darkMode} />
              )}
              <MiniMetric label="Years" value={`${s.years_of_data}`} darkMode={darkMode} />
            </div>

            {/* Records row */}
            {(s.record_high || s.record_low) && (
              <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}` }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: darkMode ? '#666' : '#999', marginBottom: '6px', textTransform: 'uppercase' }}>
                  30-Year Records
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: darkMode ? '#ccc' : '#444' }}>
                  {s.record_high !== null && (
                    <span><span style={{ color: '#e74c3c' }}>▲</span> High: <strong>{s.record_high}°F</strong></span>
                  )}
                  {s.record_low !== null && (
                    <span><span style={{ color: '#3498db' }}>▼</span> Low: <strong>{s.record_low}°F</strong></span>
                  )}
                  {s.record_precip !== null && s.record_precip > 0 && (
                    <span>🌧 Max Precip: <strong>{s.record_precip.toFixed(2)}"</strong></span>
                  )}
                  {s.record_snow !== null && s.record_snow > 0 && (
                    <span>❄ Max Snow: <strong>{s.record_snow.toFixed(1)}"</strong></span>
                  )}
                </div>
              </div>
            )}
            
            {/* Footer info */}
            <div style={{ 
              paddingTop: '10px', 
              borderTop: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`, 
              fontSize: '12px', 
              color: darkMode ? '#888' : '#888' 
            }}>
              {s.station_type || 'Unknown'} • {Math.round(s.elevation).toLocaleString()} ft • {s.years_of_data} yrs
              {s.is_major_airport && <span style={{ color: '#3498db' }}> • Major Airport</span>}
            </div>
          </div>
        );
      })() : (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: darkMode ? '#555' : '#aaa', 
          fontStyle: 'italic', 
          fontSize: '13px' 
        }}>
          Hover for quick info • Click to pin details here • Drag slider to zoom
        </div>
      )}
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
  
  return Array.from({ length: 800 }).map((_, i) => {
    const isAirport = Math.random() > 0.7;
    const isOutlier = Math.random() > 0.95;
    const baseTempTrend = (Math.random() - 0.35) * 2;
    const basePrecipTrend = (Math.random() - 0.5) * 3;
    const baseSnowTrend = (Math.random() - 0.6) * 4; // Bias toward decreasing snow
    const lat = 25 + Math.random() * 47;
    const elevation = Math.floor(Math.random() * 10000);
    const hasSnow = lat > 35 || elevation > 4000;
    
    return {
      station_id: isAirport ? `K${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}` : `USC00${String(i).padStart(5, '0')}`,
      name: `Station ${i + 1}`,
      state: states[Math.floor(Math.random() * states.length)],
      elevation,
      latitude: lat,
      years_of_data: Math.floor(15 + Math.random() * 13),
      city: Math.random() > 0.3 ? cities[Math.floor(Math.random() * cities.length)] : null,
      city_state: Math.random() > 0.3 ? states[Math.floor(Math.random() * states.length)] : null,
      city_population: Math.random() > 0.3 ? Math.floor(Math.random() * 2000000) + 50000 : null,
      station_type: isAirport ? 'ASOS' : 'COOP',
      is_major_airport: isAirport && Math.random() > 0.8,
      temp_trend_per_decade: isOutlier ? baseTempTrend * 2.5 : baseTempTrend,
      precip_trend_per_decade: isOutlier ? basePrecipTrend * 2 : basePrecipTrend,
      snow_trend_per_decade: hasSnow ? (isOutlier ? baseSnowTrend * 2 : baseSnowTrend) : null,
      annual_snow: hasSnow ? Math.random() * 100 : Math.random() * 5,
      avg_annual_temp: 40 + Math.random() * 30,
      annual_precip: 10 + Math.random() * 50,
      days_above_90: Math.max(0, Math.floor(60 - (lat - 30) * 2 - elevation * 0.008 + (Math.random() - 0.5) * 40)),
      days_below_32: Math.max(0, Math.floor((lat - 25) * 6 + elevation * 0.015 + (Math.random() - 0.5) * 50)),
      record_high: Math.floor(95 + Math.random() * 25),
      record_low: Math.floor(-15 + Math.random() * 35),
      record_precip: Math.random() * 8 + 1,
      record_snow: hasSnow ? Math.random() * 30 + 5 : Math.random() * 3
    };
  });
}