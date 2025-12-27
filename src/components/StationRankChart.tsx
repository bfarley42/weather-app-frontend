import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
// import * as echarts from 'echarts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './StationRankChart.css'; // We'll reuse the scatter css or create a generic one

interface StationChangeData {
  id: string;
  name: string;
  state: string;
  changeValue: number; // The delta (e.g., +2.5 or -1.2)
  metricLabel: string; // e.g., "Temp Change (°F)"
}

interface StationRankChartProps {
  data?: StationChangeData[]; // Optional, we'll generate mock data if missing
  darkMode?: boolean;
}

export default function StationRankChart({ data: propData, darkMode = false }: StationRankChartProps) {
  const [_isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [metric, setMetric] = useState<'temp' | 'precip'>('temp');

  // --- Mock Data Generator (Remove this when connecting to real API) ---
  const data = useMemo(() => {
    if (propData) return propData;
    
    // Generate 2700 fake stations
    return Array.from({ length: 2700 }).map((_, i) => {
      const isOutlier = Math.random() > 0.95;
      const baseChange = (Math.random() - 0.4) * 2; // Slight warming bias
      const val = isOutlier ? baseChange * 3 : baseChange;
      
      return {
        id: `s-${i}`,
        name: `Station ${i}`,
        state: 'US',
        changeValue: val,
        metricLabel: metric === 'temp' ? 'Temp Change (°F)' : 'Precip Change (in)'
      };
    });
  }, [propData, metric]);

  // --- Sort Data for the "S-Curve" ---
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.changeValue - b.changeValue);
  }, [data]);

  // --- Statistics for the Summary Cards ---
  const stats = useMemo(() => {
    const values = sortedData.map(d => d.changeValue);
    const positive = values.filter(v => v > 0).length;
    const negative = values.filter(v => v < 0).length;
    const max = values[values.length - 1];
    const min = values[0];
    return { positive, negative, max, min, total: values.length };
  }, [sortedData]);

  // --- Mobile Check ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Chart Option ---
  const option = useMemo(() => {
    const xData = sortedData.map((_, index) => index + 1); // Rank 1 to 2700
    const yData = sortedData.map(d => d.changeValue);

    return {
      backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
      grid: {
        top: 60,
        right: 20,
        bottom: 40,
        left: 50,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const index = params[0].dataIndex;
          const station = sortedData[index];
          const color = station.changeValue > 0 ? '#ef4444' : '#3b82f6';
          
          return `
            <div style="font-weight:bold; margin-bottom:4px">${station.name}, ${station.state}</div>
            <div style="font-size:12px; color:#888">Rank #${index + 1} of ${sortedData.length}</div>
            <hr style="border-color: #eee; margin: 4px 0" />
            <div style="display:flex; justify-content:space-between; width: 140px">
              <span>Change:</span>
              <span style="font-weight:bold; color:${color}">
                ${station.changeValue > 0 ? '+' : ''}${station.changeValue.toFixed(2)}
              </span>
            </div>
          `;
        }
      },
      xAxis: {
        type: 'category',
        name: 'Stations (Ranked Low to High)',
        nameLocation: 'middle',
        nameGap: 25,
        data: xData,
        axisLabel: { show: false }, // Hide 2700 labels
        axisTick: { show: false },
        axisLine: { lineStyle: { color: darkMode ? '#555' : '#ccc' } }
      },
      yAxis: {
        type: 'value',
        name: sortedData[0]?.metricLabel || 'Change',
        nameTextStyle: { color: darkMode ? '#aaa' : '#666' },
        splitLine: { 
          lineStyle: { type: 'dashed', color: darkMode ? '#333' : '#eee' } 
        },
        axisLabel: { color: darkMode ? '#aaa' : '#666' }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, height: 20, bottom: 5 }
      ],
      series: [
        {
          type: 'bar',
          data: yData,
          large: true, // Optimizes for thousands of points
          barCategoryGap: '10%', // Tightly packed bars
          itemStyle: {
            color: (params: any) => {
              // Dynamic coloring: Red for hot/positive, Blue for cold/negative
              const val = params.value;
              if (val > 0) return darkMode ? '#ef4444' : '#dc2626';
              return darkMode ? '#3b82f6' : '#2563eb';
            },
            borderRadius: [2, 2, 0, 0]
          },
          // Add a MarkLine for the Zero baseline
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: 0 }],
            lineStyle: { color: darkMode ? '#fff' : '#333', opacity: 0.5 }
          }
        }
      ]
    };
  }, [sortedData, darkMode]);

  return (
    <div style={{ 
      background: darkMode ? '#1a1a2e' : '#fff', 
      padding: '20px', 
      borderRadius: '12px',
      color: darkMode ? '#fff' : '#1a1a2e',
      border: `1px solid ${darkMode ? '#333' : '#eee'}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Station Change Ranking</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: darkMode ? '#888' : '#666' }}>
            Comparing 20-year Delta across {stats.total.toLocaleString()} stations
          </p>
        </div>
        
        {/* Toggle for Demo (Remove if passing real data) */}
        {!propData && (
          <div style={{ display: 'flex', gap: '8px', background: darkMode ? '#111' : '#f3f4f6', padding: '4px', borderRadius: '6px' }}>
            <button 
              onClick={() => setMetric('temp')}
              style={{ 
                padding: '4px 12px', 
                borderRadius: '4px', 
                border: 'none', 
                background: metric === 'temp' ? (darkMode ? '#333' : '#fff') : 'transparent',
                color: metric === 'temp' ? (darkMode ? '#fff' : '#000') : '#888',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >Temp</button>
            <button 
              onClick={() => setMetric('precip')}
              style={{ 
                padding: '4px 12px', 
                borderRadius: '4px', 
                border: 'none', 
                background: metric === 'precip' ? (darkMode ? '#333' : '#fff') : 'transparent',
                color: metric === 'precip' ? (darkMode ? '#fff' : '#000') : '#888',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >Precip</button>
          </div>
        )}
      </div>

      {/* Summary Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px', color: darkMode ? '#ef4444' : '#b91c1c' }}>
            <TrendingUp size={16} /> Increasing
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkMode ? '#fca5a5' : '#7f1d1d' }}>
            {((stats.positive / stats.total) * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{stats.positive} stations</div>
        </div>

        <div style={{ background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px', color: darkMode ? '#3b82f6' : '#1e40af' }}>
            <TrendingDown size={16} /> Decreasing
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: darkMode ? '#93c5fd' : '#1e3a8a' }}>
            {((stats.negative / stats.total) * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{stats.negative} stations</div>
        </div>

        <div style={{ background: darkMode ? 'rgba(107, 114, 128, 0.1)' : '#f3f4f6', padding: '12px', borderRadius: '8px', border: `1px solid ${darkMode ? 'rgba(107, 114, 128, 0.2)' : '#e5e7eb'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px', color: darkMode ? '#9ca3af' : '#4b5563' }}>
            <Minus size={16} /> Range
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: darkMode ? '#e5e7eb' : '#1f2937', marginTop: '4px' }}>
            Low: {stats.min.toFixed(1)}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: darkMode ? '#e5e7eb' : '#1f2937' }}>
            High: +{stats.max.toFixed(1)}
          </div>
        </div>
      </div>

      {/* The Chart */}
      <div style={{ height: '400px', width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}