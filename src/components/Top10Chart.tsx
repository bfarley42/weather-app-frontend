// src/components/Top10Chart.tsx
// Animated countdown bar chart for top 10 rankings
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

interface TopRankingItem {
  rank: number;
  period_label: string;
  value: number;
  unit: string;
}

interface TopRankingData {
  station_id: string;
  station_name: string;
  metric: string;
  metric_label: string;
  period: string;
  start_date: string;
  end_date: string;
  items: TopRankingItem[];
}

interface Top10ChartProps {
  stationId: string;
  stationName: string;
  darkMode?: boolean;
  // Remove startDate and endDate
}

type Metric = 'snowfall' | 'precipitation' | 'rainy_days' | 'hot_days' | 'cold_days' | 'hottest' | 'coldest';
type Period = 'daily' | 'monthly' | 'yearly';

const METRICS: { value: Metric; label: string; emoji: string }[] = [
  { value: 'snowfall', label: 'Snowfall', emoji: '❄️' },
  { value: 'precipitation', label: 'Precipitation', emoji: '🌧️' },
  { value: 'rainy_days', label: 'Rainy Days', emoji: '☔' },
  { value: 'hot_days', label: 'Hot Days (90°F+)', emoji: '🔥' },
  { value: 'cold_days', label: 'Cold Days (32°F-)', emoji: '🥶' },
  { value: 'hottest', label: 'Hottest Temps', emoji: '🌡️' },
  { value: 'coldest', label: 'Coldest Temps', emoji: '🧊' },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Color schemes for different metrics
const METRIC_COLORS: Record<Metric, { bar: string; bg: string }> = {
  snowfall: { bar: '#60A5FA', bg: '#DBEAFE' },      // Blue
  precipitation: { bar: '#34D399', bg: '#D1FAE5' }, // Green
  rainy_days: { bar: '#6366F1', bg: '#E0E7FF' },    // Indigo
  hot_days: { bar: '#F97316', bg: '#FFEDD5' },      // Orange
  cold_days: { bar: '#06B6D4', bg: '#CFFAFE' },     // Cyan
  hottest: { bar: '#EF4444', bg: '#FEE2E2' },       // Red
  coldest: { bar: '#3B82F6', bg: '#DBEAFE' },       // Blue
};

export default function Top10Chart({
  stationId,
  stationName,
  darkMode = false
}: Top10ChartProps) {  // Remove startDate, endDate from props
  const [metric, setMetric] = useState<Metric>('snowfall');
  const [period, setPeriod] = useState<Period>('yearly');
  const [data, setData] = useState<TopRankingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Top10 has its own date range (default to 10 years)
  const [yearsBack, setYearsBack] = useState(20);
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(new Date().setFullYear(new Date().getFullYear() - yearsBack)).toISOString().split('T')[0];
  
  
  // Animation state
  const [visibleCount, setVisibleCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setVisibleCount(0);
    setIsAnimating(false);
    
    try {
      const response = await fetch(
        `${API_URL}/api/weather/top10?station=${stationId}&start=${startDate}&end=${endDate}&metric=${metric}&period=${period}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch data');
      }
      
      const result: TopRankingData = await response.json();
      setData(result);
      
      // Start animation after data loads
      if (result.items.length > 0) {
        setTimeout(() => startAnimation(result.items.length), 300);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [stationId, startDate, endDate, metric, period]);

  // Start the countdown animation
  const startAnimation = (totalItems: number) => {
    setIsAnimating(true);
    setVisibleCount(0);
    
    // Reveal bars one at a time, from #10 (or last) to #1
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      
      if (count >= totalItems) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 400); // 400ms between each bar reveal
  };

  // Replay animation
  const replayAnimation = () => {
    if (data && data.items.length > 0) {
      setVisibleCount(0);
      setTimeout(() => startAnimation(data.items.length), 100);
    }
  };

  // Fetch on mount and when params change
  useEffect(() => {
    if (stationId) {
      fetchData();
    }
  }, [stationId, startDate, endDate, metric, period]);

  // Get max value for scaling bars
  const maxValue = data?.items.length 
    ? Math.max(...data.items.map(item => item.value))
    : 0;

  // Get color scheme
  const colors = METRIC_COLORS[metric];

  // Determine if metric is valid for selected period
  const isCountMetric = ['rainy_days', 'hot_days', 'cold_days'].includes(metric);
  const availablePeriods = isCountMetric 
    ? PERIODS.filter(p => p.value !== 'daily')
    : PERIODS;

  // Auto-switch to monthly if daily selected for count metrics
  useEffect(() => {
    if (isCountMetric && period === 'daily') {
      setPeriod('monthly');
    }
  }, [metric]);

  return (
    <div style={{
      background: darkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: darkMode 
        ? '0 4px 20px rgba(0, 0, 0, 0.4)' 
        : '0 4px 20px rgba(0, 0, 0, 0.08)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: '20px',
          fontWeight: 700,
          color: darkMode ? '#F9FAFB' : '#111827'
        }}>
          🏆 Top 10 Rankings
        </h2>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: darkMode ? '#9CA3AF' : '#6B7280'
        }}>
          {stationName}
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Metric Selector */}
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#374151' : '#D1D5DB'}`,
            background: darkMode ? '#374151' : '#FFFFFF',
            color: darkMode ? '#F9FAFB' : '#111827',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '180px'
          }}
        >
          {METRICS.map(m => (
            <option key={m.value} value={m.value}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>

                {/* Years selector */}
        <select
        value={yearsBack}
        onChange={(e) => setYearsBack(Number(e.target.value))}
        style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#374151' : '#D1D5DB'}`,
            background: darkMode ? '#374151' : '#FFFFFF',
            color: darkMode ? '#F9FAFB' : '#111827',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
        }}
        >
        <option value={1}>Last 1 Year</option>
        <option value={5}>Last 5 Years</option>
        <option value={10}>Last 10 Years</option>
        <option value={20}>All Time</option>
        </select>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {availablePeriods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: period === p.value 
                  ? colors.bar 
                  : (darkMode ? '#374151' : '#F3F4F6'),
                color: period === p.value 
                  ? '#FFFFFF' 
                  : (darkMode ? '#D1D5DB' : '#4B5563'),
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Replay Button */}
        {data && data.items.length > 0 && !isAnimating && (
          <button
            onClick={replayAnimation}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: darkMode ? '#4B5563' : '#E5E7EB',
              color: darkMode ? '#F9FAFB' : '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            🔄 Replay
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: darkMode ? '#9CA3AF' : '#6B7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.bar}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Loading rankings...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#EF4444',
          background: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
          borderRadius: '8px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: darkMode ? '#9CA3AF' : '#6B7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ margin: 0 }}>No data found for this selection</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
            Try a different metric or date range
          </p>
        </div>
      )}

      {/* Chart */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div style={{ position: 'relative' }}>
          {/* Bars container - reversed so #1 is at top */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.items.map((item, index) => {
              // Calculate which items should be visible
              // visibleCount counts from bottom (10, 9, 8...) up to top (1)
              const reverseIndex = data.items.length - index; // 10, 9, 8... for display order
              const isVisible = visibleCount >= reverseIndex;
              const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              
              return (
                <div
                  key={`${item.rank}-${item.period_label}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                    transition: 'all 0.4s ease-out'
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.rank === 1 
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                      : item.rank === 2 
                        ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                        : item.rank === 3
                          ? 'linear-gradient(135deg, #CD7F32, #B8860B)'
                          : (darkMode ? '#374151' : '#E5E7EB'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: item.rank <= 3 ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563'),
                    flexShrink: 0,
                    boxShadow: item.rank <= 3 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                  }}>
                    {item.rank}
                  </div>

                  {/* Period Label */}
                  <div style={{
                    width: '120px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: darkMode ? '#D1D5DB' : '#374151',
                    flexShrink: 0
                  }}>
                    {item.period_label}
                  </div>

                  {/* Bar */}
                  <div style={{
                    flex: 1,
                    height: '28px',
                    background: darkMode ? '#374151' : colors.bg,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div
                      style={{
                        width: isVisible ? `${barWidth}%` : '0%',
                        height: '100%',
                        background: item.rank === 1 
                          ? `linear-gradient(90deg, ${colors.bar}, ${colors.bar}dd)`
                          : colors.bar,
                        borderRadius: '6px',
                        transition: 'width 0.6s ease-out',
                        transitionDelay: isVisible ? '0.1s' : '0s',
                        boxShadow: item.rank === 1 ? '0 0 10px rgba(0,0,0,0.2)' : 'none'
                      }}
                    />
                  </div>

                  {/* Value */}
                  <div style={{
                    width: '80px',
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: darkMode ? '#F9FAFB' : '#111827',
                    flexShrink: 0
                  }}>
                    {item.value.toLocaleString()}{item.unit === '°F' ? '°F' : ` ${item.unit}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trophy animation for #1 */}
          {visibleCount >= data.items.length && (
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '100px',
              fontSize: '32px',
              animation: 'bounce 0.6s ease-out',
              opacity: 0.9
            }}>
              🏆
            </div>
          )}
        </div>
      )}

      {/* Date range info */}
      {data && (
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
          fontSize: '12px',
          color: darkMode ? '#6B7280' : '#9CA3AF',
          textAlign: 'center'
        }}>
          Data from {new Date(data.start_date).toLocaleDateString()} to {new Date(data.end_date).toLocaleDateString()}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}